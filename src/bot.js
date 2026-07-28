import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import ffmpegStatic from 'ffmpeg-static';
import { config } from './config.js';
import { handleCommand } from './commands.js';

// Tell prism-media (used by @discordjs/voice) where the ffmpeg binary is
if (ffmpegStatic) process.env.FFMPEG_PATH = ffmpegStatic;

/**
 * SoundboardBot wraps the Discord client + voice logic.
 * Emits a 'statusChanged' event whenever the connection/playback changes,
 * so the web server can broadcast it to all clients via WebSocket.
 */
class SoundboardBot extends EventEmitter {
  constructor() {
    super();
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // requires "Message Content Intent" enabled in the portal
      ],
    });

    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });

    // Active connection state (the soundboard focuses on one channel at a time)
    this.current = null; // { guildId, channelId, guildName, channelName }
    this.nowPlaying = null; // name of the file currently playing
    this.ready = false;
    this.volume = config.volume; // runtime volume (changeable via command/web)
    this.autoLeave = false; // true when the session started from a chat command (auto-leave when idle)
    this.idleTimer = null;
    this.lastTextChannel = null; // last text channel that triggered a command

    this._bindEvents();
  }

  _bindEvents() {
    this.client.once(Events.ClientReady, (c) => {
      this.ready = true;
      console.log(`[BOT] Logged in as ${c.user.tag}`);
      this.emit('statusChanged', this.getStatus());
    });

    // Slash commands: /join and /leave
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      try {
        if (interaction.commandName === 'join') {
          await this._handleJoinCommand(interaction);
        } else if (interaction.commandName === 'leave') {
          await this._handleLeaveCommand(interaction);
        }
      } catch (err) {
        console.error('[BOT] Error handling command:', err);
        if (!interaction.replied) {
          await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
        }
      }
    });

    // Chat commands: "sb! <keyword>", "sb!stop", etc.
    this.client.on(Events.MessageCreate, (message) => {
      if (message.author.bot || !message.guild) return;
      handleCommand(this, message).catch((err) => {
        console.error('[BOT] Chat command error:', err.message);
        message.reply('Oops, something went wrong while processing that command.').catch(() => {});
      });
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.nowPlaying = null;
      this.emit('statusChanged', this.getStatus());
    });
    this.player.on(AudioPlayerStatus.Playing, () => {
      this.emit('statusChanged', this.getStatus());
    });
    this.player.on('error', (err) => {
      console.error('[BOT] Audio player error:', err.message);
      this.nowPlaying = null;
      this.emit('statusChanged', this.getStatus());
    });
  }

  async _handleJoinCommand(interaction) {
    const member = interaction.member;
    const channel = member?.voice?.channel;
    if (!channel) {
      await interaction.reply({ content: 'You must be in a voice channel first.', ephemeral: true });
      return;
    }
    await this.join(channel.guild.id, channel.id);
    await interaction.reply({ content: `Joined **${channel.name}** ✅`, ephemeral: true });
  }

  async _handleLeaveCommand(interaction) {
    const left = this.leave();
    await interaction.reply({
      content: left ? 'Left the voice channel 👋' : 'The bot is not in a voice channel.',
      ephemeral: true,
    });
  }

  async login() {
    await this.client.login(config.token);
  }

  /** List of servers (guilds) the bot is in. */
  getGuilds() {
    return [...this.client.guilds.cache.values()].map((g) => ({
      id: g.id,
      name: g.name,
    }));
  }

  /** List of voice channels in a guild. */
  getVoiceChannels(guildId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return [];
    return [...guild.channels.cache.values()]
      .filter((ch) => ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice)
      .map((ch) => ({ id: ch.id, name: ch.name }));
  }

  /** Make the bot join a specific voice channel. opts.autoLeave = auto-leave when idle. */
  async join(guildId, channelId, opts = {}) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Server not found / the bot is not in this server.');
    const channel = guild.channels.cache.get(channelId);
    if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
      throw new Error('Voice channel not found.');
    }

    this.autoLeave = !!opts.autoLeave;

    // If already connected to another guild, disconnect first
    if (this.current && this.current.guildId !== guildId) {
      this.leave();
    }

    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.on('error', (err) => {
      console.error('[BOT] Voice connection error:', err.message);
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (err) {
      connection.destroy();
      throw new Error('Failed to connect to the voice channel (timeout).');
    }
    console.log(`[BOT] Connected & Ready in voice channel "${channel.name}"`);

    connection.subscribe(this.player);

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.warn('[BOT] Voice disconnected — trying to reconnect...');
      try {
        // Try to reconnect; if it fails, clean up
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        console.log('[BOT] Reconnected successfully.');
      } catch {
        console.warn('[BOT] Reconnect failed — leaving the voice channel.');
        connection.destroy();
        if (this.current?.guildId === guildId) {
          this.current = null;
          this.nowPlaying = null;
          this.emit('statusChanged', this.getStatus());
        }
      }
    });

    this.current = {
      guildId,
      channelId,
      guildName: guild.name,
      channelName: channel.name,
    };
    this._resetIdle();
    this.emit('statusChanged', this.getStatus());
  }

  /** Leave the voice channel. Returns true if it was connected. */
  leave() {
    this._clearIdle();
    if (!this.current) return false;
    const connection = getVoiceConnection(this.current.guildId);
    if (connection) connection.destroy();
    this.current = null;
    this.nowPlaying = null;
    this.autoLeave = false;
    this.emit('statusChanged', this.getStatus());
    return true;
  }

  /** Play an audio file to the active voice channel. */
  play(filePath, displayName) {
    if (!this.current) throw new Error('The bot is not in a voice channel. Click "Join" first.');
    console.log(`[BOT] Playing: ${displayName || filePath}`);
    const resource = createAudioResource(filePath, { inlineVolume: true });
    resource.volume?.setVolume(this.volume);
    this.player.play(resource);
    this.nowPlaying = displayName || null;
    this._resetIdle();
    this.emit('statusChanged', this.getStatus());
  }

  /** Play audio from a URL (e.g. MyInstants) by streaming, without downloading first. */
  async playUrl(url, displayName) {
    if (!this.current) throw new Error('The bot is not in a voice channel. Click "Join" first.');
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
    if (!res.ok || !res.body) throw new Error(`Failed to fetch audio (HTTP ${res.status})`);
    console.log(`[BOT] Playing (URL): ${displayName || url}`);
    const resource = createAudioResource(Readable.fromWeb(res.body), { inlineVolume: true });
    resource.volume?.setVolume(this.volume);
    this.player.play(resource);
    this.nowPlaying = displayName || null;
    this._resetIdle();
    this.emit('statusChanged', this.getStatus());
  }

  /** Stop the current playback. */
  stop() {
    this.player.stop(true);
    this.nowPlaying = null;
    this.emit('statusChanged', this.getStatus());
  }

  /** Set the volume (0–2). Applied immediately to the sound currently playing. */
  setVolume(v) {
    this.volume = Math.min(Math.max(Number(v) || 0, 0), 2);
    const state = this.player.state;
    state?.resource?.volume?.setVolume(this.volume);
    this.emit('statusChanged', this.getStatus());
    return this.volume;
  }

  // ---- Idle auto-leave (only for chat-command sessions) ----
  _resetIdle() {
    this._clearIdle();
    if (!this.autoLeave) return;
    this.idleTimer = setTimeout(() => {
      const ch = this.lastTextChannel;
      if (this.leave() && ch) {
        ch.send('👋 Left voice due to inactivity.').catch(() => {});
      }
    }, config.idleMinutes * 60_000);
  }

  _clearIdle() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  getStatus() {
    return {
      ready: this.ready,
      connected: !!this.current,
      guildName: this.current?.guildName || null,
      channelName: this.current?.channelName || null,
      nowPlaying: this.nowPlaying,
      volume: this.volume,
    };
  }
}

export const bot = new SoundboardBot();

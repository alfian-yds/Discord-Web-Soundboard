import { EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { searchInstants } from './myinstants.js';
import { listSounds, resolveSoundPath } from './soundStore.js';
import { logActivity } from './activityLog.js';

// Display name of the command sender
const who = (message) => message.member?.displayName || message.author?.username || 'Unknown';

const P = config.prefix;

/** Commands shown in `help` (shortcuts in parentheses). */
export const COMMANDS = [
  { usage: `${P} <keyword>`, desc: 'Search & play the top MyInstants sound in your voice channel' },
  { usage: `${P}stop  (${P}s)`, desc: 'Stop the current sound' },
  { usage: `${P}join  (${P}j)`, desc: 'Bot joins your voice channel' },
  { usage: `${P}leave  (${P}l)`, desc: 'Bot leaves the voice channel' },
  { usage: `${P}volume <0-200>  (${P}v)`, desc: 'Set volume in percent (e.g. 30)' },
  { usage: `${P}help  (${P}h)`, desc: 'Show this command list' },
];

/** Main chat command router. */
export async function handleCommand(bot, message) {
  const raw = message.content.trim();
  if (!raw.toLowerCase().startsWith(P.toLowerCase())) return;

  const body = raw.slice(P.length).trim(); // text after the prefix
  bot.lastTextChannel = message.channel;
  if (!body) return sendHelp(message);

  const [word] = body.split(/\s+/);
  const cmd = word.toLowerCase();
  const args = body.slice(word.length).trim();

  switch (cmd) {
    case 'help': case 'h': case 'commands': case '?':
      return sendHelp(message);
    case 'stop': case 's': case 'skip':
      bot.stop();
      logActivity({ user: who(message), action: 'stop', source: 'chat' });
      return message.reply('⏹️ Stopped the sound.');
    case 'leave': case 'l': case 'dc': case 'disconnect': case 'out': {
      const left = bot.leave();
      if (left) logActivity({ user: who(message), action: 'leave', source: 'chat' });
      return message.reply(left ? '👋 Left the voice channel.' : 'The bot is not in a voice channel.');
    }
    case 'join': case 'j': case 'come':
      return joinAuthor(bot, message);
    case 'volume': case 'vol': case 'v':
      return handleVolume(bot, message, args);
    case 'list': case 'search': case 'find':
      return handleList(message, args);
    case 'sounds': case 'saved':
      return handleLocalList(message);
    case 'local': case 'file':
      return handleLocalPlay(bot, message, args);
    case 'play': case 'p':
      return handlePlay(bot, message, args);
    default:
      // "sb! <keyword>" — treat the whole text as a search keyword
      return handlePlay(bot, message, body);
  }
}

// ---- Handlers ----
async function handlePlay(bot, message, keyword) {
  keyword = (keyword || '').trim();
  if (!keyword) return message.reply(`Type a keyword, e.g. \`${P} vine boom\``);
  const vc = message.member?.voice?.channel;
  if (!vc) return message.reply('You must be in a voice channel first. 🎧');

  const searching = await message.reply(`🔎 Searching **${keyword}**…`);
  let results;
  try {
    results = await searchInstants(keyword);
  } catch {
    return searching.edit('Failed to reach MyInstants. Try again in a moment.');
  }
  if (!results.length) return searching.edit(`No sound found for **${keyword}**. Try another keyword.`);

  const top = results[0];
  try {
    await ensureInChannel(bot, vc);
    await bot.playUrl(top.url, top.name);
    logActivity({ user: who(message), action: 'play', sound: top.name, source: 'chat', channel: vc.name });
    return searching.edit(`▶️ Playing **${top.name}**`);
  } catch (err) {
    return searching.edit(`Failed to play: ${err.message}`);
  }
}

async function handleLocalPlay(bot, message, name) {
  name = (name || '').trim();
  if (!name) return message.reply(`Type a sound name, e.g. \`${P}local airhorn\``);
  const vc = message.member?.voice?.channel;
  if (!vc) return message.reply('You must be in a voice channel first. 🎧');

  const sounds = listSounds();
  const lc = name.toLowerCase();
  const match = sounds.find((s) => s.name.toLowerCase() === lc) || sounds.find((s) => s.name.toLowerCase().includes(lc));
  if (!match) return message.reply(`Sound **${name}** not found. See the list: \`${P}sounds\``);

  const resolved = resolveSoundPath(match.id);
  if (!resolved) return message.reply('Sound file not found.');
  try {
    await ensureInChannel(bot, vc);
    bot.play(resolved.path, match.name);
    logActivity({ user: who(message), action: 'play', sound: match.name, source: 'chat', channel: vc.name });
    return message.reply(`▶️ Playing **${match.name}**`);
  } catch (err) {
    return message.reply(`Failed to play: ${err.message}`);
  }
}

async function handleList(message, keyword) {
  keyword = (keyword || '').trim();
  if (!keyword) return message.reply(`Type a keyword, e.g. \`${P}list bruh\``);
  let results;
  try {
    results = await searchInstants(keyword);
  } catch {
    return message.reply('Failed to reach MyInstants.');
  }
  if (!results.length) return message.reply(`No sound found for **${keyword}**.`);
  const lines = results.slice(0, 5).map((r, i) => `**${i + 1}.** ${r.name}`).join('\n');
  return message.reply(`🔎 Top results for **${keyword}**:\n${lines}\n\nPlay the top one: \`${P} ${keyword}\``);
}

function handleLocalList(message) {
  const sounds = listSounds();
  if (!sounds.length) return message.reply('No saved sounds yet. Add some via the web interface first.');
  const names = sounds.map((s) => `\`${s.name}\``).join(', ');
  return message.reply(`🎵 Saved sounds (${sounds.length}): ${names}\nPlay with: \`${P}local <name>\``);
}

function handleVolume(bot, message, args) {
  const n = parseInt(args, 10);
  if (Number.isNaN(n)) {
    return message.reply(`🔊 Current volume is **${Math.round(bot.volume * 100)}%**. Change it with: \`${P}volume 30\``);
  }
  const v = bot.setVolume(Math.min(Math.max(n, 0), 200) / 100);
  return message.reply(`🔊 Volume set to **${Math.round(v * 100)}%**`);
}

async function joinAuthor(bot, message) {
  const vc = message.member?.voice?.channel;
  if (!vc) return message.reply('You must be in a voice channel first. 🎧');
  try {
    await bot.join(vc.guild.id, vc.id, { autoLeave: true });
    logActivity({ user: who(message), action: 'join', source: 'chat', channel: vc.name });
    return message.reply(`✅ Joined **${vc.name}**`);
  } catch (err) {
    return message.reply(`Failed to join: ${err.message}`);
  }
}

// ---- Util ----
// Ensure the bot is in the sender's voice channel (join/move if needed).
async function ensureInChannel(bot, voiceChannel) {
  if (bot.current?.channelId === voiceChannel.id) {
    bot.autoLeave = true; // chat session → enable auto-leave
    return;
  }
  await bot.join(voiceChannel.guild.id, voiceChannel.id, { autoLeave: true });
}

function sendHelp(message) {
  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle('🔊 Soundboard — Command List')
    .setDescription(`Prefix: \`${P}\`\nYou must be in a voice channel for the bot to play sounds.`)
    .addFields(COMMANDS.map((c) => ({ name: c.usage, value: c.desc })))
    .setFooter({ text: `The bot auto-leaves after ${config.idleMinutes} minutes of inactivity.` });
  return message.reply({ embeds: [embed] });
}

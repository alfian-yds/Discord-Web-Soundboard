// Register the slash commands (/join, /leave) with Discord.
// Run once: `npm run register`
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config, assertConfig } from './config.js';

assertConfig();

const commands = [
  new SlashCommandBuilder()
    .setName('join')
    .setDescription('Make the bot join the voice channel you are currently in'),
  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Make the bot leave the voice channel'),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

try {
  console.log('[REGISTER] Registering slash commands...');
  await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
  console.log('[REGISTER] Done ✅  (/join and /leave are ready)');
} catch (err) {
  console.error('[REGISTER] Failed:', err);
  process.exit(1);
}

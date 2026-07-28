import { assertConfig, config } from './config.js';
import { bot } from './bot.js';
import { createServer } from './server.js';

assertConfig();

const server = createServer();

server.listen(config.port, config.host, () => {
  console.log(`[WEB] Soundboard running at http://${config.host || 'localhost'}:${config.port}`);
});

bot.login().catch((err) => {
  console.error('[FATAL] Failed to log in to Discord:', err.message);
  if (/disallowed intents/i.test(err.message)) {
    console.error('\n>>> Looks like "MESSAGE CONTENT INTENT" is not enabled.');
    console.error('    Open https://discord.com/developers/applications → pick your bot →');
    console.error('    "Bot" tab → enable "Message Content Intent" → Save → run again.\n');
  }
  process.exit(1);
});

// Clean shutdown
function shutdown() {
  console.log('\n[EXIT] Shutting down...');
  bot.leave();
  bot.client.destroy();
  server.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

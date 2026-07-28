import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..');
export const SOUNDS_DIR = path.join(ROOT_DIR, 'sounds');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  port: Number(process.env.PORT) || 3000,
  // Bind address. Leave empty (default) to listen on all interfaces during dev.
  // On a VPS behind Nginx, set HOST=127.0.0.1 so it can't be reached directly from outside.
  host: process.env.HOST || undefined,
  webPassword: process.env.WEB_PASSWORD || '',
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 8) * 1024 * 1024,
  // Soundboard output volume (0 = muted, 1 = 100%). Default 30% so it isn't too loud.
  volume: clampVolume(process.env.OUTPUT_VOLUME, 0.3),
  // Discord chat command prefix (e.g. "sb!").
  prefix: process.env.COMMAND_PREFIX || 'sb!',
  // Idle minutes before the bot auto-leaves voice (for chat-command sessions).
  idleMinutes: clampNumber(process.env.IDLE_TIMEOUT_MIN, 5, 0.25, 120),
};

function clampNumber(raw, fallback, min, max) {
  const v = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(Math.max(v, min), max);
}

function clampVolume(raw, fallback) {
  const v = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(Math.max(v, 0), 2); // clamp to 0–200%
}

// Audio formats allowed for upload
export const ALLOWED_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a', '.webm', '.flac'];

export function assertConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (missing.length) {
    console.error(`\n[FATAL] Missing .env variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
  }
  if (!config.webPassword) {
    console.warn('\n[WARNING] WEB_PASSWORD is empty — the web interface can be accessed WITHOUT a password.');
    console.warn('Fine for local use, but REQUIRED when deploying to a VPS/public server.\n');
  }
}

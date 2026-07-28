import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ROOT_DIR } from './config.js';

const DATA_DIR = path.join(ROOT_DIR, 'data');
const FILE = path.join(DATA_DIR, 'activity.json');
const MAX = 200; // keep at most the last 200 entries

fs.mkdirSync(DATA_DIR, { recursive: true });

let entries = [];
try {
  const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (Array.isArray(parsed)) entries = parsed;
} catch {
  entries = [];
}

const emitter = new EventEmitter();
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(FILE, JSON.stringify(entries.slice(-MAX)), () => {});
  }, 500);
}

/**
 * Record one activity.
 * evt: { user, action('play'|'stop'|'join'|'leave'), sound, source('chat'|'web'), channel }
 */
export function logActivity(evt) {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time: Date.now(),
    user: evt.user || 'Unknown',
    action: evt.action || 'play',
    sound: evt.sound || null,
    source: evt.source || 'web',
    channel: evt.channel || null,
  };
  entries.push(entry);
  if (entries.length > MAX) entries = entries.slice(-MAX);
  scheduleSave();
  emitter.emit('entry', entry);
  return entry;
}

/** Get the most recent activity (newest first). */
export function getRecent(limit = 60) {
  return entries.slice(-limit).reverse();
}

/** Subscribe to new activity (for WebSocket broadcast). */
export function onActivity(cb) {
  emitter.on('entry', cb);
}

import fs from 'node:fs';
import path from 'node:path';
import { SOUNDS_DIR, ALLOWED_EXTENSIONS } from './config.js';

// Make sure the sounds folder exists
fs.mkdirSync(SOUNDS_DIR, { recursive: true });

/** Build a stable, safe id from a filename. */
function toId(filename) {
  return Buffer.from(filename).toString('base64url');
}

/** List all available sounds. */
export function listSounds() {
  return fs
    .readdirSync(SOUNDS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && ALLOWED_EXTENSIONS.includes(path.extname(e.name).toLowerCase()))
    .map((e) => ({
      id: toId(e.name),
      name: path.parse(e.name).name, // name without extension (for display)
      filename: e.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Get a file's absolute path by id. Returns null if invalid/missing. */
export function resolveSoundPath(id) {
  let filename;
  try {
    filename = Buffer.from(id, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  // Prevent path traversal — only plain filenames allowed
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return null;
  const full = path.join(SOUNDS_DIR, filename);
  if (!full.startsWith(SOUNDS_DIR)) return null;
  if (!fs.existsSync(full)) return null;
  return { path: full, filename };
}

/** Delete a sound by id. Returns true on success. */
export function deleteSound(id) {
  const resolved = resolveSoundPath(id);
  if (!resolved) return false;
  fs.unlinkSync(resolved.path);
  return true;
}

/** Download audio from a URL and save it into sounds/. Returns the saved filename. */
export async function saveSoundFromUrl(url, name) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error('Empty file');
  // Determine the extension from the URL, default to .mp3
  let ext = path.extname(new URL(url).pathname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) ext = '.mp3';
  const base = String(name || 'sound').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'sound';
  const filename = uniqueFilename(`${base}${ext}`);
  fs.writeFileSync(path.join(SOUNDS_DIR, filename), buf);
  return filename;
}

/** Generate a unique filename if one with the same name already exists. */
export function uniqueFilename(original) {
  const ext = path.extname(original).toLowerCase();
  const base = path.parse(original).name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'sound';
  let candidate = `${base}${ext}`;
  let i = 1;
  while (fs.existsSync(path.join(SOUNDS_DIR, candidate))) {
    candidate = `${base} (${i})${ext}`;
    i++;
  }
  return candidate;
}

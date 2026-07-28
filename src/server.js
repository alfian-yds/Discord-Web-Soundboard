import http from 'node:http';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { WebSocketServer } from 'ws';
import { config, PUBLIC_DIR, SOUNDS_DIR, ALLOWED_EXTENSIONS } from './config.js';
import { bot } from './bot.js';
import { listSounds, resolveSoundPath, deleteSound, uniqueFilename, saveSoundFromUrl } from './soundStore.js';
import { searchInstants, getTrending, isAllowedMediaUrl } from './myinstants.js';
import { logActivity, getRecent, onActivity } from './activityLog.js';

// ---- Simple auth middleware ----
// If WEB_PASSWORD is set, every /api endpoint requires a matching 'x-auth' header.
function checkAuth(req, res, next) {
  if (!config.webPassword) return next();
  const provided = req.get('x-auth') || req.query.token;
  if (provided === config.webPassword) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// ---- Upload config ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SOUNDS_DIR),
  filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) return cb(null, true);
    cb(new Error(`Unsupported format. Use: ${ALLOWED_EXTENSIONS.join(', ')}`));
  },
});

export function createServer() {
  const app = express();
  app.use(express.json());

  // Check whether a password is required (used by the frontend to show the login form)
  app.get('/api/auth-required', (req, res) => {
    res.json({ required: !!config.webPassword });
  });

  // Verify the password
  app.post('/api/login', (req, res) => {
    if (!config.webPassword) return res.json({ ok: true });
    if (req.body?.password === config.webPassword) return res.json({ ok: true });
    res.status(401).json({ ok: false, error: 'Wrong password' });
  });

  // Everything below requires auth
  app.use('/api', checkAuth);

  app.get('/api/status', (req, res) => res.json(bot.getStatus()));

  app.get('/api/sounds', (req, res) => res.json(listSounds()));

  app.post('/api/upload', (req, res) => {
    upload.array('files', 20)(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ ok: true, sounds: listSounds() });
    });
  });

  app.delete('/api/sounds/:id', (req, res) => {
    const ok = deleteSound(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Sound not found' });
    res.json({ ok: true, sounds: listSounds() });
  });

  app.post('/api/play/:id', (req, res) => {
    const resolved = resolveSoundPath(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Sound not found' });
    try {
      const name = path.parse(resolved.filename).name;
      bot.play(resolved.path, name);
      logActivity({ user: 'Dashboard', action: 'play', sound: name, source: 'web', channel: bot.getStatus().channelName });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/stop', (req, res) => {
    bot.stop();
    res.json({ ok: true });
  });

  app.get('/api/guilds', (req, res) => res.json(bot.getGuilds()));

  app.get('/api/guilds/:id/channels', (req, res) => {
    res.json(bot.getVoiceChannels(req.params.id));
  });

  app.post('/api/join', async (req, res) => {
    const { guildId, channelId } = req.body || {};
    if (!guildId || !channelId) return res.status(400).json({ error: 'guildId & channelId are required' });
    try {
      await bot.join(guildId, channelId);
      res.json({ ok: true, status: bot.getStatus() });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/leave', (req, res) => {
    bot.leave();
    res.json({ ok: true, status: bot.getStatus() });
  });

  // ---- MyInstants ----
  app.get('/api/myinstants/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    try {
      const results = q ? await searchInstants(q) : await getTrending();
      res.json(results);
    } catch (err) {
      res.status(502).json({ error: 'Failed to reach MyInstants: ' + err.message });
    }
  });

  app.post('/api/myinstants/play', async (req, res) => {
    const { url, name } = req.body || {};
    if (!isAllowedMediaUrl(url)) return res.status(400).json({ error: 'Invalid MyInstants URL' });
    try {
      await bot.playUrl(url, name || 'MyInstants');
      logActivity({ user: 'Dashboard', action: 'play', sound: name || 'MyInstants', source: 'web', channel: bot.getStatus().channelName });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Activity log
  app.get('/api/log', (req, res) => res.json(getRecent(60)));

  app.post('/api/myinstants/save', async (req, res) => {
    const { url, name } = req.body || {};
    if (!isAllowedMediaUrl(url)) return res.status(400).json({ error: 'Invalid MyInstants URL' });
    try {
      const filename = await saveSoundFromUrl(url, name);
      res.json({ ok: true, saved: filename, sounds: listSounds() });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Static frontend
  app.use(express.static(PUBLIC_DIR));

  // ---- HTTP + WebSocket ----
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Auth for the WebSocket via query ?token=
    if (config.webPassword) {
      const url = new URL(req.url, 'http://localhost');
      if (url.searchParams.get('token') !== config.webPassword) {
        ws.close(4001, 'Unauthorized');
        return;
      }
    }
    // Send the current status on first connect
    ws.send(JSON.stringify({ type: 'status', data: bot.getStatus() }));
  });

  function broadcast(payload) {
    const msg = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(msg);
    }
  }

  // Broadcast whenever the bot status changes
  bot.on('statusChanged', (status) => broadcast({ type: 'status', data: status }));

  // Broadcast every new activity (who played what)
  onActivity((entry) => broadcast({ type: 'activity', data: entry }));

  return server;
}

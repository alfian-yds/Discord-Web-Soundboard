// ---- SVG icons (2px stroke, rounded) ----
const ICON = {
  play: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.79-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z"/></svg>',
  playSm: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.79-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z"/></svg>',
  wave: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 10v4"/><path d="M8 6v12"/><path d="M12 9v6"/><path d="M16 5v14"/><path d="M20 10v4"/></svg>',
  save: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M12 8a2.5 2.5 0 0 0-2.5 2.5"/></svg>',
  aStop: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  aJoin: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
  aLeave: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
};

// Action metadata for the activity log
const ACTION_META = {
  play: { ico: ICON.playSm, verb: 'played' },
  stop: { ico: ICON.aStop, verb: 'stopped the sound' },
  join: { ico: ICON.aJoin, verb: 'brought the bot to' },
  leave: { ico: ICON.aLeave, verb: 'made the bot leave' },
};

// ---- Theme (Auto / Light / Dark) ----
const THEME_ORDER = ['auto', 'light', 'dark'];
const THEME_META = {
  auto: { icon: 'auto', label: 'Theme: Auto (follow device)' },
  light: { icon: 'sun', label: 'Theme: Light' },
  dark: { icon: 'moon', label: 'Theme: Dark' },
};

function applyTheme(mode) {
  if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', mode);
  const btn = document.getElementById('theme-btn');
  if (btn) {
    const meta = THEME_META[mode];
    btn.innerHTML = ICON[meta.icon];
    btn.setAttribute('aria-label', meta.label);
    btn.title = meta.label;
  }
}

function initTheme() {
  applyTheme(localStorage.getItem('sb_theme') || 'auto');
}

function cycleTheme() {
  const current = localStorage.getItem('sb_theme') || 'auto';
  const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
  localStorage.setItem('sb_theme', next);
  applyTheme(next);
}

initTheme(); // apply before render, including the login screen

// ---- State & helpers ----
let token = localStorage.getItem('sb_token') || '';

function authHeaders(extra = {}) {
  return token ? { 'x-auth': token, ...extra } : extra;
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  if (res.status === 401) {
    localStorage.removeItem('sb_token');
    location.reload();
    throw new Error('Unauthorized');
  }
  return res;
}

// ---- Login flow ----
const loginEl = document.getElementById('login');
const appEl = document.getElementById('app');

async function init() {
  const res = await fetch('/api/auth-required');
  const { required } = await res.json();

  if (!required) return startApp();
  if (token && (await verifyToken(token))) return startApp();
  showLogin();
}

async function verifyToken(pw) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  });
  return res.ok;
}

function showLogin() {
  loginEl.classList.remove('hidden');
  appEl.classList.add('hidden');
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (await verifyToken(pw)) {
    token = pw;
    localStorage.setItem('sb_token', pw);
    loginEl.classList.add('hidden');
    startApp();
  } else {
    errEl.textContent = 'Wrong password. Try again.';
  }
});

// ---- Main app ----
function startApp() {
  appEl.classList.remove('hidden');
  loadGuilds();
  loadSounds();
  loadActivity();
  connectWs();
  bindControls();
}

// ---- WebSocket (realtime status) ----
function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${location.host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const ws = new WebSocket(url);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'status') renderStatus(msg.data);
    else if (msg.type === 'activity') addActivityEntry(msg.data);
  };
  ws.onclose = () => setTimeout(connectWs, 2000);
}

function renderStatus(s) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const np = document.getElementById('now-playing');

  if (!s.ready) {
    dot.className = 'dot offline';
    text.textContent = 'Bot offline';
  } else if (s.connected) {
    dot.className = 'dot online';
    text.textContent = `${s.channelName}`;
  } else {
    dot.className = 'dot';
    text.textContent = 'Ready — not in a channel';
  }

  if (s.nowPlaying) {
    np.className = 'now-playing active';
    np.innerHTML = `${ICON.wave}<span>Playing: ${escapeHtml(s.nowPlaying)}</span>`;
  } else {
    np.className = 'now-playing';
    np.innerHTML = '';
  }

  document.querySelectorAll('.sound').forEach((el) => {
    el.classList.toggle('playing', s.nowPlaying && el.dataset.name === s.nowPlaying);
  });
}

// ---- Guilds & channels ----
async function loadGuilds() {
  const guilds = await (await api('/guilds')).json();
  const sel = document.getElementById('guild-select');
  sel.innerHTML = '<option value="">Select a server…</option>' +
    guilds.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  if (guilds.length === 1) {
    sel.value = guilds[0].id;
    loadChannels(guilds[0].id);
  }
}

async function loadChannels(guildId) {
  const sel = document.getElementById('channel-select');
  if (!guildId) {
    sel.innerHTML = '<option value="">Select a voice channel…</option>';
    return;
  }
  const channels = await (await api(`/guilds/${guildId}/channels`)).json();
  sel.innerHTML = '<option value="">Select a voice channel…</option>' +
    channels.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

// ---- Sounds ----
async function loadSounds() {
  const sounds = await (await api('/sounds')).json();
  renderBoard(sounds);
}

function renderBoard(sounds) {
  const board = document.getElementById('board');
  const empty = document.getElementById('empty');
  empty.classList.toggle('hidden', sounds.length > 0);
  board.innerHTML = sounds.map((s) => `
    <div class="sound" role="button" tabindex="0" data-id="${s.id}" data-name="${escapeHtml(s.name)}" aria-label="Play ${escapeHtml(s.name)}">
      <span class="del" data-id="${s.id}" role="button" tabindex="0" aria-label="Delete ${escapeHtml(s.name)}">${ICON.x}</span>
      <span class="sound-ico">${ICON.play}</span>
      <span class="sound-label">${escapeHtml(s.name)}</span>
    </div>
  `).join('');
}

// ---- Activity log ----
async function loadActivity() {
  try {
    const entries = await (await api('/log')).json();
    renderActivity(entries);
  } catch { /* ignore */ }
}

function renderActivity(entries) {
  const list = document.getElementById('activity-log');
  const empty = document.getElementById('activity-empty');
  empty.classList.toggle('hidden', entries.length > 0);
  list.innerHTML = entries.map(activityHtml).join('');
}

function addActivityEntry(entry) {
  const list = document.getElementById('activity-log');
  document.getElementById('activity-empty').classList.add('hidden');
  list.insertAdjacentHTML('afterbegin', activityHtml(entry));
  while (list.children.length > 60) list.lastElementChild.remove();
}

function activityHtml(e) {
  const meta = ACTION_META[e.action] || ACTION_META.play;
  const soundPart = e.sound ? ` <span class="snd">${escapeHtml(e.sound)}</span>` : '';
  let channelPart = '';
  if (e.channel && e.action === 'play') channelPart = ` in ${escapeHtml(e.channel)}`;
  else if (e.channel && e.action === 'join') channelPart = ` ${escapeHtml(e.channel)}`;
  const srcLabel = e.source === 'chat' ? 'Chat' : 'Web';
  return `
    <li class="activity-item">
      <span class="activity-ico ${e.action}">${meta.ico}</span>
      <div class="activity-main">
        <div class="activity-text"><span class="who">${escapeHtml(e.user)}</span> ${meta.verb}${soundPart}${channelPart}</div>
        <div class="activity-meta">
          <span class="src-badge ${e.source}">${srcLabel}</span>
          <span class="activity-time">${timeAgo(e.time)}</span>
        </div>
      </div>
    </li>`;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ---- Controls ----
function bindControls() {
  document.getElementById('guild-select').addEventListener('change', (e) => loadChannels(e.target.value));

  document.getElementById('join-btn').addEventListener('click', async () => {
    const guildId = document.getElementById('guild-select').value;
    const channelId = document.getElementById('channel-select').value;
    if (!guildId || !channelId) return toast('Pick a server & voice channel first.', 'error');
    const res = await api('/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, channelId }),
    });
    if (res.ok) toast('Bot joined the channel!', 'success');
    else toast((await res.json()).error, 'error');
  });

  document.getElementById('leave-btn').addEventListener('click', () => api('/leave', { method: 'POST' }));
  document.getElementById('stop-btn').addEventListener('click', () => api('/stop', { method: 'POST' }));
  document.getElementById('refresh-btn').addEventListener('click', loadSounds);
  document.getElementById('log-refresh').addEventListener('click', loadActivity);

  // Sound board: click + keyboard
  const board = document.getElementById('board');
  board.addEventListener('click', (e) => handleBoardActivate(e));
  board.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('.del') || e.target.closest('.sound')) {
      e.preventDefault();
      handleBoardActivate(e);
    }
  });

  // Upload
  const fileInput = document.getElementById('file-input');
  const uploadArea = document.getElementById('upload-area');
  fileInput.addEventListener('change', () => uploadFiles(fileInput.files));
  ['dragover', 'dragenter'].forEach((ev) =>
    uploadArea.addEventListener(ev, (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    uploadArea.addEventListener(ev, (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); }));
  uploadArea.addEventListener('drop', (e) => uploadFiles(e.dataTransfer.files));

  // MyInstants
  document.getElementById('mi-form').addEventListener('submit', (e) => {
    e.preventDefault();
    searchMyInstants(document.getElementById('mi-query').value.trim());
  });
  document.getElementById('mi-results').addEventListener('click', onMyInstantsClick);

  // Theme button
  document.getElementById('theme-btn').addEventListener('click', cycleTheme);

  // Info modal
  const modal = document.getElementById('info-modal');
  const closeInfo = () => modal.classList.add('hidden');
  document.getElementById('info-btn').addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('info-close').addEventListener('click', closeInfo);
  document.getElementById('info-ok').addEventListener('click', closeInfo);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeInfo(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeInfo(); });
}

async function handleBoardActivate(e) {
  const del = e.target.closest('.del');
  if (del) {
    e.stopPropagation();
    if (!confirm('Remove this sound from the board?')) return;
    await api(`/sounds/${del.dataset.id}`, { method: 'DELETE' });
    loadSounds();
    return;
  }
  const sound = e.target.closest('.sound');
  if (sound) {
    const res = await api(`/play/${sound.dataset.id}`, { method: 'POST' });
    if (!res.ok) toast((await res.json()).error, 'error');
  }
}

// ---- MyInstants ----
async function searchMyInstants(query) {
  const statusEl = document.getElementById('mi-status');
  const resultsEl = document.getElementById('mi-results');
  statusEl.textContent = query ? `Searching “${query}”…` : 'Loading trending sounds…';
  resultsEl.innerHTML = '';
  try {
    const res = await api(`/myinstants/search?q=${encodeURIComponent(query)}`);
    const items = await res.json();
    if (!res.ok) { statusEl.textContent = items.error || 'Search failed.'; return; }
    statusEl.textContent = items.length
      ? `${items.length} results found`
      : (query ? `No results for “${query}”. Try another keyword.` : 'No trending sounds yet.');
    resultsEl.innerHTML = items.map((it) => `
      <div class="mi-item" data-url="${escapeHtml(it.url)}" data-name="${escapeHtml(it.name)}">
        <span class="mi-name" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</span>
        <button class="btn btn-primary mi-play" data-act="play">${ICON.playSm}<span>Play</span></button>
        <button class="btn mi-save" data-act="save">${ICON.save}<span>Save</span></button>
      </div>
    `).join('');
  } catch {
    statusEl.textContent = 'Failed to reach the server.';
  }
}

async function onMyInstantsClick(e) {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const item = btn.closest('.mi-item');
  const { url, name } = item.dataset;

  if (btn.dataset.act === 'play') {
    const res = await api('/myinstants/play', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name }),
    });
    if (!res.ok) toast((await res.json()).error, 'error');
  } else if (btn.dataset.act === 'save') {
    btn.disabled = true;
    btn.innerHTML = `${ICON.save}<span>Saving…</span>`;
    const res = await api('/myinstants/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error, 'error');
      btn.disabled = false;
      btn.innerHTML = `${ICON.save}<span>Save</span>`;
      return;
    }
    btn.classList.add('saved');
    btn.innerHTML = `${ICON.check}<span>Saved</span>`;
    renderBoard(data.sounds);
    toast(`“${name}” added to the board.`, 'success');
  }
}

// ---- Upload ----
async function uploadFiles(files) {
  if (!files || !files.length) return;
  const statusEl = document.getElementById('upload-status');
  statusEl.textContent = `Uploading ${files.length} file(s)…`;
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  const res = await api('/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) {
    statusEl.textContent = '';
    toast(`Upload failed: ${data.error}`, 'error');
    return;
  }
  statusEl.textContent = '';
  renderBoard(data.sounds);
  toast('Sound added successfully!', 'success');
}

// ---- Util ----
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

init();

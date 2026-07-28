// MyInstants.com integration (no official API — scraped from public pages).
const BASE = 'https://www.myinstants.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

// Regex that grabs the mp3 URL + name straight from the button tag:
//   onclick="play('/media/sounds/xxx.mp3', ...)" title="Play NAME sound"
const INSTANT_RE = /play\('(\/media\/sounds\/[^']+\.mp3)',[^)]*\)\s*"\s*title="Play (.+?) sound"/g;

function decodeEntities(str) {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseInstants(html) {
  const seen = new Set();
  const results = [];
  let m;
  INSTANT_RE.lastIndex = 0;
  while ((m = INSTANT_RE.exec(html)) !== null) {
    const url = BASE + m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    results.push({ name: decodeEntities(m[2]), url });
  }
  return results;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Search MyInstants by keyword. */
export async function searchInstants(query) {
  const res = await fetch(`${BASE}/en/search/?name=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    redirect: 'follow',
  });
  // MyInstants returns 404 when a search finds no results — that's not an error.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseInstants(await res.text());
}

/** Get trending sounds (front page). */
export async function getTrending() {
  const html = await fetchHtml(`${BASE}/en/index/us/`);
  return parseInstants(html);
}

/** Validate a URL so only MyInstants media can be fetched (prevents SSRF). */
export function isAllowedMediaUrl(u) {
  try {
    const url = new URL(u);
    return (
      url.protocol === 'https:' &&
      /(^|\.)myinstants\.com$/.test(url.hostname) &&
      url.pathname.startsWith('/media/')
    );
  } catch {
    return false;
  }
}

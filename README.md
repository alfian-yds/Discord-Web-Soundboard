# 🔊 Discord Web Soundboard

A Discord bot that stays in a voice channel and is controlled from a **web
interface** *and* via **chat commands** like a music bot. Open the web page →
press a button → the sound plays in the voice channel. Or type `sb! <keyword>`
in Discord and the bot joins your channel and plays the top MyInstants result.

Built with **Node.js + discord.js v14**.

> 🇮🇩 **Versi Bahasa Indonesia ada di bagian bawah** ([lompat ke sana](#-versi-bahasa-indonesia)).

---

## Features

- 💬 **Discord chat commands** (music-bot style): `sb! <keyword>` → bot joins your
  voice channel, plays the top MyInstants sound, and auto-leaves when idle
- 🔎 **MyInstants** integration — search & play/save sounds without manual upload
- 🎛️ Web dashboard with a sound-button grid + light/dark theme
- 📊 Live **activity log** — who played what, from chat or web
- ⬆️ Upload audio straight from the browser (mp3, ogg, wav, m4a, webm, flac)
- 🔗 Join/leave voice from chat, web, or slash command
- ⚡ Realtime status via WebSocket (connection indicator + "now playing")
- 🔒 Password-protected web interface (important for public/VPS deploys)
- 📦 No manual FFmpeg install (uses `ffmpeg-static`)

---

## 1. Create the Discord bot

1. Open <https://discord.com/developers/applications> → **New Application**.
2. Go to the **Bot** tab → **Reset Token** → copy it → put it in `.env` as `DISCORD_TOKEN`.
3. On **General Information**, copy the **Application ID** → `DISCORD_CLIENT_ID`.
4. Invite the bot to your server. Open this URL (replace `CLIENT_ID`):
   ```
   https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot+applications.commands&permissions=3145728
   ```
   Permission `3145728` = Connect + Speak (enough for a soundboard).
5. **Required for chat commands:** on the **Bot** tab, enable **Message Content
   Intent** (under "Privileged Gateway Intents") → **Save Changes**. Without it the
   bot cannot read `sb! ...` commands and will fail to log in with
   *"Used disallowed intents"*.

---

## 2. Install & configure

```bash
npm install
```

Copy `.env.example` to `.env` and fill it in:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
PORT=3000
WEB_PASSWORD=your_secret_password
MAX_UPLOAD_MB=8
OUTPUT_VOLUME=0.3        # 0.3 = 30%
COMMAND_PREFIX=sb!
IDLE_TIMEOUT_MIN=5
```

Register the slash commands (once):

```bash
npm run register
```

---

## 3. Run

```bash
npm start
```

Then open <http://localhost:3000> in your browser.

**How to use:**
1. Enter the password (if `WEB_PASSWORD` is set).
2. Pick a **server** and **voice channel**, click **Join**.
3. **Upload** audio files (or drag them onto the upload area).
4. Press a sound button → it plays in the voice channel. 🎉

---

## Discord chat commands

Type these in any text channel. **You must be in a voice channel** — the bot
auto-joins your channel, plays, then leaves by itself after `IDLE_TIMEOUT_MIN`
minutes of inactivity. The prefix is configurable via `COMMAND_PREFIX`.

**Main commands** (shown in `sb!help`):

| Command | Shortcut | What it does |
|---------|----------|--------------|
| `sb! <keyword>` | `sb!p <keyword>` | Search & play the **top** MyInstants result |
| `sb!stop` | `sb!s` | Stop the current sound |
| `sb!join` | `sb!j` | Bot joins your voice channel |
| `sb!leave` | `sb!l` | Bot leaves the voice channel |
| `sb!volume <0-200>` | `sb!v` | Set volume in percent (e.g. `sb!volume 30`) |
| `sb!help` | `sb!h` | Show the command list |

**Extra commands** (still work, just hidden from `sb!help`):

| Command | What it does |
|---------|--------------|
| `sb!list <keyword>` | Show the top 5 results (without playing) |
| `sb!local <name>` | Play a saved (local) sound by name |
| `sb!sounds` | List saved sounds |

> Requires **Message Content Intent** enabled (see step 5 in "Create the Discord bot").

---

## Deploy to a VPS

See **[DEPLOY.md](DEPLOY.md)** for a full step-by-step guide
(Ubuntu/Debian + domain + HTTPS, using PM2 + Nginx + Let's Encrypt).

> **Security note:** the web password is sent as a header. Without HTTPS it can be
> sniffed on the network. Always use HTTPS for public deploys.

---

## Project structure

```
src/
  index.js            # entry point (starts bot + web server)
  config.js           # reads .env & constants
  bot.js              # Discord + voice logic (join/leave/play)
  commands.js         # chat command handler (sb! ...)
  server.js           # Express API + WebSocket
  soundStore.js       # manages audio files in sounds/
  myinstants.js       # MyInstants search/play integration
  activityLog.js      # activity log (who played what)
  registerCommands.js # registers slash commands (/join, /leave)
public/               # web interface (index.html, style.css, app.js)
sounds/               # uploaded/saved audio files
data/                 # activity log storage (auto-created)
deploy/               # nginx config example
ecosystem.config.cjs  # PM2 config
DEPLOY.md             # VPS deployment guide
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot fails to log in | Check `DISCORD_TOKEN` is correct & not reset. For chat commands, enable Message Content Intent. |
| Slash commands missing | Run `npm run register`, wait ~1 min, refresh Discord. |
| Button pressed but no sound | Make sure you clicked **Join** and the bot is in the right channel. |
| Bot joins then leaves / silent | Needs recent `@discordjs/voice` (0.19+) with `@snazzah/davey` for Discord's DAVE/E2EE. Also ensure outbound UDP is allowed. |
| Server list empty | The bot hasn't been invited to any server yet. |
| Choppy audio | Usually VPS network; try a VPS region near Discord's servers. |

---
---

# 🇮🇩 Versi Bahasa Indonesia

Bot Discord yang standby di voice channel dan dikontrol lewat **web interface**
*maupun* **command chat** ala bot musik. Buka halaman web → tekan tombol → suara
diputar di voice channel. Atau ketik `sb! <kata kunci>` di Discord dan bot masuk
ke channel-mu lalu memutar hasil teratas MyInstants.

Dibuat dengan **Node.js + discord.js v14**.

## Fitur

- 💬 **Command chat Discord** ala bot musik: `sb! <kata kunci>` → bot masuk ke
  voice channel kamu & putar suara teratas MyInstants, lalu auto-keluar saat idle
- 🔎 Integrasi **MyInstants** — cari & putar/simpan suara tanpa upload manual
- 🎛️ Web dashboard dengan grid tombol suara + mode gelap/terang
- 📊 **Log aktivitas** realtime — siapa memutar apa, dari chat atau web
- ⬆️ Upload file audio langsung dari browser (mp3, ogg, wav, m4a, webm, flac)
- 🔗 Join/leave voice dari chat, web, atau slash command
- ⚡ Status realtime via WebSocket (indikator koneksi + "sedang memutar")
- 🔒 Proteksi password untuk web interface (penting untuk deploy ke VPS)
- 📦 Tanpa install FFmpeg manual (pakai `ffmpeg-static`)

## 1. Persiapan Bot Discord

1. Buka <https://discord.com/developers/applications> → **New Application**.
2. Masuk tab **Bot** → **Reset Token** → salin → taruh di `.env` sebagai `DISCORD_TOKEN`.
3. Di **General Information**, salin **Application ID** → `DISCORD_CLIENT_ID`.
4. Undang bot ke server. Buka URL ini (ganti `CLIENT_ID`):
   ```
   https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot+applications.commands&permissions=3145728
   ```
   Permission `3145728` = Connect + Speak.
5. **WAJIB untuk command chat:** di tab **Bot**, aktifkan **Message Content Intent**
   (bagian "Privileged Gateway Intents") → **Save Changes**. Tanpa ini bot gagal
   login dengan error *"Used disallowed intents"*.

## 2. Install & Konfigurasi

```bash
npm install
```

Salin `.env.example` menjadi `.env` lalu isi:

```env
DISCORD_TOKEN=token_bot_kamu
DISCORD_CLIENT_ID=application_id_kamu
PORT=3000
WEB_PASSWORD=password_rahasia_kamu
MAX_UPLOAD_MB=8
OUTPUT_VOLUME=0.3        # 0.3 = 30%
COMMAND_PREFIX=sb!
IDLE_TIMEOUT_MIN=5
```

Daftarkan slash command (sekali):

```bash
npm run register
```

## 3. Menjalankan

```bash
npm start
```

Lalu buka <http://localhost:3000>.

**Cara pakai:**
1. Masukkan password (kalau `WEB_PASSWORD` diisi).
2. Pilih **server** dan **voice channel**, klik **Join**.
3. **Upload** file audio (atau seret ke area upload).
4. Tekan tombol suara → langsung diputar. 🎉

## Perintah Chat Discord

Ketik di channel teks. **Kamu harus sedang di voice channel** — bot otomatis masuk,
memutar, lalu keluar sendiri setelah `IDLE_TIMEOUT_MIN` menit tanpa aktivitas.
Prefix bisa diubah via `COMMAND_PREFIX`.

**Perintah utama** (tampil di `sb!help`):

| Perintah | Singkatan | Fungsi |
|----------|-----------|--------|
| `sb! <kata kunci>` | `sb!p <kata kunci>` | Cari & putar suara **teratas** MyInstants |
| `sb!stop` | `sb!s` | Hentikan suara |
| `sb!join` | `sb!j` | Bot masuk ke voice channel kamu |
| `sb!leave` | `sb!l` | Bot keluar dari voice channel |
| `sb!volume <0-200>` | `sb!v` | Setel volume persen (mis. `sb!volume 30`) |
| `sb!help` | `sb!h` | Tampilkan daftar perintah |

**Perintah tambahan** (tetap berfungsi, tidak ditampilkan di `sb!help`):

| Perintah | Fungsi |
|----------|--------|
| `sb!list <kata kunci>` | Tampilkan 5 hasil teratas (tanpa memutar) |
| `sb!local <nama>` | Putar suara tersimpan (lokal) |
| `sb!sounds` | Lihat daftar suara tersimpan |

> Butuh **Message Content Intent** aktif (lihat langkah 5).

## Deploy ke VPS

Lihat **[DEPLOY.md](DEPLOY.md)** untuk panduan lengkap (Ubuntu/Debian + domain +
HTTPS, pakai PM2 + Nginx + Let's Encrypt). Bagian Bahasa Indonesia ada di bawah
dokumen tersebut.

> **Keamanan:** password dikirim sebagai header. Tanpa HTTPS bisa tersadap.
> Selalu pakai HTTPS untuk deploy publik.

## Troubleshooting

| Masalah | Solusi |
|--------|--------|
| Bot gagal login | Cek `DISCORD_TOKEN`; untuk command chat, aktifkan Message Content Intent. |
| Slash command tidak muncul | Jalankan `npm run register`, tunggu ~1 menit, refresh Discord. |
| Tombol ditekan tapi tak ada suara | Pastikan sudah **Join** & bot di channel yang benar. |
| Bot masuk lalu keluar / diam | Butuh `@discordjs/voice` 0.19+ dengan `@snazzah/davey` (DAVE/E2EE). Pastikan UDP keluar diizinkan. |
| Server list kosong | Bot belum diundang ke server mana pun. |
| Suara putus-putus | Biasanya jaringan VPS; pilih region dekat server Discord. |

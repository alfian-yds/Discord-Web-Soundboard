# 🚀 Deploy to a VPS (Ubuntu/Debian + Domain + HTTPS)

Run the Soundboard 24/7 on a VPS, accessible at `https://yourdomain`.
Stack: **Node.js + PM2 + Nginx + Let's Encrypt (certbot)**.

Replace these example values with your own:
- Domain: `soundboard.example.com`
- VPS user: `ubuntu` (or your non-root user)

> 🇮🇩 **Versi Bahasa Indonesia ada di bagian bawah** ([lompat ke sana](#-versi-bahasa-indonesia)).

---

## 0. Prerequisites

- A VPS running Ubuntu 22.04/24.04 or Debian 12 (1 GB RAM is enough).
- SSH access: `ssh ubuntu@VPS_IP`.
- **DNS**: create an **A record** for your domain → **VPS IP**. Wait for it to
  propagate (`ping soundboard.example.com` should resolve to the VPS IP).
- **Message Content Intent** enabled in the Discord Developer Portal.

---

## 1. Push the code to GitHub (from your computer)

> `.env`, `sounds/`, and `data/` are **not** committed (safe — your bot token won't leak).

Create a new **private** GitHub repo, then from the project folder:

```bash
git remote add origin https://github.com/USERNAME/discord-soundboard.git
git branch -M main
git push -u origin main
```

(If `git init` and the first commit aren't done yet, run:
`git init && git add . && git commit -m "Initial commit"` first.)

---

## 2. Prepare the VPS (one time)

SSH into the VPS, then:

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# PM2 (process manager) globally
sudo npm install -g pm2
```

Check: `node -v` (should be v20.x). No build tools needed — all native deps
(@snazzah/davey, ffmpeg) ship prebuilt Linux binaries.

---

## 3. Clone & install

```bash
cd ~
git clone https://github.com/USERNAME/discord-soundboard.git soundboard
cd soundboard
npm install
```

> Private repo? `git clone` will ask for credentials. Use your GitHub username and
> a **Personal Access Token** (https://github.com/settings/tokens, scope `repo`)
> as the password — not your account password.

---

## 4. Create the `.env` file on the VPS

```bash
cp .env.example .env
nano .env
```

Fill in production values:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=1530604258729263224
PORT=3001
HOST=127.0.0.1          # REQUIRED on a VPS: only reachable via Nginx
WEB_PASSWORD=a_new_strong_password    # CHANGE from the old one!
MAX_UPLOAD_MB=8
OUTPUT_VOLUME=0.15
COMMAND_PREFIX=sb!
IDLE_TIMEOUT_MIN=5
```

Save (Ctrl+O, Enter, Ctrl+X).

> Register slash commands (once): `npm run register`

---

## 5. Run with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save                    # persist the process list
pm2 startup                 # follow the printed command (auto-start on reboot)
pm2 logs soundboard         # view logs; you should see "Login sebagai ..."
```

The bot now runs on `127.0.0.1:3001` (not yet reachable from outside — that's Nginx's job).

---

## 6. Nginx reverse proxy

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/soundboard
sudo nano /etc/nginx/sites-available/soundboard   # set server_name to your domain
sudo ln -s /etc/nginx/sites-available/soundboard /etc/nginx/sites-enabled/
sudo nginx -t                    # test the config
sudo systemctl reload nginx
```

Now `http://soundboard.example.com` works (not HTTPS yet).

---

## 7. Free HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d soundboard.example.com
```

Follow the prompts (email, agree to TOS, choose HTTP→HTTPS redirect).
Certbot edits the Nginx config, installs the certificate, and sets up auto-renew.

✅ Done — open **https://soundboard.example.com** and log in with `WEB_PASSWORD`.
WebSocket automatically uses `wss://` (secure).

---

## 8. Firewall (recommended)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'    # ports 80 + 443
sudo ufw enable
```

Port 3001 is **not** exposed publicly (only Nginx reaches it via localhost).

---

## 9. Invite the bot & test

Make sure the bot is invited to your Discord server (use the OAuth link in the README).
Then test:
- Web: log in → pick a channel → Join → press a button.
- Discord chat: `sb! vine boom` (you must be in a voice channel).

---

## 🔄 Updating later

Whenever the code changes:

```bash
# on your computer
git add . && git commit -m "update" && git push

# on the VPS
cd ~/soundboard
git pull
npm install          # if dependencies changed
pm2 restart soundboard
```

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Web won't open | `pm2 logs soundboard` (check errors), `sudo nginx -t`, verify the DNS A record |
| Bot online but no sound | Ensure the VPS allows **outbound UDP** (Discord voice uses UDP). Some providers/firewalls block it. |
| `Used disallowed intents` | Enable Message Content Intent in the portal |
| certbot fails | Make sure the domain points to the VPS IP & port 80 is open before running certbot |
| Bot keeps dying | `pm2 logs soundboard` to see why; PM2 auto-restarts, but check for repeated errors |
| Change password/volume | edit `.env` → `pm2 restart soundboard` |

Check status anytime: `pm2 status` · `pm2 logs soundboard` · `pm2 monit`

---
---

# 🇮🇩 Versi Bahasa Indonesia

Menjalankan Soundboard 24/7 di VPS, diakses lewat `https://domainmu`.
Stack: **Node.js + PM2 + Nginx + Let's Encrypt (certbot)**.

Ganti nilai contoh berikut sesuai punyamu:
- Domain: `soundboard.contoh.com`
- User VPS: `ubuntu` (atau user non-root milikmu)

## 0. Prasyarat

- VPS Ubuntu 22.04/24.04 atau Debian 12 (RAM 1 GB sudah cukup).
- Bisa SSH ke VPS: `ssh ubuntu@IP_VPS`.
- **DNS**: buat **A record** domainmu → **IP VPS**. Tunggu propagasi
  (`ping soundboard.contoh.com` menunjuk ke IP VPS).
- **Message Content Intent** sudah aktif di Discord Developer Portal.

## 1. Push kode ke GitHub (dari komputermu)

> `.env`, `sounds/`, dan `data/` **tidak** ikut ter-commit (token bot aman).

Buat repo GitHub **private** baru, lalu dari folder project:

```bash
git remote add origin https://github.com/USERNAME/discord-soundboard.git
git branch -M main
git push -u origin main
```

(Kalau `git init` & commit pertama belum dilakukan:
`git init && git add . && git commit -m "Initial commit"` dulu.)

## 2. Siapkan VPS (sekali saja)

SSH ke VPS, lalu:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2
```

Cek: `node -v` (harus v20.x). Tidak perlu build tools — semua dependency native
(@snazzah/davey, ffmpeg) tersedia dalam bentuk binary prebuilt untuk Linux.

## 3. Clone & install

```bash
cd ~
git clone https://github.com/USERNAME/discord-soundboard.git soundboard
cd soundboard
npm install
```

> Repo private? `git clone` akan minta login. Pakai username GitHub + **Personal
> Access Token** (https://github.com/settings/tokens, scope `repo`) sebagai
> password — bukan password akun.

## 4. Buat file `.env` di VPS

```bash
cp .env.example .env
nano .env
```

Isi dengan nilai produksi:

```env
DISCORD_TOKEN=token_bot_kamu
DISCORD_CLIENT_ID=1530604258729263224
PORT=3001
HOST=127.0.0.1          # WAJIB di VPS: app hanya diakses lewat Nginx
WEB_PASSWORD=password_kuat_yang_baru   # GANTI dari yang lama!
MAX_UPLOAD_MB=8
OUTPUT_VOLUME=0.15
COMMAND_PREFIX=sb!
IDLE_TIMEOUT_MIN=5
```

Simpan (Ctrl+O, Enter, Ctrl+X).

> Daftarkan slash command (sekali): `npm run register`

## 5. Jalankan dengan PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup                 # ikuti perintah yang muncul (auto-start saat reboot)
pm2 logs soundboard         # harus muncul "Login sebagai ..."
```

Bot jalan di `127.0.0.1:3001` (belum bisa diakses dari luar — itu tugas Nginx).

## 6. Nginx reverse proxy

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/soundboard
sudo nano /etc/nginx/sites-available/soundboard   # ganti server_name jadi domainmu
sudo ln -s /etc/nginx/sites-available/soundboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Sekarang `http://soundboard.contoh.com` bisa diakses (belum HTTPS).

## 7. HTTPS gratis (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d soundboard.contoh.com
```

Ikuti prompt (email, setuju TOS, pilih redirect HTTP→HTTPS). Certbot otomatis
mengedit config Nginx + memasang sertifikat + auto-renew.

✅ Selesai — buka **https://soundboard.contoh.com**, login dengan `WEB_PASSWORD`.

## 8. Firewall (disarankan)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Port 3001 **tidak** dibuka ke publik (hanya Nginx yang mengaksesnya via localhost).

## 9. Undang bot & tes

Pastikan bot sudah diundang ke server Discord. Lalu tes:
- Web: login → pilih channel → Join → tekan tombol.
- Chat Discord: `sb! vine boom` (kamu harus di voice channel).

## 🔄 Update ke depan

```bash
# di komputermu
git add . && git commit -m "update" && git push

# di VPS
cd ~/soundboard
git pull
npm install
pm2 restart soundboard
```

## 🛠️ Troubleshooting

| Masalah | Solusi |
|--------|--------|
| Web tidak kebuka | `pm2 logs soundboard`, `sudo nginx -t`, cek A record DNS |
| Bot online tapi suara tak keluar | Pastikan VPS mengizinkan **UDP keluar** (voice pakai UDP) |
| `Used disallowed intents` | Aktifkan Message Content Intent di portal |
| certbot gagal | Pastikan domain mengarah ke IP VPS & port 80 terbuka |
| Bot mati sendiri | `pm2 logs soundboard` untuk lihat sebab |
| Ganti password/volume | edit `.env` → `pm2 restart soundboard` |

Cek status: `pm2 status` · `pm2 logs soundboard` · `pm2 monit`

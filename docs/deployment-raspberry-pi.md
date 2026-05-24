# Raspberry Pi Deployment

This app is designed to run as a small Node.js service behind Nginx on `www.doyoulikeclassic.com`.

## Runtime

- Raspberry Pi OS 64-bit
- Node.js 20 or newer
- Nginx
- SQLite database stored outside git, for example `/var/www/classic-rotation/data/classic-rotation.sqlite`
- Domain DNS pointing to the Raspberry Pi public IP or router forwarding target

## First Setup

```bash
sudo apt update
sudo apt install -y nginx sqlite3 build-essential python3
sudo mkdir -p /var/www/classic-rotation
sudo chown -R $USER:$USER /var/www/classic-rotation
git clone <repo-url> /var/www/classic-rotation
cd /var/www/classic-rotation
npm ci --omit=dev
cp .env.example .env
nano .env
```

Use strong production values:

```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=/var/www/classic-rotation/data/classic-rotation.sqlite
ADMIN_PASSWORD=<strong-admin-password>
SESSION_SECRET=<openssl-rand-hex-32-or-longer>
PUBLIC_BASE_URL=https://www.doyoulikeclassic.com
```

Generate a session secret:

```bash
openssl rand -hex 32
```

The server seeds the database automatically when the SQLite file does not exist. To seed manually:

```bash
npm run db:seed
```

## Systemd Service

Create `/etc/systemd/system/classic-rotation.service`:

```ini
[Unit]
Description=Classic Rotation Landing
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/classic-rotation
EnvironmentFile=/var/www/classic-rotation/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Set ownership for runtime files:

```bash
sudo chown -R www-data:www-data /var/www/classic-rotation
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable classic-rotation
sudo systemctl start classic-rotation
sudo systemctl status classic-rotation
```

## Nginx

Create `/etc/nginx/sites-available/classic-rotation`:

```nginx
server {
  listen 80;
  server_name www.doyoulikeclassic.com doyoulikeclassic.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/classic-rotation /etc/nginx/sites-enabled/classic-rotation
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d www.doyoulikeclassic.com -d doyoulikeclassic.com
```

Do not share `/admin` publicly until HTTPS is active.

## Updates

```bash
cd /var/www/classic-rotation
sudo -u www-data git pull
sudo -u www-data npm ci --omit=dev
sudo systemctl restart classic-rotation
```

## Backups

Back up SQLite before changing production content or deploying code:

```bash
mkdir -p ~/classic-rotation-backups
sqlite3 /var/www/classic-rotation/data/classic-rotation.sqlite ".backup '$HOME/classic-rotation-backups/classic-rotation-$(date +%F).sqlite'"
```

## DNS And Router Notes

- Point `www.doyoulikeclassic.com` and `doyoulikeclassic.com` to the server IP.
- If the Raspberry Pi is behind a home or office router, forward ports `80` and `443` to the Pi.
- Keep port `3000` private to localhost; only Nginx should proxy to it.

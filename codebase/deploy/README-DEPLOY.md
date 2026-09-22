# PM2 deploy (Ubuntu, no Docker)

Same flow as the Foster Care Foundry zip: **stage → zip → unzip on server → `start.sh`**.  
Reference: `child-support-platform/codebase/deploy/create-archive.sh`.

## Package (Windows or Linux)

From `codebase/`:

```bash
bash deploy/create-archive.sh
```

On Windows, if scripts ever show `$'\r': command not found` on Linux, run once before packaging:

```bat
normalize-lf.bat
```

(or `py -3 deploy/normalize-lf.py`)

Creates `dist/case-management-staging/` with LF-normalized `.sh` and `.cjs` files (avoids `bash\r: No such file` on Linux).

Zip **the contents** of that folder (not `dist/` itself).

## Server first install (local PostgreSQL)

```bash
sudo mkdir -p /var/www/case-management
sudo unzip -o case-management-linux.zip -d /var/www/case-management
cd /var/www/case-management
sudo bash start.sh
```

No separate database or schema steps: `start.sh` installs PostgreSQL if needed, creates the role/database, builds the app, starts PM2, and the API runs migrations/seed on startup.

Optional once per machine after reboot: `pm2 startup` (run the printed sudo command), then `pm2 save`.

## PostgreSQL (local)

Default `POSTGRES_HOST=127.0.0.1`. `deploy/setup-postgres.sh` (called automatically):

- Installs `postgresql` via apt if missing
- Starts the `postgresql` systemd unit
- Creates/updates role and database from `deploy/.env`

Set `SETUP_POSTGRES=0` only for a remote database you manage yourself.

## Configuration

Copy `deploy/.env.example` → `deploy/.env`. Important keys:

| Key | Purpose |
|-----|---------|
| `JWT_SECRET` | Auth signing (required) |
| `POSTGRES_PASSWORD` | DB password (required) |
| `PUBLIC_HOST` | nginx `server_name` |
| `APP_BASE_PATH` | URL prefix (default `/case-management`) |
| `APP_PORT` | Loopback port (default `4510`) |
| `ENFORCE_HTTPS` | `true` behind TLS-terminating nginx |

## Nginx

Path-based proxy to loopback (preserve prefix):

- `location /case-management/` → `http://127.0.0.1:4510/case-management/`

Auto-config: `sudo bash deploy/configure-nginx.sh` (uses `SSL_CERTIFICATE` / `SSL_CERTIFICATE_KEY` from `.env`).

## Updates

```bash
cd /var/www/case-management
# unzip new files over the install root
bash start.sh --no-nginx
pm2 save
```

Use `--no-build` only if `web/dist` is pre-built in the zip.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `$'\r': command not found` | Re-pack with `create-archive.sh` (LF normalization) or `dos2unix *.sh` on server |
| `vite not found` | Ensure `npm ci --include=dev` ran (do not set `NODE_ENV=production` during install) |
| Health check timeout | Check PostgreSQL, `DATABASE_URL`, `pm2 logs case-management-app` |
| 404 on public URL | nginx `proxy_pass` must include `/case-management/` prefix on both sides |

## Docker deploy

For container deploy, use root `deploy.sh` + `docker-compose.prod.yml` and `package.bat` instead.

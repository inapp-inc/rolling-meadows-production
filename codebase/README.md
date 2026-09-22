# Case Management Platform — Production Codebase

**Stack:** React (Vite) + Python FastAPI + PostgreSQL, deployed via Docker Compose.

**UI reference:** Operational screen layouts and behaviour are defined by the approved prototype in `../Docs/ui/`. Production React pages migrate incrementally from that reference.

**API contract:** `../Docs/openapi.yaml`

## Production deployment

**Default base path:** `/case-management`  
**Single port:** `4510` (configure nginx or your edge to proxy the base path to this port)

Set `PUBLIC_URL` and `APP_BASE_PATH` in `.env` for your host.

### PM2 deploy (Linux, no Docker)

Stage a zip-friendly folder (LF line endings for shell scripts):

```bash
cd codebase
bash deploy/create-archive.sh
```

Zip `dist/case-management-staging/`, copy to Ubuntu, then:

```bash
sudo unzip -o case-management-linux.zip -d /var/www/case-management
cd /var/www/case-management
sudo bash start.sh
```

See `README-SERVER.txt` and `deploy/README-DEPLOY.md`. PostgreSQL must be installed and a matching role/database created before the health check passes.

### Package (Windows — Docker)

```bat
package.bat
```

Creates:
- `dist/case-management-deploy.zip` — copy this to your Linux server
- `dist/case-management-deploy/` — same contents (folder)

Zip contents:
- `case-management-app.tar` — Docker image
- `docker-compose.prod.yml`
- `deploy.sh`
- `.env.example`
- `DEPLOY.txt` — quick steps

### Deploy (Linux server)

```bash
unzip case-management-deploy.zip
cd case-management-deploy
cp .env.example .env   # set JWT_SECRET, POSTGRES_PASSWORD, PUBLIC_URL, etc.
chmod +x deploy.sh
./deploy.sh
```

### Nginx (configure on your server)

Proxy the subpath to the app (preserve the `/case-management` prefix):

```nginx
location /case-management {
    proxy_pass http://127.0.0.1:4510;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

| Endpoint | URL (example) |
|----------|-----|
| Web app | `https://your-host.example.com/case-management` |
| API | `https://your-host.example.com/case-management/api` |
| API docs | `https://your-host.example.com/case-management/api/docs` |
| Health | `https://your-host.example.com/case-management/api/health |

## Local development (Docker)

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web (React) | http://localhost:8081 |
| API (FastAPI) | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

### Demo login

Password: `ChangeMe123!` (or `SEED_USER_PASSWORD` in `.env`)

| Email | Role | Access |
|-------|------|--------|
| platform.admin@demo.example.com | Super admin | **Tenants**, **Locale labels**, **Users** (org admins + branding on create) |
| org.admin@demo.example.com | Organization admin | Tenant branding on login; ops + **Users** (staff they created only) |
| case.manager@demo.example.com | Case Manager | Cases, clients, workflow |
| supervisor@demo.example.com | Supervisor | Cases, clients, workflow |
| liaison@demo.example.com | Liaison | Cross-program lookup |
| auditor@demo.example.com | Auditor | Reports |

The demo **tenant organization** (Demo Human Services Agency) is sample data, not the product name.

For the full super-admin vs tenant-admin behavior and a sign-in verification checklist, see [docs/administration-and-roles.md](docs/administration-and-roles.md).

**Implemented:** [CR-2026-002](../Docs/CR-2026-002-super-admin-org-admin-locale-branding.md) — see [docs/administration-and-roles.md](docs/administration-and-roles.md).

## Local development (without Docker)

**API:**
```bash
cd api
pip install -r requirements.txt
# PostgreSQL running locally (see DATABASE_URL in .env)
uvicorn app.main:app --reload --port 8000
```

**Web:**
```bash
cd web
npm install
npm run dev
```

Vite proxies `/api` to `localhost:8000`.

## Architecture

- **Technologies used:** [../Docs/TECHNOLOGIES.md](../Docs/TECHNOLOGIES.md)
- **Technical architecture (as-built):** [../Docs/TECHNICAL-ARCHITECTURE.md](../Docs/TECHNICAL-ARCHITECTURE.md)
- **Handover:** [../Docs/HANDOVER.md](../Docs/HANDOVER.md)
- **OpenSpec (historical bootstrap):** [../openspec/changes/rolling-meadows-platform/design.md](../openspec/changes/rolling-meadows-platform/design.md) — note: runtime uses PostgreSQL, not MongoDB

Production uses a **single container** that serves the React build and mounts the API at `{APP_BASE_PATH}/api`. Local dev keeps separate `web` (nginx) and `api` services.

## Scaffold divergence

Cloned from `.cursor/skills/_resources/scaffold/starter/` then modified:

- Express `api/` replaced with Python FastAPI
- React Vite app added to `web/`
- MongoDB replaced with PostgreSQL
- Per-service Dockerfiles + Compose (web nginx proxies API locally)
- Production single-port deploy with configurable base path (default `/case-management`)

# Rolling Meadows — Production Codebase

**Stack:** React (Vite) + Python FastAPI + PostgreSQL, deployed via Docker Compose.

**UI reference:** Operational screen layouts and behaviour are defined by the approved prototype in `../Docs/ui/`. Production React pages migrate incrementally from that reference.

**API contract:** `../Docs/openapi.yaml`

## Production deployment

**Public URL:** https://foundry.inapp.com/rolling-meadows  
**Single port:** `4510` (nginx on your server proxies `/rolling-meadows` to this port)

### Package (Windows)

```bat
package.bat
```

Creates:
- `dist/rolling-meadows-deploy.zip` — copy this to your Linux server
- `dist/rolling-meadows-deploy/` — same contents (folder)

Zip contents:
- `rolling-meadows-app.tar` — Docker image
- `docker-compose.prod.yml`
- `deploy.sh`
- `.env.example`
- `DEPLOY.txt` — quick steps

### Deploy (Linux server)

```bash
unzip rolling-meadows-deploy.zip
cd rolling-meadows-deploy
cp .env.example .env   # set JWT_SECRET, POSTGRES_PASSWORD, etc.
chmod +x deploy.sh
./deploy.sh
```

### Nginx (configure on your server)

Proxy the subpath to the app (preserve the `/rolling-meadows` prefix):

```nginx
location /rolling-meadows {
    proxy_pass http://127.0.0.1:4510;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

| Endpoint | URL |
|----------|-----|
| Web app | https://foundry.inapp.com/rolling-meadows |
| API | https://foundry.inapp.com/rolling-meadows/api |
| API docs | https://foundry.inapp.com/rolling-meadows/api/docs |
| Health | https://foundry.inapp.com/rolling-meadows/api/health |

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
| platform.admin@demo.rmhs.app | Super admin (CommunityOne) | **Tenants**, **Locale labels**, **Users** (org admins + branding on create) |
| org.admin@demo.rmhs.app | Organization admin (Rolling Meadows) | Tenant branding on login; ops + **Users** (staff they created only) |
| case.manager@demo.rmhs.app | Case Manager | Cases, clients, workflow |
| supervisor@demo.rmhs.app | Supervisor | Cases, clients, workflow |
| liaison@demo.rmhs.app | Liaison | Cross-program lookup |
| auditor@demo.rmhs.app | Auditor | Reports |

Rolling Meadows is a **tenant organization** in CommunityOne, not the product name.

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

Production uses a **single container** that serves the React build and mounts the API at `/rolling-meadows/api`. Local dev keeps separate `web` (nginx) and `api` services.

## Scaffold divergence

Cloned from `.cursor/skills/_resources/scaffold/starter/` then modified:

- Express `api/` replaced with Python FastAPI
- React Vite app added to `web/`
- MongoDB replaced with PostgreSQL
- Per-service Dockerfiles + Compose (web nginx proxies API locally)
- Production single-port deploy at `/rolling-meadows`

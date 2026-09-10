# Rolling Meadows — Production Codebase

**Stack:** React (Vite) + Python FastAPI + PostgreSQL, deployed via Docker Compose.

**UI reference:** Operational screen layouts and behaviour are defined by the approved prototype in `../Docs/ui/`. Production React pages migrate incrementally from that reference.

**API contract:** `../Docs/openapi.yaml`

## Quick start (Docker)

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

| Email | Role |
|-------|------|
| case.manager@demo.rmhs.app | Case Manager |
| supervisor@demo.rmhs.app | Supervisor |
| liaison@demo.rmhs.app | Liaison |
| auditor@demo.rmhs.app | Auditor |

Password: `ChangeMe123!` (or `SEED_USER_PASSWORD` in `.env`)

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

Vite proxies `/auth` and `/health` to `localhost:8000`.

## Architecture

See `../openspec/changes/rolling-meadows-platform/design.md` for platform-fit (ADR-0017: FastAPI primary backend) and auth design.

## Scaffold divergence

Cloned from `.cursor/skills/_resources/scaffold/starter/` then modified:

- Express `api/` replaced with Python FastAPI
- React Vite app added to `web/`
- MongoDB replaced with PostgreSQL
- Per-service Dockerfiles + Compose (web nginx proxies API)

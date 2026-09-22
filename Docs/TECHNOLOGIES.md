# Technologies used — Rolling Meadows / CommunityOne

**Codebase:** `codebase/`  
**Last reviewed:** 18 September 2026  

This list reflects **pinned or declared** versions in the repo. Patch versions may drift slightly on fresh `npm install` / `pip install` unless lockfiles are added.

---

## Summary stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite 6, React Router 7 |
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Database** | PostgreSQL 16 |
| **ORM / DB driver** | SQLAlchemy 2 (async), asyncpg |
| **Auth** | JWT (python-jose), bcrypt password hashing |
| **API contract** | OpenAPI (FastAPI-generated + `Docs/openapi.yaml`) |
| **Containers** | Docker, Docker Compose |
| **Web server (local/prod split)** | nginx (static SPA); production can use single Python image serving SPA + API |
| **i18n** | JSON locale bundles + PostgreSQL translation store; Excel via openpyxl |

---

## Frontend (`codebase/web`)

| Technology | Version / notes | Purpose |
|------------|-----------------|--------|
| **React** | ^19.0.0 | UI components, SPA |
| **React DOM** | ^19.0.0 | Rendering |
| **React Router** | ^7.1.1 | Client routing, guards |
| **TypeScript** | ^5.7.2 | Typed JavaScript |
| **Vite** | ^6.0.6 | Dev server, production bundler |
| **@vitejs/plugin-react** | ^4.3.4 | React support in Vite |

**Runtime (browser):** Fetch API for HTTP; CSS custom properties for tenant branding; sessionStorage for JWT.

**Build output:** Static assets (`dist/`) served by nginx locally or embedded in production API image.

**Env (Vite):**

- `VITE_API_BASE_URL` — API prefix (e.g. `/api` or `/rolling-meadows/api`)
- `VITE_BASE_PATH` — Router base path for subpath deploy
- `VITE_USE_MOCK_AUTH` — Demo role-picker mode (off in Docker prod)

---

## Backend (`codebase/api`)

| Package | Version | Purpose |
|---------|---------|---------|
| **FastAPI** | 0.115.6 | REST API framework, OpenAPI docs |
| **Uvicorn** | 0.34.0 | ASGI server |
| **SQLAlchemy** | 2.0.36 | ORM (async) |
| **asyncpg** | 0.30.0 | PostgreSQL async driver |
| **Pydantic** | 2.10.4 | Request/response validation |
| **pydantic-settings** | 2.7.0 | Environment configuration |
| **python-jose** | 3.3.0 | JWT create/verify |
| **bcrypt** | 4.2.1 | Password hashing |
| **python-multipart** | 0.0.20 | File uploads (logos, Excel) |
| **openpyxl** | 3.1.5 | Translation Excel import/export |

**Language:** Python **3.12** (Docker base image `python:3.12-slim`).

**Architecture style:** Modular monolith — routers under `app/routers/`, services under `app/services/`, SQLAlchemy models under `app/models/`.

---

## Data store

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 16 (Docker image `postgres:16`) | System of record: tenants, users, cases, clients, i18n, reports, etc. |

**Schema management:** SQLAlchemy `create_all` on startup plus idempotent SQL patches in `init_db()` (no Alembic in repo at handover).

**File storage:** Tenant logos on filesystem (`BRANDING_DIR` / Docker volume `branding_data`), not object storage.

---

## Infrastructure & deployment

| Technology | Purpose |
|------------|---------|
| **Docker** | API, web, and all-in-one production images |
| **Docker Compose** | Local dev: `postgres`, `api`, `web` |
| **nginx** | Serves React build (local `web` service); optional edge proxy on host for `/rolling-meadows` |
| **Node.js 20 Alpine** | Frontend build stage only |
| **Shell scripts** | `deploy.sh`, `package.bat` for packaging prod artifacts |

**Production pattern:** Single container (`codebase/Dockerfile`) — Uvicorn serves FastAPI at `/rolling-meadows/api` and static SPA at `/rolling-meadows`.

---

## Security & integration

| Area | Implementation |
|------|----------------|
| **Authentication** | Bearer JWT (HS256), configurable secret |
| **Authorization** | Role-based route dependencies (`platform_admin`, `organization_admin`, operational roles) |
| **CORS** | FastAPI middleware, env `CORS_ORIGINS` |
| **Correlation** | `x-correlation-id` HTTP header |
| **HTTPS** | Terminated at host nginx (not inside app container) |

**Not in stack (current):** Redis, message queues, Elasticsearch, MongoDB, separate BFF, OIDC/SAML IdP, MFA.

---

## Documentation & specs

| Artifact | Format |
|----------|--------|
| API contract | YAML OpenAPI — `Docs/openapi.yaml` |
| Architecture | Markdown — `Docs/TECHNICAL-ARCHITECTURE.md` |
| UI reference prototype | Static HTML/JS — `Docs/ui/` |
| Change / handover | Markdown — `Docs/HANDOVER.md`, CR docs |

---

## Development tools (optional local)

| Tool | Use |
|------|-----|
| **npm** | Web dependencies and build |
| **pip** | Python dependencies |
| **uvicorn --reload** | Local API without Docker |
| **Vite dev server** | Local web with API proxy |

---

## Related documents

- [TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md) — how these pieces connect  
- [codebase/README.md](../codebase/README.md) — run and deploy commands  

# Handover — Rolling Meadows / CommunityOne

**Project:** Rolling Meadows (CommunityOne tenant demo)  
**Date:** 18 September 2026  
**Owner(s):** Engineering delivery (Foundry)  
**Scope:** Platform administration (CR-2026-002), multi-tenant auth/branding, production Docker deploy, operational case-management UI (ongoing migration from prototype)

---

## 1) Executive summary (for PMs / BAs)

### What changed

- **Product identity:** **CommunityOne** is the platform; **Rolling Meadows Human Services (RMHS)** is a demo **tenant organization**, not the product name.
- **Super admin (platform administrator):** Administration module with **Tenants**, **Locale labels**, and **Users**. Super admin provisions organizations, sets **global UI labels/languages**, and creates **organization administrators** (with optional tenant branding on the same form). No access to tenant operational data (cases, clients) or tenant staff user lists.
- **Organization administrator:** Signs in with **tenant logo and color theme**; runs the operational app and manages **Users** — only staff accounts **they created** (supervisor, case manager, liaison, auditor).
- **Technical stack in `codebase/`:** React (Vite) + FastAPI + **PostgreSQL** (replacing earlier MongoDB design in older docs). Docker Compose for local dev; single-container production image with SPA + API subpath.
- **Deployment:** Packaged for `https://foundry.inapp.com/rolling-meadows` (see `codebase/README.md`).

### Why it matters

- Clear separation between **platform operator** (CommunityOne) and **agency operator** (RMHS and future tenants) reduces compliance and support risk.
- Branding and login preview give each organization a recognizable sign-in experience without forking the codebase per tenant.
- `created_by` on users supports auditable delegation: org admins only see users they provisioned.

### Explicitly out of scope (this handover)

- Enterprise IdP (OIDC/SAML), MFA enforcement
- Billing, metering, support-access sessions (FR-TEN-06/07)
- Full OpenAPI parity audit against every migrated screen
- Custom roles beyond the fixed BRD role catalogue
- Automated E2E test suite for all admin flows

---

## 2) Specs and contracts (source of truth)

| Artifact | Location |
|----------|----------|
| API contract (OpenAPI) | [openapi.yaml](./openapi.yaml) |
| Functional spec (legacy) | [FSD-Rolling-Meadows.md](./FSD-Rolling-Meadows.md) |
| Tenant / admin change request (historical) | [Tenant-Login-Admin-Change-Request.md](./Tenant-Login-Admin-Change-Request.md) |
| **CR-2026-002 (implemented)** | [CR-2026-002-super-admin-org-admin-locale-branding.md](./CR-2026-002-super-admin-org-admin-locale-branding.md) |
| Administration & roles (runbook) | [codebase/docs/administration-and-roles.md](../codebase/docs/administration-and-roles.md) |
| OpenSpec platform change | [openspec/changes/rolling-meadows-platform/](../openspec/changes/rolling-meadows-platform/) |
| UI prototype reference | [Docs/ui/](./ui/) |
| Technical architecture | [TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md) |

**Note:** `openspec/changes/rolling-meadows-platform/design.md` still mentions MongoDB in places; **runtime uses PostgreSQL** — treat [TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md) as the current technical truth.

---

## 3) What was built (for developers / architects)

### Capabilities delivered

| Area | Summary |
|------|---------|
| **Auth** | Email/password JWT; login preview by email; tenant-scoped branding on login for org users |
| **Platform admin** | Tenant CRUD/lifecycle, per-tenant configure, locale/label catalogue, org-admin user create with branding |
| **Org admin** | Tenant-scoped user CRUD (operational roles); list filtered by `created_by` |
| **Branding** | Tenant logos on disk (`branding` volume); CSS variables via `applyBranding`; nginx `/branding/` proxy in dev |
| **i18n** | Static `en`/`es` bundles + DB-backed translations; platform admin manages master catalogue |
| **Operations** | Cases, clients, documents, workflow, services, reports (API-backed; UI migrated incrementally from prototype) |
| **Deploy** | `package.bat`, `deploy.sh`, prod compose, base path `/rolling-meadows` |

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| FastAPI + PostgreSQL instead of Express + MongoDB (ADR-0017) | Team delivery standard; relational model for users/tenants/i18n |
| JWT in `sessionStorage` | SPA-friendly; stateless API |
| `tenant_id` from token only on data APIs | Tenant isolation (ADR-0006) |
| Super admin restricted to `/platform/*` | Prevents cross-tenant operational access |
| Org admin user list by `created_by` | Product rule: admins manage only users they created |
| First tenant user is `organization_admin` (not `tenant_admin`) | CR-2026-002; simplifies hierarchy |
| Single production container (SPA + API mount) | Simpler edge routing at `/rolling-meadows` |

### Patterns considered

| Pattern | Choice |
|---------|--------|
| Modular monolith | **Chosen** — one deployable API with module flags |
| Layered routers → services | **Chosen** |
| Repository-style SQLAlchemy models | **Chosen** |
| Microservices | **Rejected** for current phase |
| Event-driven domain | **Rejected** for admin/auth slice |

Detail: [TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md).

---

## 4) QA validation guide (for QAs)

### Demo credentials

Password: `ChangeMe123!` (or `SEED_USER_PASSWORD` in `.env`).

| Email | Role | What to verify |
|-------|------|----------------|
| `platform.admin@demo.rmhs.app` | Super admin | CommunityOne login; Tenants + Locale labels + Users; no `/admin/users` |
| `org.admin@demo.rmhs.app` | Org admin | RMHS branding on login; Users shows staff only (not self as row to manage) |
| `case.manager@demo.rmhs.app` | Case manager | No Administration module; cases/clients work |

Full checklist: [codebase/docs/administration-and-roles.md](../codebase/docs/administration-and-roles.md).

### Manual test flow (admin slice)

1. Rebuild: `cd codebase && docker compose build web api && docker compose up -d`
2. Super admin → create tenant draft → configure branding → activate (readiness requires org admin)
3. Super admin → Users → create org admin with colors → sign in as that email → confirm colors on login
4. Org admin → Users → create case manager → list shows new user only (not org admin)
5. Locale labels → edit a key → confirm UI refresh behavior (translation bundle)

### Edge / failure cases

- Suspended tenant: sign-in blocked (verify message)
- Platform admin navigating to `/dashboard` → redirect to `/platform/tenants`
- Org admin cannot assign `organization_admin` or `tenant_admin` in create dropdown
- Email already registered → 409 on create

### Known limitations

- `tenant.admin@demo.rmhs.app` retired (inactive if row exists); do not use in test plans
- Mock auth mode (`VITE_USE_MOCK_AUTH=true`) diverges from API rules — use API mode for admin QA
- OpenAPI may lag newest admin fields; verify against running `/api/docs` when in doubt
- No automated regression suite documented for CR-2026-002 at handover time

---

## 5) Evidence and quality gates

| Gate | Status at handover |
|------|---------------------|
| CI / PR checks | Run per team pipeline (not re-run for this document) |
| Unit/API tests | Partial coverage in `codebase/api`; extend for `created_by` filters |
| OpenAPI contract | [openapi.yaml](./openapi.yaml) — spot-check platform/admin routes |
| Security | Role guards on routers; bcrypt passwords; generic login errors |
| Observability | `x-correlation-id` on API responses; no dedicated dashboards in scope |

---

## 6) Ops notes (for SREs / devs)

### Configuration (common)

| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL async URL |
| `JWT_SECRET` | **Required in production** |
| `SEED_USER_PASSWORD` | Demo user password |
| `DEFAULT_TENANT_ID` | Seed tenant (`tenant-rolling-meadows`) |
| `API_ENABLED_MODULES` | Comma-separated router modules |
| `CORS_ORIGINS` | Web origins |
| `BASE_PATH` / `API_MOUNT_PATH` | Production subpath (`/rolling-meadows`, `/rolling-meadows/api`) |

Branding files: Docker volume `branding_data` (local compose) or equivalent in prod.

### Schema changes (no Alembic yet)

On API startup, `init_db()` runs `create_all` plus:

- `users.created_by` (VARCHAR) — **required for org-admin user scoping**
- Tenant timestamp columns if missing

Seed routine `_backfill_created_by()` sets demo `created_by` and deactivates legacy tenant admin.

### Rollout

1. Build and push image (`package.bat` or CI)
2. Run `deploy.sh` on server with updated `.env`
3. Restart API once so migrations + backfill run
4. Rebuild **web** if only UI changed

### Rollback

- Revert to previous Docker image tag
- DB: `created_by` column is additive — old code ignores it; org-admin list may show wider results until rolled forward again
- No feature flag for CR-2026-002; rollback is deploy revert

---

## 7) Risks, open questions, and follow-ups

| Item | Owner | Notes |
|------|-------|-------|
| OpenAPI sync with platform user/branding payloads | Dev | Update `Docs/openapi.yaml` |
| Alembic migrations vs `init_db` patches | Architect | Long-term DB governance |
| E2E tests for admin flows | QA | Playwright/Cypress recommended |
| MFA / IdP | Product | Phase 2 per FSD |
| Tenant translation overrides UI | Product | Overrides API exists; org admin has no labels menu by design |
| Align OpenSpec design.md with PostgreSQL | Dev | Doc debt |

---

## 8) Repository map (quick)

```
rolling-meadows/
├── Docs/                    # Specs, handover, architecture, UI prototype
├── openspec/                # Change proposals and design
└── codebase/
    ├── api/                 # FastAPI application
    ├── web/                 # React SPA
    ├── docker-compose.yml   # Local stack
    ├── docker-compose.prod.yml
    └── docs/                # Runbooks (administration-and-roles)
```

---

## 9) Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Product | | | |
| QA | | | |
| Engineering | | | Handover doc generated 2026-09-18 |

---

*End of handover document.*

# Tasks: Rolling Meadows Platform

## seed-00-bootstrap — Docker scaffold ✅

- [x] Clone scaffold into `codebase/`
- [x] Replace Express API with FastAPI (`codebase/api/`)
- [x] Initialize React + Vite in `codebase/web/`
- [x] Docker Compose: web + api + mongo
- [x] Document stack in `design.md` (ADR-0017 exception)

## seed-02-auth-rbac — Login integration ✅

- [x] `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- [x] MongoDB user seed (prototype-aligned roles)
- [x] React LoginPage + AuthContext + protected routes
- [x] Role-based landing paths per BRD §5.2

## seed-04-client-dedup — Client management ✅

- [x] Client CRUD, dedup-check, duplicate queue, merge
- [x] React: register, search, profile, duplicates admin
- [x] Demo client seed data

## seed-05-case-core — Case lifecycle core ✅

- [x] Case category catalogue + workflow preview
- [x] POST/GET cases, workspace, intake
- [x] React: case creation, search, workspace (intake tab)

## seed-06-risk-care-services — Workspace stage tabs ✅

- [x] Risk assessment scoring (BR-RISK-01, prototype calcComposite)
- [x] Care plan items, enrollments, CBO referrals
- [x] Follow-up notes + cadence (High 7d / Medium 30d / Low 90d)
- [x] Reassessment + closure
- [x] Stage evidence drives workflow stepper
- [x] React CaseStageTabs for all workspace tabs

## seed-07-assignment — Case ownership ✅

- [x] Initial assignment on case create
- [x] `PATCH /cases/{id}/assignment` (supervisor)
- [x] `POST /cases/{id}/assign-to-me` (workflow hub handoff)
- [x] Assignment history in activity tab + MongoDB `assignment_history`

## seed-08-services-hub — Bulk enrollment ✅

- [x] `GET /catalog/events` — event catalog
- [x] `POST /enrollments/bulk`
- [x] React Services Hub + Bulk Enrollment pages

## seed-09-documents — Document vault ✅

- [x] `GET/POST /documents` — list, upload (512KB), external links
- [x] Documents tab in workspace + Documents Hub page
- [ ] Object storage backend (S3/Azure) — deferred pre go-live (gap O2)

## seed-10-reports — Self-service reporting ✅

- [x] Report catalog (6 built-in reports from prototype)
- [x] `GET /reports/{id}` — run report (chart/table data)
- [x] React Reports page

## seed-11-liaison — Cross-program lookup ✅

- [x] `GET /liaison/lookup` — restricted contact lookup
- [x] React Liaison Lookup page (replaces placeholder)

## seed-01-platform-tenancy — Platform console (minimal) ✅

- [x] Tenant record seeded with demo users
- [x] `GET /platform/tenants` — platform admin API stub
- [ ] Full platform console UI + provisioning — deferred

## seed-03-tenant-admin — Tenant administration (deferred)

- [ ] User lifecycle UI, program config — BRD scope, not in prototype v1

## seed-12-i18n — Internationalization (deferred)

- [ ] English/Spanish locale switching — prototype has i18n keys; production deferred

## Validation

```bash
cd codebase
docker compose up --build
# Web: http://localhost:8081
# API: http://localhost:8000/docs
```

### Smoke test flow

1. Login as `case.manager@demo.rmhs.app` / `ChangeMe123!`
2. Open case C-2026-001 → complete risk → care plan → enroll → note
3. Workflow Hub shows caseload board
4. Login as `liaison@demo.rmhs.app` → search "Mary"
5. Login as `auditor@demo.rmhs.app` → run reports

## Evidence required

- Docker compose builds successfully
- Full 8-stage workspace functional through closure
- Assignment history recorded on handoff
- Liaison lookup returns CM contact without case detail
- Reports return aggregated data

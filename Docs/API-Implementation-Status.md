# Rolling Meadows — API Implementation Status (PostgreSQL)

| Field | Value |
|-------|--------|
| **Document ID** | API-IMPL-2026-001 |
| **Status** | Active — updated as modules are migrated |
| **Date** | 8 September 2026 |
| **Stack** | React + FastAPI + **PostgreSQL 16** (modular rollout) |
| **Related** | `Docs/API-Complete-Catalogue.md` (API-CAT-2026-001), `Docs/Tenant-Login-Admin-Change-Request.md` (CR-2026-001) |

---

## 1. Summary

The backend is being rebuilt **module by module** on PostgreSQL. Legacy routers (MongoDB) remain in the codebase but are **not registered** in the active API until each module is migrated.

| Metric | Count |
|--------|-------|
| **Live on PostgreSQL (enabled)** | **76** endpoints |
| **Legacy MongoDB** | Removed — PostgreSQL only |
| **Planned (not built)** | 12 (see API-CAT §17) |
| **App version** | 0.3.0 |
| **Default modules** | `health,auth,admin,platform,clients,catalog,cases,enrollments,liaison,workflow,documents,reports` |

**Local URLs**

- API: `http://localhost:8000`
- Web (proxied): `http://localhost:8081/api`

**Docker env:** `API_ENABLED_MODULES=health,auth,admin,platform,clients,catalog,cases,enrollments,liaison,workflow,documents,reports` in `codebase/docker-compose.yml`

---

## 2. Architecture

```
React (VITE_USE_MOCK_AUTH=false)
        │
        ▼
  nginx /api → FastAPI
        │
        ├── health   ✅ PostgreSQL
        ├── auth     ✅ PostgreSQL
        ├── admin    ✅ PostgreSQL (full tenant admin)
        ├── platform ✅ PostgreSQL
        ├── clients  ✅ PostgreSQL
        ├── catalog  ✅ PostgreSQL
        ├── cases    ✅ PostgreSQL
        ├── enrollments ✅ PostgreSQL
        ├── liaison    ✅ PostgreSQL
        ├── workflow   ✅ PostgreSQL
        ├── documents  ✅ PostgreSQL
        ├── reports    ✅ PostgreSQL
        │
        └── (planned) dashboard homepage ⏳
```

**Database:** SQLAlchemy 2.0 async + asyncpg  
**Tables (PostgreSQL):** `tenants`, `users`, `translation_locales`, `translation_entries`, `platform_settings`, `admin_audit_log`, `clients`, `case_categories`, `case_subcategories`, `workflow_definitions`, `workflow_stages`, `catalog_events`, `cases`, `case_referrals`, `case_intakes`, `risk_assessments`, `care_plan_items`, `service_enrollments`, `cbo_referrals`, `case_notes`, `reassessments`, `case_closures`, `assignment_history`, `case_audit_log`, `documents`, `custom_reports`

---

## 3. Completed modules (PostgreSQL)

### 3.1 Health — ✅ Complete

| Status | Method | Path | operationId | Auth | Notes |
|--------|--------|------|-------------|------|-------|
| ✅ | GET | `/health` | getHealth | No | Includes `databaseOk`, `database: postgres`, enabled `modules` |

**Frontend:** N/A (ops / monitoring)

---

### 3.2 Auth — ✅ Complete

| Status | Method | Path | operationId | Auth | Notes |
|--------|--------|------|-------------|------|-------|
| ✅ | POST | `/auth/login` | login | No | Email + password; role from user record |
| ✅ | GET | `/auth/me` | getCurrentUser | Yes | Bearer JWT |
| ✅ | POST | `/auth/change-password` | changePassword | Yes | |
| ✅ | POST | `/auth/logout` | logout | Yes | 204 No Content |
| ✅ | GET | `/auth/locales` | listAuthLocales | No | Login language menu |
| ✅ | GET | `/auth/translations/bundle/{locale}` | getAuthTranslationBundle | No | Pre-auth UI strings (EN seeded) |

**Changes from original catalogue**

- `organizationCode` is optional on login (not required in UI).
- New role **`organization_admin`** supported in JWT and seed data.

**Frontend:** ✅ Login page uses API (`VITE_USE_MOCK_AUTH=false`). Role comes from API, not a role picker.

**Seed users (password `ChangeMe123!`):**

| Email | Role | Landing path |
|-------|------|--------------|
| `platform.admin@demo.rmhs.app` | platform_admin | `/platform/tenants` |
| `tenant.admin@demo.rmhs.app` | tenant_admin | `/admin` |
| `org.admin@demo.rmhs.app` | organization_admin | `/dashboard` |
| `case.manager@demo.rmhs.app` | case_manager | `/cases/new` |
| `supervisor@demo.rmhs.app` | supervisor | `/cases/new` |
| `liaison@demo.rmhs.app` | cross_program_liaison | `/liaison` |
| `auditor@demo.rmhs.app` | auditor | `/reports` |

---

### 3.3 Admin (tenant scope) — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | GET | `/admin/dashboard` | adminDashboard | Yes | tenant_admin, organization_admin |
| ✅ | GET | `/admin/users` | listAdminUsers | Yes | tenant_admin, organization_admin |
| ✅ | POST | `/admin/users` | createAdminUser | Yes | tenant_admin, organization_admin (role limits apply) |
| ✅ | PATCH | `/admin/users/{userId}` | updateAdminUser | Yes | tenant_admin, organization_admin |
| ✅ | DELETE | `/admin/users/{userId}` | deleteAdminUser | Yes | tenant_admin, organization_admin |
| ✅ | GET | `/admin/config` | getTenantConfig | Yes | tenant_admin, organization_admin |
| ✅ | PATCH | `/admin/config` | updateTenantConfig | Yes | tenant_admin, organization_admin |
| ✅ | GET | `/admin/translations` | listAdminTranslations | Yes | Full key catalogue with all locale columns (`q`, `limit`, `offset`) |
| ✅ | GET | `/admin/locales` | listAdminLocales | Yes | tenant_admin, organization_admin |
| ✅ | POST | `/admin/locales` | createAdminLocale | Yes | Register new language |
| ✅ | PATCH | `/admin/translations` | patchAdminTranslation | Yes | Upsert platform translation value |
| ✅ | GET | `/admin/translations/export` | exportAdminTranslations | Yes | Full Excel export (all keys × locales + Locales sheet) |
| ✅ | POST | `/admin/translations/import` | importAdminTranslations | Yes | Excel import; updates DB and runtime bundles |
| ✅ | GET | `/admin/translations/overrides` | listTranslationOverrides | Yes | Legacy tenant override list |
| ✅ | PATCH | `/admin/translations/overrides` | patchTranslationOverride | Yes | Legacy tenant override upsert |
| ✅ | GET | `/admin/translations/overrides/export` | exportTranslationOverrides | Yes | Tenant override keys only |
| ✅ | POST | `/admin/translations/overrides/import` | importTranslationOverrides | Yes | Tenant override import |
| ✅ | GET | `/admin/audit-log` | getAdminAuditLog | Yes | tenant_admin, organization_admin |
| ✅ | GET | `/admin/translations/bundle/{locale}` | getTenantTranslationBundle | Yes | Any authenticated tenant user |

**User creation**

- Request includes **`password`** (min 8 chars); no default-password-only flow.
- **Tenant admin** can assign: `organization_admin`, `supervisor`, `case_manager`, `cross_program_liaison`, `auditor`.
- **Organization admin** can assign operational roles only (not another org/tenant admin).
- Deactivation blocked when user has open owned cases (`400 open_cases`).

**Audit:** Tenant-scoped actions logged to `admin_audit_log`.

**Frontend:** ✅ Admin dashboard, users, config, **Labels & Languages** (full catalogue table, pagination, add language, Excel export/import), and audit pages wired to API when `VITE_USE_MOCK_AUTH=false`.

**Translation catalogue:** ~2,057 keys from `en.json` master; values merged from PostgreSQL + static locale JSON at runtime. ES seeded on fresh install; import applies changes immediately via API bundles.

---

### 3.4 Clients — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | GET | `/clients` | listClients | Yes | Not liaison/auditor; `?q=` search |
| ✅ | POST | `/clients` | createClient | Yes | Not liaison/auditor/tenant_admin; 409 on duplicate |
| ✅ | POST | `/clients/dedup-check` | checkClientDuplicates | Yes | |
| ✅ | GET | `/clients/duplicates` | listDuplicatePairs | Yes | supervisor, tenant_admin, **organization_admin** |
| ✅ | POST | `/clients/merge` | mergeClients | Yes | supervisor, tenant_admin, **organization_admin** |
| ✅ | GET | `/clients/{clientId}` | getClient | Yes | Not liaison/auditor |

**Seed clients (tenant `tenant-rolling-meadows`):**

| ID | Name |
|----|------|
| `cli-mary-smith` | Mary Smith |
| `cli-john-davis` | John Davis |
| `cli-maria-garcia` | Maria Garcia |

**Frontend:** ✅ Client Search, Registration, Profile, Duplicate Detection wired to API.

---

### 3.5 Catalog — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Notes |
|--------|--------|------|-------------|------|-------|
| ✅ | GET | `/catalog/case-categories` | listCaseCategories | No | 4 categories, 12 subcategories (seeded) |
| ✅ | GET | `/catalog/workflows/{subcategoryId}` | getWorkflowForSubcategory | No | Returns default workflow if subcategory unknown |
| ✅ | GET | `/catalog/events` | listEvents | No | 8 service/event items (seeded) |

**PostgreSQL tables:** `case_categories`, `case_subcategories`, `workflow_definitions`, `workflow_stages`, `catalog_events`

**Seed data:** Loaded from `app/catalog/*.py` on startup when tables are empty.

**Frontend:** ✅ Case Creation page loads workflow preview via API when `VITE_USE_MOCK_AUTH=false`. Categories/events API client ready (`catalogApi`, `eventsApi`).

---

### 3.6 Cases — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | GET | `/cases` | listCases | Yes | case_manager, supervisor, tenant_admin, **organization_admin** |
| ✅ | POST | `/cases` | createCase | Yes | Same; case_manager auto-assigned to self |
| ✅ | GET | `/cases/{caseId}/workspace` | getCaseWorkspace | Yes | Same; caseload check for case_manager |
| ✅ | PUT | `/cases/{caseId}/intake` | saveCaseIntake | Yes | Same |
| ✅ | PUT | `/cases/{caseId}/risk` | saveCaseRisk | Yes | Same |
| ✅ | POST | `/cases/{caseId}/care-plan-items` | addCarePlanItem | Yes | Same |
| ✅ | POST | `/cases/{caseId}/care-plan-items/{itemId}/void` | voidCarePlanItem | Yes | Same |
| ✅ | POST | `/cases/{caseId}/enrollments` | addEnrollment | Yes | Same |
| ✅ | POST | `/cases/{caseId}/cbo-referrals` | addCboReferral | Yes | Same |
| ✅ | POST | `/cases/{caseId}/notes` | addCaseNote | Yes | Same |
| ✅ | POST | `/cases/{caseId}/notes/{noteId}/void` | voidCaseNote | Yes | Same |
| ✅ | POST | `/cases/{caseId}/reassessments` | addReassessment | Yes | Same |
| ✅ | POST | `/cases/{caseId}/closure` | closeCase | Yes | Same |
| ✅ | PATCH | `/cases/{caseId}/assignment` | assignCase | Yes | supervisor, tenant_admin, **organization_admin** |
| ✅ | POST | `/cases/{caseId}/assign-to-me` | assignCaseToMe | Yes | supervisor, case_manager, tenant_admin, **organization_admin** |

**Features**

- Full **CaseWorkspace** response (workflow stages, evidence, activity, assignment history).
- Stage progression computed from evidence (intake → assessment → risk → care plan → services → follow-up → reassessment → closure).
- Per-case audit trail in `case_audit_log`.
- Documents included in CaseWorkspace evidence via `documents` table.

**Seed case (tenant `tenant-rolling-meadows`):**

| ID | Client | Case # | Manager |
|----|--------|--------|---------|
| `case-mary-smith-senior` | Mary Smith | `C-2026-001` | `case.manager@demo.rmhs.app` |

**Frontend:** ✅ Case creation, search, workspace (all stage tabs), client profile case list, and document vault wired to API when `VITE_USE_MOCK_AUTH=false`.

---

### 3.7 Enrollments — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | POST | `/enrollments/bulk` | bulkEnroll | Yes | case_manager, supervisor, tenant_admin, **organization_admin** |

**Behavior**

- Enrolls multiple cases into one catalog service/event (`serviceOrEventId` validated against `catalog_events`).
- Skips cases already enrolled, closed cases, and cases outside a case manager's caseload.
- Writes audit entry on success; reuses `service_enrollments` table from cases module.

**Frontend:** ✅ Bulk Service Allocation page wired to API (`eventsApi.bulkEnroll`). Per-case enroll remains on `POST /cases/{caseId}/enrollments` (cases module).

---

### 3.8 Liaison — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | GET | `/liaison/lookup?q=` | liaisonLookup | Yes | cross_program_liaison, supervisor, tenant_admin |

**Frontend:** ✅ Liaison Lookup page wired to API (`liaisonApi.lookup`).

---

### 3.9 Workflow — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | GET | `/workflow/board` | getWorkflowBoard | Yes | case_manager, supervisor, tenant_admin |

**Frontend:** ✅ Workflow Hub page wired to API (`workflowApi.board`).

---

### 3.10 Documents — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | GET | `/documents?caseId=` | listDocuments | Yes | case_manager, supervisor, tenant_admin, organization_admin |
| ✅ | POST | `/documents/link` | addDocumentLink | Yes | same |
| ✅ | POST | `/documents/upload` | uploadDocument | Yes | same (512 KB max, base64) |

**Frontend:** ✅ Document vault panel wired to API (`documentsApi.list/upload/addLink`).

---

### 3.11 Reports — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | GET | `/reports/catalog` | listReports | Yes | supervisor, case_manager, auditor, tenant_admin |
| ✅ | GET | `/reports/tier/{tierName}` | getReportTier | Yes | same (executive, operational, integrity) |
| ✅ | GET | `/reports/caseload` | getCaseloadReports | Yes | same |
| ✅ | GET | `/reports/{reportId}` | runReport | Yes | same (6 built-in reports) |
| ✅ | GET | `/reports/custom` | listCustomReports | Yes | supervisor, case_manager |
| ✅ | GET | `/reports/custom/{id}` | getCustomReport | Yes | supervisor, case_manager |
| ✅ | POST | `/reports/custom` | createCustomReport | Yes | supervisor, case_manager |
| ✅ | PUT | `/reports/custom/{id}` | saveCustomReport | Yes | supervisor, case_manager |
| ✅ | POST | `/reports/custom/preview` | previewCustomReport | Yes | supervisor, case_manager |

**Notes:** Report analytics reuse existing service layer via `PostgresReportDb` adapter (`app/services/report_db_adapter.py`). Custom reports persisted in `custom_reports` table.

**Frontend:** ✅ Caseload/Executive/Operational/Integrity tier pages, Custom Reports, and Report Builder wired to API when `VITE_USE_MOCK_AUTH=false`.

---

### 3.12 Platform admin — ✅ Complete (PostgreSQL)

| Status | Method | Path | operationId | Auth | Role constraint |
|--------|--------|------|-------------|------|-----------------|
| ✅ | GET | `/platform/tenants` | listTenants | Yes | platform_admin |
| ✅ | POST | `/platform/tenants` | createTenant | Yes | platform_admin |
| ✅ | GET | `/platform/tenants/{tenantId}` | getTenant | Yes | platform_admin |
| ✅ | PATCH | `/platform/tenants/{tenantId}` | updateTenant | Yes | platform_admin |
| ✅ | GET | `/platform/tenants/{tenantId}/readiness` | tenantReadiness | Yes | platform_admin |
| ✅ | POST | `/platform/tenants/{tenantId}/activate` | activateTenant | Yes | platform_admin |
| ✅ | POST | `/platform/tenants/{tenantId}/suspend` | suspendTenant | Yes | platform_admin |
| ✅ | GET | `/platform/settings` | getPlatformSettings | Yes | platform_admin |
| ✅ | PATCH | `/platform/settings` | updatePlatformSettings | Yes | platform_admin |
| ✅ | GET | `/platform/locales` | listLocales | Yes | platform_admin |
| ✅ | POST | `/platform/locales` | createLocale | Yes | platform_admin |
| ✅ | GET | `/platform/translations` | listTranslations | Yes | platform_admin |
| ✅ | PATCH | `/platform/translations` | patchTranslation | Yes | platform_admin |
| ✅ | GET | `/platform/translations/export` | exportTranslations | Yes | platform_admin |
| ✅ | POST | `/platform/translations/import` | importTranslations | Yes | platform_admin |
| ✅ | GET | `/platform/translations/bundle/{locale}` | getTranslationBundle | No | Public read |

**Notes:** Tenant provisioning creates draft tenant + tenant admin user (seed password). XLSX import/export via `openpyxl`. Platform audit entries stored in `admin_audit_log` with `tenant_id = null`.

**Frontend:** ✅ Platform Tenants, Settings, and Translations pages wired to API when `VITE_USE_MOCK_AUTH=false`.

---

## 4. Pending modules (not enabled)

All catalogue modules through platform and tenant admin are now on PostgreSQL. Remaining work is **planned APIs** (§17) only — e.g. `/dashboard`, `/admin/programs`, `/platform/audit-log`.

---

## 5. Planned APIs (never built)

Unchanged from `Docs/API-Complete-Catalogue.md` §17 — e.g. `/dashboard`, `/admin/programs`, `/auth/refresh`, MFA, support access.

---

## 6. Frontend integration matrix

| UI area | PostgreSQL API | Web status |
|---------|----------------|------------|
| Login / session | ✅ auth | ✅ API |
| Language on login | ✅ auth/locales | ✅ API |
| Platform admin | ✅ platform | ✅ API |
| Tenant admin — users | ✅ admin/users | ✅ API |
| Tenant admin — dashboard/config/labels/audit | ✅ admin | ✅ API |
| Client search | ✅ clients | ✅ API |
| Client registration | ✅ clients | ✅ API |
| Client profile | ✅ clients + cases | ✅ API |
| Duplicate detection | ✅ clients | ✅ API |
| Case creation | ✅ catalog + cases | ✅ API |
| Case search | ✅ cases | ✅ API |
| Case workspace (all stages) | ✅ cases | ✅ API |
| Bulk service allocation | ✅ enrollments | ✅ API |
| Reports (all tiers + custom) | ✅ reports | ✅ API |
| Documents | ✅ documents | ✅ API |
| Workflow board | ✅ workflow | ✅ API |
| Liaison lookup | ✅ liaison | ✅ API |
| Dashboard homepage | ⏳ (P7) | Mock |

---

## 7. How to test completed APIs

### 7.1 Start stack

```powershell
cd c:\projects\Foundry\rolling-meadows\codebase
docker compose up -d postgres api web
```

### 7.2 Health

```powershell
curl.exe http://localhost:8000/health
```

Expected: `"databaseOk": true`, `"modules"` includes all enabled modules including `platform` and `admin`.

### 7.3 Login + clients (PowerShell)

```powershell
$login = Invoke-RestMethod -Uri http://localhost:8000/auth/login -Method POST `
  -Body (@{ email = "org.admin@demo.rmhs.app"; password = "ChangeMe123!" } | ConvertTo-Json) `
  -ContentType "application/json"

Invoke-RestMethod -Uri http://localhost:8000/clients `
  -Headers @{ Authorization = "Bearer $($login.accessToken)" }
```

### 7.4 Catalog (no auth required)

```powershell
Invoke-RestMethod -Uri http://localhost:8000/catalog/case-categories
Invoke-RestMethod -Uri http://localhost:8000/catalog/workflows/sub-seniors-at-risk
Invoke-RestMethod -Uri http://localhost:8000/catalog/events
```

### 7.5 Cases (authenticated)

```powershell
$login = Invoke-RestMethod -Uri http://localhost:8000/auth/login -Method POST `
  -Body (@{ email = "case.manager@demo.rmhs.app"; password = "ChangeMe123!" } | ConvertTo-Json) `
  -ContentType "application/json"
$h = @{ Authorization = "Bearer $($login.accessToken)" }

Invoke-RestMethod -Uri http://localhost:8000/cases -Headers $h
Invoke-RestMethod -Uri http://localhost:8000/cases -Method POST -Headers $h `
  -Body (@{ clientId = "cli-john-davis"; categoryId = "cat-senior-services"; subcategoryId = "sub-seniors-at-risk" } | ConvertTo-Json) `
  -ContentType "application/json"
```

### 7.6 Web UI

Open `http://localhost:8081/login` → sign in as case manager → **Cases → New** (create from linked client) or view Mary Smith's case on client profile.

### 7.7 Swagger

`http://localhost:8000/docs` — lists only **enabled** modules.

---

## 8. Implementation log

| Date | Module | Change |
|------|--------|--------|
| 2026-09-08 | Foundation | PostgreSQL + modular `API_ENABLED_MODULES`; MongoDB removed from active compose |
| 2026-09-08 | health | DB connectivity check |
| 2026-09-08 | auth | JWT login, locales, translation bundle, seed users/tenants |
| 2026-09-08 | auth (UI) | Email/password login; role from API |
| 2026-09-08 | admin | Users CRUD on PostgreSQL; `organization_admin` role |
| 2026-09-08 | admin | User create with password; DELETE user |
| 2026-09-08 | clients | Full client module on PostgreSQL + UI wiring |
| 2026-09-08 | catalog | Categories, workflows, events on PostgreSQL + seed |
| 2026-09-08 | cases | Full case module (15 endpoints) on PostgreSQL + seed |
| 2026-09-08 | cases (UI) | Case search + workspace stage tabs wired to API |
| 2026-09-08 | enrollments | Bulk enroll on PostgreSQL + UI wiring |
| 2026-09-08 | liaison | Liaison lookup on PostgreSQL + UI wiring |
| 2026-09-08 | workflow | Workflow board on PostgreSQL + UI wiring |
| 2026-09-08 | documents | Document vault (list/upload/link) on PostgreSQL + UI wiring |
| 2026-09-08 | reports | Full reports module (9 endpoints) on PostgreSQL + tier/custom UI wiring |
| 2026-09-08 | admin | Dashboard, config, translation overrides, audit log on PostgreSQL |
| 2026-09-08 | platform | Full platform admin module (16 endpoints) on PostgreSQL |

---

## 9. Next recommended module

**Dashboard homepage** (`GET /dashboard`) and **catalog admin** endpoints (`/admin/programs`, `/admin/workflows`, `/admin/service-events`) from API-CAT §17.

---

## 10. Sign-off

| # | Item | Status |
|---|------|--------|
| I1 | Health + Auth on PostgreSQL | ✅ Done |
| I2 | Admin users on PostgreSQL | ✅ Done |
| I3 | Clients on PostgreSQL | ✅ Done |
| I6 | Catalog on PostgreSQL | ✅ Done |
| I7 | Cases on PostgreSQL | ✅ Done |
| I8 | Enrollments on PostgreSQL | ✅ Done |
| I9 | Liaison + Workflow + Documents + Reports on PostgreSQL | ✅ Done |
| I10 | Platform + full Tenant Admin on PostgreSQL | ✅ Done |
| I4 | OpenAPI sync for 76 live routes | ⏳ Pending |
| I5 | Update API-CAT-2026-001 master index for Postgres + org admin | ⏳ Pending |

**Reviewed by:** _______________  
**Date:** _______________

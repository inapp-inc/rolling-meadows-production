# Rolling Meadows — Complete API Catalogue

| Field | Value |
|-------|--------|
| **Document ID** | API-CAT-2026-001 |
| **Status** | Draft — pending product/architect confirmation |
| **Date** | 8 September 2026 |
| **Purpose** | A–Z inventory of all REST APIs (implemented + planned) with request/response shapes before full OpenAPI sync and web integration |
| **Canonical contract (partial)** | `Docs/openapi.yaml` (v0.1.0 — **16 of 72 routes documented**) |
| **Related** | `Docs/Tenant-Login-Admin-Change-Request.md` (CR-2026-001), `Docs/FSD-Rolling-Meadows.md` |

---

## 1. How to use this document

1. **Review the master index (§3)** — confirm the endpoint list is complete for your scope.
2. **Review payloads per domain (§4–§16)** — confirm field names and shapes match product expectations.
3. **Review gaps (§17–§18)** — planned APIs not yet built; UI areas still on mock data.
4. **Sign off in §19** — after confirmation, next step is updating `Docs/openapi.yaml` and wiring remaining React pages to API.

**Base URL (production):** `https://foundry.inapp.com/rolling-meadows/api`  
**Base URL (local Docker):** `http://localhost:8000`  
**Web proxy (local):** `http://localhost:8081/api` → API

---

## 2. Global conventions

### 2.1 Authentication

| Item | Rule |
|------|------|
| Scheme | Bearer JWT (`Authorization: Bearer <accessToken>`) |
| Issued by | `POST /auth/login` |
| Claims | `sub` (user id), `tenant_id`, `role`, `exp` |
| Tenant isolation | All data queries use `tenant_id` from JWT/user document — **never from client body** |

### 2.2 Headers

| Header | Required | Purpose |
|--------|----------|---------|
| `Authorization` | Yes (except public routes) | Bearer token |
| `Content-Type` | Yes for JSON bodies | `application/json` |
| `x-correlation-id` | Optional | Request tracing; echoed in response/errors |

### 2.3 Error response shape

```json
{
  "detail": {
    "error": "invalid_credentials",
    "message": "Invalid email or password"
  }
}
```

HTTP status codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `422` Pydantic validation.

### 2.4 Naming

- JSON fields: **camelCase** in API responses (Python stores snake_case in MongoDB).
- Path params: snake_case in FastAPI (`case_id`) — clients may use same in URL.

### 2.5 Roles

| Role | Code |
|------|------|
| Platform Administrator | `platform_admin` |
| Tenant Administrator | `tenant_admin` |
| Supervisor | `supervisor` |
| Case Manager | `case_manager` |
| Cross-Program Liaison | `cross_program_liaison` |
| Auditor | `auditor` |

---

## 3. Master API index (74 implemented)

| # | Method | Path | operationId | Auth | Role constraint |
|---|--------|------|-------------|------|-----------------|
| **Health** |
| 1 | GET | `/health` | getHealth | No | — |
| **Auth** |
| 2 | POST | `/auth/login` | login | No | — |
| 3 | GET | `/auth/me` | getCurrentUser | Yes | Any active user |
| 4 | POST | `/auth/change-password` | changePassword | Yes | Any active user |
| 5 | POST | `/auth/logout` | logout | Yes | Any active user |
| 6 | GET | `/auth/locales` | listAuthLocales | **No** | Public — login language menu |
| 7 | GET | `/auth/translations/bundle/{locale}` | getAuthTranslationBundle | **No** | Public — pre-auth UI strings |
| **Clients** |
| 8 | GET | `/clients` | listClients | Yes | Not liaison/auditor |
| 7 | POST | `/clients` | createClient | Yes | Not liaison/auditor/tenant_admin |
| 8 | POST | `/clients/dedup-check` | checkClientDuplicates | Yes | Not liaison/auditor |
| 9 | GET | `/clients/duplicates` | listDuplicatePairs | Yes | supervisor, tenant_admin |
| 10 | POST | `/clients/merge` | mergeClients | Yes | supervisor, tenant_admin |
| 11 | GET | `/clients/{clientId}` | getClient | Yes | Not liaison/auditor |
| **Catalog** |
| 12 | GET | `/catalog/case-categories` | listCaseCategories | No | — |
| 13 | GET | `/catalog/workflows/{subcategoryId}` | getWorkflowForSubcategory | No | — |
| 14 | GET | `/catalog/events` | listEvents | No | — |
| **Cases** |
| 15 | GET | `/cases` | listCases | Yes | case_manager, supervisor, tenant_admin |
| 16 | POST | `/cases` | createCase | Yes | case_manager, supervisor, tenant_admin |
| 17 | GET | `/cases/{caseId}/workspace` | getCaseWorkspace | Yes | case_manager, supervisor, tenant_admin |
| 18 | PUT | `/cases/{caseId}/intake` | saveCaseIntake | Yes | case_manager, supervisor, tenant_admin |
| **Case stages** |
| 19 | PUT | `/cases/{caseId}/risk` | saveCaseRisk | Yes | case_manager, supervisor, tenant_admin |
| 20 | POST | `/cases/{caseId}/care-plan-items` | addCarePlanItem | Yes | case_manager, supervisor, tenant_admin |
| 21 | POST | `/cases/{caseId}/care-plan-items/{itemId}/void` | voidCarePlanItem | Yes | case_manager, supervisor, tenant_admin |
| 22 | POST | `/cases/{caseId}/enrollments` | addEnrollment | Yes | case_manager, supervisor, tenant_admin |
| 23 | POST | `/cases/{caseId}/cbo-referrals` | addCboReferral | Yes | case_manager, supervisor, tenant_admin |
| 24 | POST | `/cases/{caseId}/notes` | addCaseNote | Yes | case_manager, supervisor, tenant_admin |
| 25 | POST | `/cases/{caseId}/notes/{noteId}/void` | voidCaseNote | Yes | case_manager, supervisor, tenant_admin |
| 26 | POST | `/cases/{caseId}/reassessments` | addReassessment | Yes | case_manager, supervisor, tenant_admin |
| 27 | POST | `/cases/{caseId}/closure` | closeCase | Yes | case_manager, supervisor, tenant_admin |
| 28 | PATCH | `/cases/{caseId}/assignment` | assignCase | Yes | supervisor, tenant_admin |
| 29 | POST | `/cases/{caseId}/assign-to-me` | assignCaseToMe | Yes | supervisor, case_manager, tenant_admin |
| **Enrollments** |
| 30 | POST | `/enrollments/bulk` | bulkEnroll | Yes | case_manager, supervisor, tenant_admin |
| **Liaison** |
| 31 | GET | `/liaison/lookup` | liaisonLookup | Yes | cross_program_liaison, supervisor, tenant_admin |
| **Reports** |
| 32 | GET | `/reports/catalog` | listReports | Yes | supervisor, case_manager, auditor, tenant_admin |
| 33 | GET | `/reports/tier/{tierName}` | getReportTier | Yes | supervisor, case_manager, auditor, tenant_admin |
| 34 | GET | `/reports/caseload` | getCaseloadReports | Yes | supervisor, case_manager, auditor, tenant_admin |
| 35 | GET | `/reports/{reportId}` | runReport | Yes | supervisor, case_manager, auditor, tenant_admin |
| 36 | GET | `/reports/custom` | listCustomReports | Yes | supervisor, case_manager |
| 37 | POST | `/reports/custom` | createCustomReport | Yes | supervisor, case_manager |
| 38 | GET | `/reports/custom/{reportId}` | getCustomReport | Yes | supervisor, case_manager |
| 39 | PUT | `/reports/custom/{reportId}` | saveCustomReport | Yes | supervisor, case_manager |
| 40 | POST | `/reports/custom/preview` | previewCustomReport | Yes | supervisor, case_manager |
| **Documents** |
| 41 | GET | `/documents` | listDocuments | Yes | case_manager, supervisor, tenant_admin |
| 42 | POST | `/documents/link` | addDocumentLink | Yes | case_manager, supervisor, tenant_admin |
| 43 | POST | `/documents/upload` | uploadDocument | Yes | case_manager, supervisor, tenant_admin |
| **Workflow** |
| 44 | GET | `/workflow/board` | getWorkflowBoard | Yes | case_manager, supervisor, tenant_admin |
| **Platform admin** |
| 45 | GET | `/platform/tenants` | listTenants | Yes | platform_admin |
| 46 | POST | `/platform/tenants` | createTenant | Yes | platform_admin |
| 47 | GET | `/platform/tenants/{tenantId}` | getTenant | Yes | platform_admin |
| 48 | PATCH | `/platform/tenants/{tenantId}` | updateTenant | Yes | platform_admin |
| 49 | GET | `/platform/tenants/{tenantId}/readiness` | tenantReadiness | Yes | platform_admin |
| 50 | POST | `/platform/tenants/{tenantId}/activate` | activateTenant | Yes | platform_admin |
| 51 | POST | `/platform/tenants/{tenantId}/suspend` | suspendTenant | Yes | platform_admin |
| 52 | GET | `/platform/settings` | getPlatformSettings | Yes | platform_admin |
| 53 | PATCH | `/platform/settings` | updatePlatformSettings | Yes | platform_admin |
| 54 | GET | `/platform/locales` | listLocales | Yes | platform_admin |
| 55 | POST | `/platform/locales` | createLocale | Yes | platform_admin |
| 56 | GET | `/platform/translations` | listTranslations | Yes | platform_admin |
| 57 | PATCH | `/platform/translations` | patchTranslation | Yes | platform_admin |
| 58 | GET | `/platform/translations/export` | exportTranslations | Yes | platform_admin |
| 59 | POST | `/platform/translations/import` | importTranslations | Yes | platform_admin |
| 60 | GET | `/platform/translations/bundle/{locale}` | getTranslationBundle | **No** | Public read |
| **Tenant admin** |
| 61 | GET | `/admin/dashboard` | adminDashboard | Yes | tenant_admin |
| 62 | GET | `/admin/users` | listAdminUsers | Yes | tenant_admin |
| 63 | POST | `/admin/users` | createAdminUser | Yes | tenant_admin |
| 64 | PATCH | `/admin/users/{userId}` | updateAdminUser | Yes | tenant_admin |
| 65 | GET | `/admin/config` | getTenantConfig | Yes | tenant_admin |
| 66 | PATCH | `/admin/config` | updateTenantConfig | Yes | tenant_admin |
| 67 | GET | `/admin/translations/overrides` | listTranslationOverrides | Yes | tenant_admin |
| 68 | PATCH | `/admin/translations/overrides` | patchTranslationOverride | Yes | tenant_admin |
| 69 | GET | `/admin/translations/overrides/export` | exportTranslationOverrides | Yes | tenant_admin |
| 70 | POST | `/admin/translations/overrides/import` | importTranslationOverrides | Yes | tenant_admin |
| 71 | GET | `/admin/audit-log` | getAdminAuditLog | Yes | tenant_admin |
| 72 | GET | `/admin/translations/bundle/{locale}` | getTenantTranslationBundle | Yes | Any user with tenant |

---

## 4. Health

### GET `/health`

**Response 200**
```json
{
  "ok": true,
  "service": "rolling-meadows-api",
  "correlationId": "uuid"
}
```

---

## 5. Auth

### POST `/auth/login`

**Request**
```json
{
  "email": "tenant.admin@demo.rmhs.app",
  "password": "ChangeMe123!",
  "organizationCode": "RMHS"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| email | string (email) | Yes | |
| password | string (min 8) | Yes | |
| organizationCode | string | Conditional | Required when email exists in multiple tenants |

**Response 200**
```json
{
  "accessToken": "eyJ...",
  "tokenType": "bearer",
  "expiresIn": 28800,
  "user": {
    "id": "usr-tenant-admin",
    "email": "tenant.admin@demo.rmhs.app",
    "name": "Tenant Administrator",
    "role": "tenant_admin",
    "tenantId": "tenant-rolling-meadows",
    "programId": null,
    "status": "Active",
    "landingPath": "/admin",
    "tenant": {
      "id": "tenant-rolling-meadows",
      "legalName": "Rolling Meadows Human Services",
      "shortCode": "RMHS",
      "status": "Active",
      "defaultLocale": "en",
      "enabledLocales": ["en", "es"],
      "displayName": "Rolling Meadows Human Services"
    }
  }
}
```

**Errors:** `401` invalid credentials · `403` tenant suspended/draft/offboarded · `400` organization code required

---

### GET `/auth/me`

**Response 200** — Same `user` object as login (includes `tenant` when applicable).

---

### POST `/auth/change-password`

**Request**
```json
{
  "currentPassword": "ChangeMe123!",
  "newPassword": "NewSecurePass1!"
}
```

**Response 200**
```json
{ "ok": true }
```

---

### POST `/auth/logout`

**Response 204** — No body. Client clears token. Server-side deny-list not implemented yet.

---

### Auth — language (public, for login screen)

These endpoints require **no authentication**. The login page calls them on load to populate the language switcher and merge DB-backed translations into the UI.

#### GET `/auth/locales`

Returns active languages for the sign-in screen. When an organization code is supplied, the list is filtered to that tenant's `enabledLocales`.

**Query parameters**

| Param | Required | Notes |
|-------|----------|-------|
| organizationCode | No | Tenant short code (e.g. `RMHS`). Narrows list to tenant-enabled languages and sets `defaultLocale` from tenant config. |

**Response 200**
```json
{
  "defaultLocale": "en",
  "items": [
    { "code": "en", "name": "English", "rtl": false },
    { "code": "es", "name": "Español", "rtl": false }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| defaultLocale | string | Suggested default (tenant default when org code matches, else `en`) |
| items | array | Active platform locales, optionally filtered by tenant |
| items[].code | string | ISO 639-1 language code |
| items[].name | string | Display name for language menu |
| items[].rtl | boolean | Right-to-left flag |

**Data source:** `translation_locales` collection (active only). Fallback when empty: `en`, `es`.

**Login UI behaviour:**
- On page load → `GET /auth/locales` (all platform active languages).
- When user enters organization code → `GET /auth/locales?organizationCode=RMHS` (debounced) to restrict menu to tenant-enabled languages.

---

#### GET `/auth/translations/bundle/{locale}`

Returns platform-level translation key/value pairs for a locale. Used on the login page (and post-login) to overlay DB translations on static JSON bundles.

**Path parameters**

| Param | Example | Notes |
|-------|---------|-------|
| locale | `es` | Language code |

**Response 200**
```json
{
  "locale": "es",
  "entries": {
    "signIn.title": "Iniciar sesión",
    "signIn.emailLabel": "Correo electrónico"
  }
}
```

**Resolution order at runtime (web):**
1. Tenant override (after login, authenticated)
2. Platform DB entry (`tenant_id = null`) — **this endpoint**
3. Static `en.json` / `es.json` bundle in web build
4. English fallback
5. Raw key path

**Note:** Platform Admin manages entries via `/platform/translations`; this auth route exposes the same platform bundle without requiring a token.

---

### Auth — language on authenticated profile

After login, tenant language context is also available on the user profile:

| Field | Location | Description |
|-------|----------|-------------|
| tenant.defaultLocale | `POST /auth/login`, `GET /auth/me` | Tenant default language |
| tenant.enabledLocales | `POST /auth/login`, `GET /auth/me` | Languages enabled for the organization |

Post-login, the shell language switcher uses the same locale list logic; tenant overrides load from `GET /admin/translations/bundle/{locale}` when authenticated.

---

## 6. Clients

### GET `/clients?q={search}`

**Response 200**
```json
{
  "items": [
    {
      "id": "cli-john-davis",
      "name": "John Davis",
      "phone": "(847) 555-0201",
      "address": "88 Oak Street, Rolling Meadows, IL",
      "dob": "1938-07-22",
      "status": "Active",
      "crossProgramActive": false
    }
  ]
}
```

---

### POST `/clients`

**Request**
```json
{
  "name": "Jane Smith",
  "phone": "(847) 555-9999",
  "address": "1 Main St, Rolling Meadows, IL",
  "dob": "1945-03-12",
  "contactReason": "Initial outreach",
  "screeningNotes": "Lives alone",
  "emergencyTrigger": "",
  "serviceNeed": true,
  "confirmDespiteDuplicates": false
}
```

**Response 201** — `ClientDetail` (extends `ClientSummary` with `registeredAt`, `registrationSource`, `contactReason`, `screeningNotes`).

**Response 409** — Duplicate threshold exceeded:
```json
{
  "detail": {
    "error": "duplicate_threshold",
    "message": "...",
    "matches": [{ "client": {}, "score": 85, "matchedFields": ["name", "phone"] }]
  }
}
```

---

### POST `/clients/dedup-check`

**Request**
```json
{
  "name": "John Davis",
  "phone": "(847) 555-0201",
  "dob": "1938-07-22",
  "excludeClientId": "cli-other"
}
```

**Response 200**
```json
{
  "matches": [{ "client": {}, "score": 90, "matchedFields": ["name", "dob"] }],
  "threshold": 25
}
```

---

### GET `/clients/duplicates`

**Response 200**
```json
{
  "pairs": [
    {
      "clientA": { "id": "...", "name": "...", "phone": "...", "address": "...", "status": "Active" },
      "clientB": { "id": "...", "name": "...", "phone": "...", "address": "...", "status": "Active" },
      "score": 78,
      "matchedFields": ["name", "phone"]
    }
  ]
}
```

---

### POST `/clients/merge`

**Request**
```json
{
  "survivorId": "cli-keep",
  "duplicateId": "cli-remove"
}
```

**Response 200** — `ClientDetail` (survivor).

---

### GET `/clients/{clientId}`

**Response 200** — `ClientDetail`.

---

## 7. Catalog

### GET `/catalog/case-categories`

**Response 200**
```json
{
  "categories": [
    {
      "id": "cat-senior-services",
      "label": "Senior Services",
      "programId": "prog-senior-services",
      "subcategories": [
        { "id": "sub-seniors-at-risk", "label": "Seniors at Risk" }
      ]
    }
  ]
}
```

---

### GET `/catalog/workflows/{subcategoryId}`

**Response 200**
```json
{
  "id": "wf-seniors-at-risk",
  "name": "Seniors at Risk",
  "description": "...",
  "stages": [
    { "tabId": "referral", "stage": 1, "label": "Referral", "deliverable": "..." }
  ]
}
```

---

### GET `/catalog/events`

**Response 200**
```json
{
  "items": [
    { "id": "evt-meals-on-wheels", "label": "Meals on Wheels enrollment" }
  ]
}
```

---

## 8. Cases & case workspace

### GET `/cases?q=&status=active|closed`

**Response 200**
```json
{
  "items": [
    {
      "id": "case-abc123",
      "caseNumber": "C-2026-001",
      "clientId": "cli-john-davis",
      "clientName": "John Davis",
      "programId": "prog-senior-services",
      "caseCategoryId": "cat-senior-services",
      "caseSubcategoryId": "sub-seniors-at-risk",
      "caseManagerId": "usr-case-manager",
      "status": "active",
      "incompleteIntake": false,
      "currentStage": 3,
      "openDate": "2026-01-15"
    }
  ]
}
```

---

### POST `/cases`

**Request**
```json
{
  "clientId": "cli-john-davis",
  "categoryId": "cat-senior-services",
  "subcategoryId": "sub-seniors-at-risk",
  "caseManagerId": "usr-case-manager"
}
```

**Response 201** — Full `CaseWorkspace` (see §8.1).

---

### GET `/cases/{caseId}/workspace`

### PUT `/cases/{caseId}/intake`

**Request**
```json
{
  "name": "John Davis",
  "dob": "1938-07-22",
  "phone": "(847) 555-0201",
  "address": "88 Oak Street",
  "referral": {
    "source": "Hospital",
    "reason": "Discharge planning",
    "referrerName": "Dr. Lee"
  },
  "intake": {
    "consentOnFile": true,
    "livingArrangement": "Alone",
    "medicalHistory": "...",
    "comprehensiveAssessmentNotes": "..."
  }
}
```

**Response 200** — Updated `CaseWorkspace`.

---

### 8.1 CaseWorkspace (full response shape)

All case mutation endpoints return this structure:

```json
{
  "case": { "id", "caseNumber", "clientId", "clientName", "programId", "caseCategoryId", "caseSubcategoryId", "caseManagerId", "status", "incompleteIntake", "currentStage", "openDate" },
  "client": { "id", "name", "phone", "address", "dob", "status", "crossProgramActive" },
  "workflow": { "id", "name", "description", "stages": [] },
  "stageStatuses": [{ "tabId", "stage", "label", "deliverable", "status" }],
  "currentStage": 3,
  "referral": { "source", "reason", "referrerName", "dateReceived" },
  "intake": { "consentOnFile", "livingArrangement", "medicalHistory", "comprehensiveAssessmentNotes", "completeness" },
  "riskAssessment": {
    "id", "date", "ratings": {}, "compositeScore", "overallRisk", "overrideNote",
    "domains": [{ "key", "label" }]
  },
  "carePlanItems": [{ "id", "issue", "goal", "service", "status" }],
  "enrollments": [{ "id", "serviceOrEventId", "serviceLabel", "dateEnrolled", "status" }],
  "cboReferrals": [{ "id", "cboName", "status", "date" }],
  "notes": [{ "id", "date", "type", "text", "authorId" }],
  "reassessments": [{ "id", "date", "trigger", "previousRatings", "newRatings" }],
  "closure": { "date", "reason", "outcomesSummary" },
  "documents": [{ "id", "filename", "sourceType", "mimeType", "size", "externalUrl", "uploadedAt", "stageContext" }],
  "assignmentHistory": [{ "id", "caseManagerId", "caseManagerName", "assignedBy", "assignedByName", "reason", "assignedAt" }],
  "activity": [{ "action", "actorId", "actorName", "timestamp", "meta" }],
  "followUpCadence": { "status", "dueDate", "daysOverdue", "cadenceDays" },
  "riskDomains": [{ "key", "label" }],
  "readOnly": false
}
```

---

## 9. Case stages (mutations)

| Method | Path | Request body | Response |
|--------|------|--------------|----------|
| PUT | `/cases/{caseId}/risk` | `{ "ratings": { "domainKey": "High" }, "overrideNote": "..." }` | CaseWorkspace |
| POST | `/cases/{caseId}/care-plan-items` | `{ "issue", "goal", "service", "status?" }` | CaseWorkspace |
| POST | `/cases/{caseId}/care-plan-items/{itemId}/void` | `{ "reason" }` | CaseWorkspace |
| POST | `/cases/{caseId}/enrollments` | `{ "serviceOrEventId" }` | CaseWorkspace |
| POST | `/cases/{caseId}/cbo-referrals` | `{ "cboName", "status?" }` | CaseWorkspace |
| POST | `/cases/{caseId}/notes` | `{ "type", "text" }` | CaseWorkspace |
| POST | `/cases/{caseId}/notes/{noteId}/void` | `{ "reason" }` | CaseWorkspace |
| POST | `/cases/{caseId}/reassessments` | `{ "trigger", "newRatings": {} }` | CaseWorkspace |
| POST | `/cases/{caseId}/closure` | `{ "reason", "outcomesSummary": {} }` | CaseWorkspace |
| PATCH | `/cases/{caseId}/assignment` | `{ "caseManagerId", "reason" }` | CaseWorkspace |
| POST | `/cases/{caseId}/assign-to-me` | — | CaseWorkspace |

---

## 10. Enrollments

### POST `/enrollments/bulk`

**Request**
```json
{
  "caseIds": ["case-1", "case-2"],
  "serviceOrEventId": "evt-meals-on-wheels"
}
```

**Response 201**
```json
{ "created": 2, "skipped": 0 }
```

---

## 11. Liaison

### GET `/liaison/lookup?q={search}`

**Response 200**
```json
{
  "items": [
    {
      "clientName": "John Davis",
      "programLabel": "Senior Services",
      "caseManagerName": "Case Manager",
      "caseManagerStatus": "Active",
      "contactPhone": "(847) 555-0101"
    }
  ]
}
```

---

## 12. Reports

### GET `/reports/catalog`

**Response 200**
```json
{
  "items": [
    { "id": "clients-by-program", "label": "Clients by program", "type": "chart" },
    { "id": "overdue-follow-ups", "label": "Overdue follow-ups", "type": "table" }
  ]
}
```

Built-in report IDs: `clients-by-program`, `multi-program-enrollment`, `caseload-by-risk`, `event-enrollment`, `overdue-follow-ups`, `open-cbo-referrals`.

---

### GET `/reports/tier/{tierName}`

`tierName`: `executive` | `operational` | `integrity`

**Query filters (via reports page):** passed from UI as caseload-style filters where applicable.

**Response 200** — Tier-specific payload (charts, KPIs, audit rows). Shape varies by tier.

---

### GET `/reports/caseload`

**Query params**

| Param | Default | Values |
|-------|---------|--------|
| period | all | all, month, quarter, year, custom |
| date_from | "" | ISO date |
| date_to | "" | ISO date |
| program_id | "" | Program id |
| case_status | active | active, closed |
| event_id | "" | Service event id |

**Response 200** — Caseload dashboard data: `filters`, `filterOptions`, `peopleByProgram`, `multiProgram`, `riskDistribution`, `overdueFollowUps`, `openCboReferrals`, etc.

---

### GET `/reports/{reportId}`

**Response 200 (chart)**
```json
{
  "reportId": "clients-by-program",
  "chartType": "bar",
  "data": [{ "label": "Senior Services", "value": 42 }]
}
```

**Response 200 (table)**
```json
{
  "reportId": "overdue-follow-ups",
  "rows": [{ "clientName": "...", "caseNumber": "...", "daysOverdue": 5 }]
}
```

---

### Custom reports

| Method | Path | Body / query | Response |
|--------|------|--------------|----------|
| GET | `/reports/custom` | period, date_from, date_to, program_id, case_status, event_id | `{ items: [{ id, name, reportType, updatedAt, primaryEntity, preview }], filterOptions }` |
| POST | `/reports/custom` | Report config (see below) | Report config |
| GET | `/reports/custom/{reportId}` | — | Report config |
| PUT | `/reports/custom/{reportId}` | Report config | Report config |
| POST | `/reports/custom/preview` | `{ config, period?, dateFrom?, dateTo?, programId?, caseStatus?, eventId? }` | Preview table or chart |

**Report config shape**
```json
{
  "id": "cr-123",
  "name": "My report",
  "reportType": "table",
  "primaryEntity": "cases",
  "joins": [],
  "columns": [{ "entity": "cases", "field": "caseNumber", "label": "Case #" }],
  "filters": [],
  "sortBy": { "field": "openDate", "direction": "desc" },
  "joinAggregates": {},
  "chart": { "type": "bar", "xField": "", "yField": "" }
}
```

---

## 13. Documents

### GET `/documents?caseId={caseId}`

**Response 200**
```json
{
  "items": [
    {
      "id": "doc-1",
      "caseId": "case-abc",
      "clientId": "cli-john-davis",
      "filename": "care-plan.pdf",
      "sourceType": "upload",
      "mimeType": "application/pdf",
      "size": 102400,
      "externalUrl": null,
      "uploadedAt": "2026-02-01T10:00:00Z",
      "stageContext": "care-plan"
    }
  ]
}
```

---

### POST `/documents/link`

**Request**
```json
{
  "clientId": "cli-john-davis",
  "filename": "External form",
  "externalUrl": "https://example.com/doc",
  "caseId": "case-abc",
  "stageContext": "intake"
}
```

**Response 201** `{ "id": "doc-..." }`

---

### POST `/documents/upload`

**Request**
```json
{
  "clientId": "cli-john-davis",
  "filename": "scan.pdf",
  "mimeType": "application/pdf",
  "dataBase64": "JVBERi0x...",
  "caseId": "case-abc",
  "stageContext": "intake"
}
```

**Response 201** `{ "id": "doc-...", "size": 102400 }`

---

## 14. Workflow

### GET `/workflow/board`

**Response 200**
```json
{
  "board": [
    {
      "id": "case-abc",
      "caseNumber": "C-2026-001",
      "clientName": "John Davis",
      "currentStage": 3,
      "currentStageLabel": "Risk Assessment",
      "currentStageStatus": "in_progress",
      "stageStatuses": []
    }
  ],
  "handoffs": []
}
```

---

## 15. Platform admin (`platform_admin`)

### Tenant CRUD

**POST `/platform/tenants`**
```json
{
  "legalName": "Acme Human Services",
  "shortCode": "ACME",
  "timezone": "America/Chicago",
  "defaultLocale": "en",
  "adminEmail": "admin@acme.org",
  "adminName": "Acme Admin"
}
```

**Tenant response object**
```json
{
  "id": "tenant-acme",
  "legalName": "Acme Human Services",
  "shortCode": "ACME",
  "status": "Draft",
  "timezone": "America/Chicago",
  "defaultLocale": "en",
  "enabledLocales": ["en", "es"],
  "branding": { "display_name": "Acme Human Services" },
  "config": {
    "duplicate_threshold": 25,
    "follow_up_cadence": { "High": 14, "Medium": 30, "Low": 90 },
    "retention_years": 7,
    "support_access_policy": "per_session"
  },
  "userCount": 1,
  "activeCaseCount": 0,
  "provisionedAt": "2026-09-08T...",
  "activatedAt": null
}
```

**PATCH `/platform/tenants/{tenantId}`** — `{ legalName?, timezone?, defaultLocale?, enabledLocales? }`

**GET `/platform/tenants/{tenantId}/readiness`**
```json
{
  "ready": true,
  "checks": [
    { "id": "tenant_admin", "label": "Tenant administrator assigned", "passed": true }
  ]
}
```

---

### Platform settings

**GET/PATCH `/platform/settings`**
```json
{
  "defaultPasswordMinLength": 8,
  "defaultSessionTimeoutMinutes": 480,
  "maxFailedLogins": 5
}
```

---

### Locales & translations

**POST `/platform/locales`** — `{ "code": "fr", "name": "Français", "rtl": false }`

**GET `/platform/translations?locale=es&q=reports&limit=100`**
```json
{
  "items": [
    { "key": "pages.reports.title", "namespace": "pages.reports", "values": { "en": "Reports", "es": "Informes" } }
  ],
  "total": 2700
}
```

**PATCH `/platform/translations`** — `{ "locale": "es", "key": "...", "value": "...", "namespace?" }`

**GET `/platform/translations/export`** — XLSX file (Sheets: `Translations`, `Locales`)

**POST `/platform/translations/import`** — `multipart/form-data` field `file` (.xlsx) → `{ "imported": 150 }`

**GET `/platform/translations/bundle/{locale}`** (public)
```json
{ "locale": "es", "entries": { "pages.reports.title": "Informes" } }
```

---

## 16. Tenant admin (`tenant_admin`)

### GET `/admin/dashboard`

```json
{
  "userCount": 6,
  "openCaseCount": 12,
  "recentAudit": [
    { "action": "user.create", "timestamp": "2026-09-08T...", "resourceType": "user", "resourceId": "usr-..." }
  ]
}
```

---

### Users

**POST `/admin/users`**
```json
{
  "email": "new.cm@acme.org",
  "name": "New Case Manager",
  "role": "case_manager",
  "programId": "prog-senior-services"
}
```

Operational roles only: `supervisor`, `case_manager`, `cross_program_liaison`, `auditor`.

**AdminUser response**
```json
{
  "id": "usr-...",
  "email": "new.cm@acme.org",
  "name": "New Case Manager",
  "role": "case_manager",
  "tenantId": "tenant-rolling-meadows",
  "programId": "prog-senior-services",
  "status": "Active",
  "lastLoginAt": null,
  "createdAt": "2026-09-08T..."
}
```

**PATCH `/admin/users/{userId}`** — `{ name?, role?, programId?, status? }`  
Deactivation blocked if user has open owned cases (`400 open_cases`).

---

### Tenant config

**GET/PATCH `/admin/config`**
```json
{
  "legalName": "Rolling Meadows Human Services",
  "shortCode": "RMHS",
  "status": "Active",
  "timezone": "America/Chicago",
  "defaultLocale": "en",
  "enabledLocales": ["en", "es"],
  "branding": { "display_name": "...", "primary_color": "#1a5f4a" },
  "config": {
    "duplicate_threshold": 25,
    "follow_up_cadence": { "High": 14, "Medium": 30, "Low": 90 },
    "retention_years": 7,
    "support_access_policy": "per_session"
  }
}
```

**PATCH body fields:** `branding`, `defaultLocale`, `enabledLocales`, `duplicateThreshold`, `followUpCadence`, `retentionYears`, `supportAccessPolicy`

---

### Translation overrides

Same pattern as platform: list, patch, export XLSX, import XLSX.

**GET `/admin/translations/bundle/{locale}`** — tenant-scoped overrides for runtime i18n merge.

---

### GET `/admin/audit-log?limit=50`

```json
{
  "items": [
    {
      "action": "tenant.config.update",
      "actorId": "usr-tenant-admin",
      "timestamp": "2026-09-08T...",
      "resourceType": "tenant",
      "resourceId": "tenant-rolling-meadows",
      "detail": {}
    }
  ]
}
```

---

## 17. Planned APIs — not yet implemented

These are in **CR-2026-001 / FSD** but **not in the codebase**. Confirm if they belong in the next integration phase.

| # | Method | Path | Purpose | CR / FSD ref |
|---|--------|------|---------|--------------|
| P1 | GET | `/admin/programs` | List enabled programs + catalogue | FR-ADM-03 |
| P2 | PATCH | `/admin/programs` | Enable/disable programs, relabel | FR-ADM-03 |
| P3 | GET | `/admin/workflows` | Workflow enable + label overrides | FR-ADM-03 |
| P4 | PATCH | `/admin/workflows` | Enable/disable workflows, relabel | FR-ADM-03 |
| P5 | GET | `/admin/service-events` | Enabled service events | FR-ADM-03 |
| P6 | PATCH | `/admin/service-events` | Enable events for bulk/reports | FR-ADM-03 |
| P7 | GET | `/dashboard` | Operational homepage KPIs (caseload summary) | UI currently mock-only |
| P8 | GET | `/notifications` | User notification feed | Shell bell — mock-only |
| P9 | POST | `/auth/refresh` | Refresh token rotation | NFR / production hardening |
| P10 | GET | `/platform/audit-log` | Platform-level admin audit | FR-TEN-04 extension |
| P11 | POST | `/auth/mfa/*` | MFA enrollment/verify | NFR-05 (deferred in CR) |
| P12 | GET/POST | `/support-access/*` | Support Access sessions | FR-TEN-06/07 (deferred) |

---

## 18. Coverage & integration status

### 18.1 OpenAPI vs implementation

| Metric | Count |
|--------|-------|
| **Implemented endpoints** | 74 |
| **Documented in openapi.yaml** | 16 |
| **Missing from OpenAPI** | 58 |
| **OpenAPI spec version** | 0.1.0 (app is 0.2.0) |

### 18.2 Web UI integration status

| Module | API exists | Web wired to API |
|--------|------------|------------------|
| Login / auth | Yes | Partial (mock default; API when `VITE_USE_MOCK_AUTH=false`) |
| Platform admin | Yes | Yes (with mock fallback) |
| Tenant admin | Yes | Yes (with mock fallback) |
| Clients | Yes | Partial |
| Cases / workspace | Yes | Partial |
| Reports / custom reports | Yes | Partial |
| Documents | Yes | Partial |
| Workflow board | Yes | Partial |
| Liaison | Yes | Partial |
| **Dashboard (homepage)** | **No (P7)** | Mock only |
| **Notifications** | **No (P8)** | Mock only |

---

## 19. Confirmation checklist

Please review and mark before full integration:

| # | Question | ☐ Confirm |
|---|----------|-----------|
| C1 | Master index (§3) — 72 endpoints cover all required application behaviour? | |
| C2 | Missing planned APIs (§17 P1–P12) — include in next phase? | |
| C3 | `CaseWorkspace` full shape (§8.1) — acceptable as standard response for all case mutations? | |
| C4 | Custom report config shape (§12) — matches report builder UI? | |
| C5 | Platform + admin translation Excel format — sufficient for translator workflow? | |
| C6 | Proceed to update `Docs/openapi.yaml` to v0.2.0 with all 72 routes? | |
| C7 | Proceed to wire remaining React pages off mock store (`USE_MOCK_AUTH=false`)? | |

**Reviewed by:** _______________  
**Date:** _______________  
**Decision:** ☐ Approved ☐ Approved with changes ☐ Rejected  

**Comments:**

---

## 20. Appendix — seeded demo credentials

| Role | Email | Org code | Password |
|------|-------|----------|----------|
| Platform Admin | platform.admin@demo.rmhs.app | — | ChangeMe123! |
| Tenant Admin | tenant.admin@demo.rmhs.app | RMHS | ChangeMe123! |
| Case Manager | case.manager@demo.rmhs.app | RMHS | ChangeMe123! |
| Supervisor | supervisor@demo.rmhs.app | RMHS | ChangeMe123! |
| Liaison | liaison@demo.rmhs.app | RMHS | ChangeMe123! |
| Auditor | auditor@demo.rmhs.app | RMHS | ChangeMe123! |

---

*End of API catalogue API-CAT-2026-001*

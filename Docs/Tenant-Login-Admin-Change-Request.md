# Change Request — Multi-Tenant Login, Administration & Translation Management

| Field | Value |
|-------|--------|
| **CR ID** | CR-2026-001 |
| **Status** | Draft — pending verification |
| **Date** | 8 September 2026 |
| **Author** | Engineering (generated for product review) |
| **Related docs** | `Docs/FSD-Rolling-Meadows.md` (Epic 1–3), `Docs/project.md` (§4–5, FR-TEN-*, FR-ADM-*), `Docs/SDD_Gaps_Answers.md` |
| **Depends on** | UI migration complete (mock parity — **done**) |

---

## 1. Executive summary

Rolling Meadows currently runs as a **single-tenant demo** with a **role-picker login** (mock) or **email/password JWT** (API) against one seeded tenant (`tenant-rolling-meadows`). Operational UI migration is complete.

This change request proposes the **next platform layer**:

1. **Production login module** — real sign-in, tenant resolution, session lifecycle.
2. **Multi-tenant hierarchy** — Platform Administrator (super admin) → Tenant (organization) → Tenant Administrator → operational users.
3. **Administration consoles** — platform and tenant scopes for users, configuration, and audit.
4. **Translation management** — database-backed locales with Excel import/export and support for adding new languages beyond EN/ES.

The design aligns with **FSD Epic 1–3** and **BRD §4–5**, and extends i18n with an admin-managed translation store (new capability, not in current FSD).

---

## 2. Background — current state

### 2.1 What exists today

| Area | Current implementation | Gap |
|------|------------------------|-----|
| **Login UI** | `LoginPage.tsx` — role dropdown when `VITE_USE_MOCK_AUTH=true` (default) | Not production sign-in |
| **API auth** | `POST /auth/login`, JWT with `tenant_id`, `role`, `sub` | Works for one tenant; no tenant picker |
| **Roles (typed)** | `platform_admin`, `tenant_admin`, `case_manager`, `supervisor`, `cross_program_liaison`, `auditor` | Only 4 operational roles seeded |
| **Tenant data** | MongoDB `tenants` collection; all queries filter by `user.tenant_id` | Single tenant in seed |
| **Platform API** | `GET /platform/tenants` (list only) | No create/activate/suspend |
| **Admin UI** | Placeholder routes `/admin`, `/platform` in `ShellPage.tsx` | No functional consoles |
| **i18n** | Static `en.json` / `es.json` (~2,700 keys each); `LocaleSwitcher` in session | Not tenant-configurable; no admin UI |
| **Permissions** | `permissions.ts` — 4 operational roles only | Admin roles not wired in React |

### 2.2 FSD alignment

| FSD epic | Requirement IDs | Status |
|----------|-----------------|--------|
| Epic 1 — Tenancy & Platform Admin | FR-TEN-01 … FR-TEN-05 | Not implemented (stub list API only) |
| Epic 2 — Access Control & Authentication | BR-AUTH-01 … BR-AUTH-03 | Partial (JWT + guards; no MFA/IdP) |
| Epic 3 — Tenant Administration | FR-ADM-01 … FR-ADM-05 | Not implemented |
| NFR-09 — Localisation | EN/ES complete | Static files only |
| NFR-05 — MFA for admin/supervisor | Required in FSD | Not started |

---

## 3. Objectives

1. Enable **multiple organizations (tenants)** on one deployment with strict data isolation.
2. Replace demo role-picker with a **production login** flow that resolves tenant context and enforces tenant status.
3. Allow **Platform Administrator** to provision tenants and create the **first Tenant Administrator** per organization.
4. Allow **Tenant Administrator** to manage users and assign **operational roles** (supervisor, case manager, liaison, auditor).
5. Centralize **application configuration** at platform and tenant levels per BRD §4.3.
6. Provide **translation management** with Excel template export, bulk import, and ability to register new languages.

---

## 4. Scope

### 4.1 In scope (this change request)

- Login module (email/password v1; IdP-ready architecture)
- Tenant resolution at sign-in
- Platform Admin console (tenant lifecycle, platform settings, global translation catalogue)
- Tenant Admin console (users, roles, tenant configuration, tenant-scoped translation overrides)
- Configuration model and API
- Translation store + Excel import/export
- Seed data for platform admin + demo tenant admin
- Audit log for all admin/configuration changes (FR-ADM-05)
- OpenAPI updates and React admin UI (new module)

### 4.2 Out of scope (defer to later CRs)

- OIDC/SAML / enterprise IdP integration (FSD Decision **O1** — TBD)
- MFA enforcement (NFR-05) — design hooks only in v1 unless explicitly pulled in
- Support Access sessions (FR-TEN-06/07) — separate CR
- Custom role builder (user-defined permissions) — **not in BRD**; roles remain fixed catalogue
- Legacy data migration per tenant
- Billing / licence metering
- Mobile-native apps

### 4.3 Clarification — “sub roles”

Per BRD §5.1, roles are a **fixed permission matrix**, not user-defined roles:

| Created by | Role assigned | Scope |
|------------|---------------|-------|
| Platform Admin | `tenant_admin` (first user per tenant) | One tenant |
| Tenant Admin | `supervisor`, `case_manager`, `cross_program_liaison`, `auditor` | Same tenant |

**Verification question:** Does “create sub roles” mean (A) assign these predefined roles to users, or (B) define new custom roles with granular permissions? **This CR assumes (A)** per FSD/BRD. Option (B) requires a separate product decision.

---

## 5. Proposed role & tenant hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                  Platform (deployment)                       │
│  Platform Administrator (platform_admin)                     │
│    • Manages all tenants                                     │
│    • Platform-wide settings & translation master             │
│    • Creates tenant + first Tenant Admin                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │ Tenant A  │    │ Tenant B  │    │ Tenant C  │
   │ (org)     │    │ (org)     │    │ (org)     │
   └─────┬─────┘    └───────────┘    └───────────┘
         │
         │  Tenant Administrator (tenant_admin)
         │    • Users & role assignment
         │    • Programs/workflows/events (within catalogue)
         │    • Branding, locale, thresholds, retention
         │
         ├── Supervisor
         ├── Case Manager
         ├── Cross-Program Liaison
         └── Auditor
```

**Isolation rule (BR-AUTH-02):** Every API query derives `tenant_id` from the authenticated user document. Client-supplied tenant IDs are ignored.

---

## 6. Login module specification

### 6.1 Sign-in flow (v1)

```mermaid
sequenceDiagram
  participant U as User
  participant W as Web App
  participant A as API
  participant D as MongoDB

  U->>W: Open /login
  W->>U: Sign-in form (email, password, optional tenant hint)
  U->>A: POST /auth/login
  A->>D: Find user by email (+ tenant if multi-match)
  A->>D: Load tenant; check status = Active
  A->>A: Verify password; issue JWT
  A->>W: Token + user profile + landingPath
  W->>W: Store token; redirect to role landing page
```

### 6.1.1 Sign-in page fields

| Field | Required | Notes |
|-------|----------|-------|
| Email | Yes | Unique within tenant; platform admin may be global |
| Password | Yes | bcrypt; policy from tenant or platform default |
| Organization code | Conditional | Required when email exists in multiple tenants; maps to `short_code` |
| Remember me | Optional | Extended refresh token (future) |

### 6.1.2 Post-login routing

| Role | Landing route | Guard |
|------|---------------|-------|
| `platform_admin` | `/platform/tenants` | Block operational case pages |
| `tenant_admin` | `/admin` | Read-only on case content |
| `supervisor` | `/cases/new` | Full operational |
| `case_manager` | `/cases/new` | Own caseload |
| `cross_program_liaison` | `/liaison` | Redirect away from case detail |
| `auditor` | `/reports?tier=integrity` | Read-only reports |

### 6.1.3 Session & security

| Item | v1 behaviour |
|------|--------------|
| Token storage | `sessionStorage` (existing `rm.accessToken`) |
| Token claims | `sub`, `tenant_id`, `role`, `exp` |
| Logout | Clear client token; optional server deny-list (phase 1.1) |
| Password reset | Tenant Admin triggers reset email / temp password (v1.1) |
| Account lockout | After N failed attempts (configurable) |
| Suspended tenant | Login returns 403 with clear message (FR-TEN-02) |
| Draft tenant | Only Platform Admin + seeded users may sign in for setup |

### 6.1.4 Mock mode transition

| Environment | Login behaviour |
|-------------|-----------------|
| Development | Keep role-picker behind `VITE_USE_MOCK_AUTH=true` for UI demos |
| Staging / Production | Email/password only; mock picker disabled |

---

## 7. Configuration catalogue

Configurations are split between **platform** (defaults / catalogue) and **tenant** (enabled subset + overrides).

### 7.1 Platform Administrator — platform settings

| Config area | Keys / entities | Purpose |
|-------------|-----------------|---------|
| **Tenant provisioning** | `legal_name`, `short_code`, `primary_contact`, `timezone`, `default_locale`, `status` | FR-TEN-01 |
| **Enabled programs catalogue** | Master list of programs available to any tenant | Limits what tenants can enable |
| **Workflow catalogue** | 12 workflows + form families (read-only master) | FR-ADM-03 source |
| **Service events catalogue** | Bulk enrollment / reporting events | Tenant enables subset |
| **Platform defaults** | Default password policy, session timeout, max failed logins | Baseline for new tenants |
| **Supported locales (master)** | `en`, `es`, … register new language codes | Translation management |
| **Translation keys (master)** | Full key catalogue synced from codebase + admin additions | Source of truth for i18n |
| **Feature flags** | Per-tenant or global toggles (reports builder, documents, etc.) | Safe rollout |
| **Support Access policy defaults** | Default tenant policy enum | FR-TEN-07 default |

### 7.2 Platform Administrator — per-tenant settings (at provision)

| Setting | Set at | Notes |
|---------|--------|-------|
| Legal name, short code | Provision | Immutable short code after Active |
| Time zone | Provision | Reporting & audit timestamps |
| Default locale | Provision | FR-TEN-01; drives login page language |
| Enabled programs (initial) | Provision | Subset of platform catalogue |
| First Tenant Admin email | Provision | Invitation / temp password |
| Tenant status | Lifecycle | Draft → Active → Suspended → Offboarded |

### 7.3 Tenant Administrator — tenant settings (FR-ADM-03, FR-ADM-04)

| Config area | Examples | Applies to |
|-------------|----------|------------|
| **Branding** | Logo URL, primary colour, agency display name, favicon | Shell header, login page, reports export |
| **Locale & language** | Default locale; enabled locales for users | Tenant-wide UI default |
| **Programs & workflows** | Enable/disable programs, subcategories, relabel display names | Case creation, workspace forms |
| **Service events** | Enable events for bulk enrollment & reports | Services hub, reports filters |
| **Duplicate detection** | Similarity threshold (default 25) | Client registration |
| **Follow-up cadence** | Days by risk level (High 14, Medium 30, etc.) | Follow-up tab, overdue reports |
| **Retention** | Document & audit retention period (years) | Compliance |
| **Password policy override** | Min length, complexity (within platform max) | Tenant users |
| **Support Access policy** | Always / Per-session / Disabled | FR-TEN-07 |
| **Case categories labels** | Local terminology overrides | i18n tenant overrides |

### 7.4 Configuration storage model (proposed)

```
platform_settings     — singleton document
tenants               — tenant record + embedded or referenced config
tenant_programs       — enabled programs/workflows per tenant
tenant_config         — key/value or structured JSON (branding, thresholds, retention)
translation_locales   — registered languages
translation_entries   — { locale, namespace, key, value, source, updated_at }
audit_log             — append-only admin events
```

All tenant-scoped collections include `tenant_id` (existing pattern).

---

## 8. Translation management (new capability)

Extends NFR-09 beyond static JSON files.

### 8.1 Goals

- Platform Admin maintains the **master key catalogue** and **base translations** (English).
- Tenant Admin may override labels for **local terminology** (FR-ADM-03 relabelling) without code deploy.
- Support **adding new languages** (e.g. `fr`, `pt`) without redeploying the web app.
- **Excel import/export** for translator workflows.

### 8.2 Runtime resolution order

For key `pages.reports.clientDataIntegrity` in locale `es` for tenant `T`:

1. Tenant override (`tenant_id=T`, locale=`es`, key=…)
2. Platform translation (`tenant_id=null`, locale=`es`, key=…)
3. Static bundle fallback (`es.json` in web build)
4. English fallback (`en.json` / platform `en`)
5. Display key path (development warning)

### 8.3 Admin UI — Translation management

**Platform Admin → Translations**

| Feature | Description |
|---------|-------------|
| Locale list | Add language: code (ISO 639-1), display name, RTL flag, active flag |
| Key browser | Search/filter by namespace, missing translations, stale keys |
| Inline edit | Edit value per locale |
| Export Excel | Download `.xlsx` template or full export |
| Import Excel | Upload filled template; validate; preview diff; apply |
| Sync from codebase | CI job or admin action to import new keys from `en.json` |

**Tenant Admin → Labels & Languages** (`/admin/labels`) — **Implemented (2026-09-10)**

| Feature | Description |
|---------|-------------|
| Full key browser | Paginated table of all ~2,057 application keys with dynamic columns per registered locale |
| Add language | Register new locale codes (e.g. `fr`) via admin UI |
| Inline edit | Edit translation value per key/locale; saved to PostgreSQL platform catalogue |
| Export Excel | Download full catalogue: `Translations` sheet (key + all locale columns) + `Locales` sheet |
| Import Excel | Upload edited workbook; upserts values and optional locale rows; changes reflect in app after save |
| Runtime merge | API bundles override static `en.json`/`es.json` at runtime; `refreshTranslations` reloads without page refresh |

**Note:** Per-key `tenantOverridable` filtering and import preview/diff remain future enhancements. Legacy override endpoints (`/admin/translations/overrides/*`) retained for compatibility.

### 8.4 Excel file format (proposed)

**Sheet: `Translations`**

| Column | Required | Example |
|--------|----------|---------|
| `key` | Yes | `pages.reports.clientDataIntegrity` |
| `namespace` | Yes | `pages.reports` |
| `en` | Yes (export) | `Client Data Integrity Audit` |
| `es` | No | `Auditoría de integridad de datos del cliente` |
| `fr` | No | *(empty = missing)* |
| `description` | No | Help text for translators |
| `tenant_overridable` | No | `Y` / `N` |
| `max_length` | No | UI hint |

**Sheet: `Locales`** (export only)

| Column | Example |
|--------|---------|
| `code` | `es` |
| `name` | `Español` |
| `active` | `Y` |

**Import rules:**

- Reject unknown keys unless `allow_new_keys=Y` (Platform Admin only).
- Reject empty values for required locales marked active.
- Report missing keys vs codebase catalogue.
- All imports write `audit_log` entry.

### 8.5 Build & CI integration

| Stage | Behaviour |
|-------|-----------|
| **Build** | Merge static `en.json` keys into catalogue; fail build on missing `en` keys in code (NFR-09) |
| **Deploy** | Bundle static EN/ES as fallback; API serves dynamic overrides |
| **Release gate** | Export shows 100% coverage for active tenant locales |

---

## 9. Administration UI modules (new pages)

### 9.1 Platform module (`/platform/*`) — Platform Admin only

| Page | Functions |
|------|-----------|
| **Tenant list** | FR-TEN-04: status, users, cases, storage, last activity |
| **Create tenant** | FR-TEN-01 wizard: details → programs → first admin → Draft |
| **Tenant detail** | Activate, suspend, configure, readiness check (FR-TEN-03) |
| **Platform settings** | Global defaults, catalogues, feature flags |
| **Translations** | Locale & key management, Excel import/export |
| **Audit (platform)** | Platform-level admin actions |

### 9.2 Administration module (`/admin/*`) — Tenant Admin only

| Page | Functions |
|------|-----------|
| **Dashboard** | User count, open cases, config health, recent audit |
| **Users** | FR-ADM-01: CRUD, assign role, deactivate/reactivate |
| **Programs & workflows** | FR-ADM-03: enable/disable, relabel |
| **Service events** | Enable catalogue events |
| **Tenant settings** | FR-ADM-04: branding, locale, thresholds, retention |
| **Local labels** | Tenant translation overrides |
| **Audit log** | FR-ADM-05: filterable admin history |
| **Support Access** | Policy + session history (when FR-TEN-07 implemented) |

### 9.3 Shell changes

| Element | Change |
|---------|--------|
| Header | Show tenant name + short code for tenant users |
| User menu | Profile, change password, sign out |
| Nav | New **Administration** module for `tenant_admin`; **Platform** for `platform_admin` |
| Locale switcher | Load enabled locales from tenant config + user preference |

---

## 10. API surface (high level)

### 10.1 Auth (extend existing)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Add tenant resolution; status checks |
| POST | `/auth/logout` | Optional token invalidation |
| GET | `/auth/me` | Include tenant summary, enabled locales |
| POST | `/auth/change-password` | Authenticated user |

### 10.2 Platform (new)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/platform/tenants` | List / create (FR-TEN-01) |
| GET/PATCH | `/platform/tenants/{id}` | Detail / update |
| POST | `/platform/tenants/{id}/activate` | FR-TEN-02, FR-TEN-03 |
| POST | `/platform/tenants/{id}/suspend` | FR-TEN-02 |
| GET | `/platform/tenants/{id}/readiness` | Readiness check |
| GET/PATCH | `/platform/settings` | Platform defaults |
| GET/POST | `/platform/locales` | Register languages |
| GET | `/platform/translations/export` | Excel export |
| POST | `/platform/translations/import` | Excel import |
| GET/PATCH | `/platform/translations` | CRUD entries |

### 10.3 Tenant admin (new)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/admin/users` | FR-ADM-01 |
| PATCH | `/admin/users/{id}` | Edit / deactivate |
| GET/PATCH | `/admin/config` | FR-ADM-04 tenant settings |
| GET/PATCH | `/admin/programs` | FR-ADM-03 |
| GET/PATCH | `/admin/workflows` | Enable + relabel |
| GET/PATCH | `/admin/service-events` | Enable events |
| GET | `/admin/translations/overrides` | Tenant label overrides |
| POST | `/admin/translations/import` | Tenant Excel import |
| GET | `/admin/audit-log` | FR-ADM-05 |

All admin routes enforce role + tenant scope server-side.

---

## 11. Data model additions (MongoDB)

### 11.1 `tenants` (extend)

```json
{
  "_id": "tenant-acme",
  "legal_name": "Acme Human Services",
  "short_code": "ACME",
  "status": "Draft | Active | Suspended | Offboarded",
  "primary_contact": { "name": "", "email": "", "phone": "" },
  "timezone": "America/Chicago",
  "default_locale": "en",
  "enabled_locales": ["en", "es"],
  "branding": { "display_name": "", "logo_url": "", "primary_color": "" },
  "config": {
    "duplicate_threshold": 25,
    "follow_up_cadence": { "High": 14, "Medium": 30, "Low": 90 },
    "retention_years": 7,
    "support_access_policy": "per_session"
  },
  "provisioned_at": "ISO8601",
  "activated_at": "ISO8601",
  "last_activity_at": "ISO8601"
}
```

### 11.2 `users` (extend)

```json
{
  "_id": "usr-…",
  "tenant_id": "tenant-acme",
  "email": "admin@acme.org",
  "role": "tenant_admin",
  "status": "Active | Inactive | PendingInvite",
  "program_id": null,
  "created_by": "usr-platform-…",
  "last_login_at": "ISO8601"
}
```

Platform admin users: `tenant_id` = null or special `platform` scope ( **verify** ).

### 11.3 `translation_entries`

```json
{
  "_id": "…",
  "tenant_id": null,
  "locale": "es",
  "key": "pages.reports.clientDataIntegrity",
  "namespace": "pages.reports",
  "value": "…",
  "source": "import | inline | sync",
  "updated_at": "ISO8601",
  "updated_by": "usr-…"
}
```

---

## 12. Phased delivery plan (recommended SEED units)

| Phase | SEED unit | Deliverables | Depends on |
|-------|-----------|--------------|------------|
| **A** | Login & tenant resolution | Production login page, JWT tenant checks, suspended-tenant block, seed platform + tenant admin users | — |
| **B** | Platform tenant lifecycle | Create/list/activate/suspend tenant, readiness check, first admin invite | A |
| **C** | Tenant user management | Tenant Admin users CRUD, role assignment, deactivation rules (FR-ADM-02) | B |
| **D** | Tenant configuration | Programs/workflows/events enable, branding, thresholds (FR-ADM-03/04) | C |
| **E** | Translation store | DB model, runtime merge, locale registration | A |
| **F** | Translation Excel I/O | Export template, import validation, admin UI | E |
| **G** | Audit & hardening | Admin audit log UI, permission matrix tests, OpenAPI | C, D |

**Suggested first PR:** Phase A (login + tenant context) — unblocks all admin work.

---

## 13. Acceptance criteria (verification checklist)

### 13.1 Login

- [ ] User can sign in with email + password on production build (mock picker off).
- [ ] Invalid credentials show generic error (no user enumeration).
- [ ] User in **Suspended** tenant cannot sign in (FR-TEN-02).
- [ ] Each role lands on correct page per §6.1.2.
- [ ] JWT `tenant_id` matches user record; API rejects cross-tenant ID tampering.

### 13.2 Platform Admin

- [ ] Can create tenant in **Draft** with first Tenant Admin (FR-TEN-01).
- [ ] Activation blocked until readiness fails/passes (FR-TEN-03).
- [ ] Tenant list shows metrics (FR-TEN-04).
- [ ] Can suspend tenant; users blocked at login.

### 13.3 Tenant Admin

- [ ] Can create user with exactly one operational role (FR-ADM-01).
- [ ] Cannot deactivate user with open owned cases (FR-ADM-02).
- [ ] Can enable workflow; appears in case creation for tenant (FR-ADM-03).
- [ ] Branding/locale/threshold changes apply tenant-wide (FR-ADM-04).
- [ ] Every admin save creates audit entry (FR-ADM-05).

### 13.4 Translations

- [ ] Platform Admin can register new locale (e.g. `fr`).
- [ ] Export produces valid Excel template with all active keys.
- [ ] Import updates translations; missing required values rejected.
- [ ] UI reflects imported Spanish/French strings without redeploy.
- [ ] Tenant override takes precedence over platform value.

---

## 14. Open decisions — please verify

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| **D1** | Identity provider for v1 | (A) Email/password only (B) Azure AD/OIDC now | **A** for first release; design auth adapter for **B** |
| **D2** | Tenant sign-in UX | (A) Organization code field (B) Subdomain `acme.app.com` (C) Email domain mapping | **A** for v1 (matches `short_code` in seed) |
| **D3** | “Sub roles” meaning | (A) Assign fixed BRD roles (B) Custom role permissions | **A** per BRD — confirm with product |
| **D4** | Platform admin tenancy | (A) `tenant_id = null` (B) special `platform` tenant | **A** |
| **D5** | Translation source of truth | (A) DB primary, JSON fallback (B) JSON primary, DB overrides only | **A** for new languages; JSON fallback for resilience |
| **D6** | Who can import translations | (A) Platform Admin only (B) Tenant Admin for overrides only | **Both** — scope differs per §8.3 |
| **D7** | MFA in this CR | (A) Include MFA for admin/supervisor (B) Defer | **B** unless compliance requires now |
| **D8** | Mock login retention | (A) Keep for dev/demo (B) Remove entirely | **A** with env flag |

---

## 15. Traceability matrix

| Change request section | FSD / BRD reference |
|------------------------|---------------------|
| §6 Login module | Epic 2, Story 2.1; BR-AUTH-* |
| §7.1 Platform config | Epic 1; FR-TEN-01, FR-TEN-04 |
| §7.3 Tenant config | Epic 3; FR-ADM-03, FR-ADM-04 |
| §7.3 User management | Epic 3; FR-ADM-01, FR-ADM-02, FR-ADM-05 |
| §8 Translations | NFR-09 (extended) |
| §5 Hierarchy | project.md §4.3, §5.1 |

---

## 16. Effort estimate (indicative)

| Phase | Relative size | Notes |
|-------|---------------|-------|
| A — Login | M | UI + API hardening |
| B — Platform tenants | L | Wizard, readiness, lifecycle |
| C — Tenant users | M | CRUD + rules |
| D — Tenant config | L | Catalogue sync, many entities |
| E — Translation store | M | Runtime loader refactor |
| F — Excel I/O | M | openpyxl / SheetJS, validation |
| G — Audit & tests | M | Matrix tests per role |

**Total:** ~4–6 SEED units worth of work after UI migration (excluding MFA, IdP, Support Access).

---

## 17. Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Product Owner | | | ☐ Approved ☐ Approved with changes ☐ Rejected |
| Architect | | | ☐ Approved ☐ Approved with changes ☐ Rejected |
| Tenant SME | | | ☐ Approved ☐ Approved with changes ☐ Rejected |

**Comments / changes requested:**

---

*End of change request CR-2026-001*

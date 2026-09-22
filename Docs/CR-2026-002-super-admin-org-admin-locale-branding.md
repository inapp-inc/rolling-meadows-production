# Change review — Super admin, organization admin, locale labels, branding

| Field | Value |
|-------|--------|
| **CR ID** | CR-2026-002 |
| **Status** | **Implemented** (18 Sep 2026) |
| **Date** | 18 September 2026 |
| **Product** | CommunityOne |
| **Related** | `codebase/docs/administration-and-roles.md`, `Docs/Tenant-Login-Admin-Change-Request.md` |

This document is the review pack for the latest product direction. After sign-off we will implement it as one integration slice.

---

## 1. Why this review exists

The running app still does not match what you asked for:

1. **Locale labels are not on the super-admin side menu** (you still only see Tenants / user-style screens).
2. Super admin should **only create Organization Administrator** accounts (role dropdown locked).
3. Super admin should also **configure that tenant’s branding from user settings**, not only from the tenant list.
4. **Organization login** must show that tenant’s **logo and color codes**.
5. Organization **Administration → Users** must list **only users that organization created** (not tenant admins, not other tenants, not super-admin users).

Source code already has some of this (locale nav item, tenant branding CSS, login preview). The **deployed/running UI** can lag if the web image was not rebuilt. This CR restates the **target product** so we implement the right thing, not another partial patch.

---

## 2. Roles (proposed)

| Role | Who they are | Login look | After login |
|------|----------------|------------|-------------|
| **Platform administrator (super admin)** | CommunityOne operator | CommunityOne logo and product colors | Administration only |
| **Organization administrator** | First (and only) admin super admin creates for a tenant | **That tenant’s logo + primary / secondary / accent colors** | Operational app + Administration → Users |
| **Staff** (supervisor, case manager, liaison, auditor) | Created by the organization admin | Same tenant branding | Operations only; no Administration |

**Proposed change from current code:** super admin currently creates a **tenant administrator** when a tenant is created. After this CR, super admin creates an **organization administrator** instead. `tenant_admin` is **not** used in the super-admin create-user dropdown.

**Demo accounts after implementation**

| Email | Role |
|-------|------|
| `platform.admin@demo.rmhs.app` | Super admin |
| `org.admin@demo.rmhs.app` | Organization admin for Rolling Meadows |
| `tenant.admin@demo.rmhs.app` | **Hidden / not used** for super-admin and org-admin flows (or removed from seed if you confirm) |

---

## 3. Super admin — side menu (must be visible)

**Administration** (expanded by default so both items are obvious):

| Menu item | Route | Purpose |
|-----------|-------|---------|
| **Tenants** | `/platform/tenants` | List organizations; click to configure |
| **Locale labels** | `/platform/translations` | Languages and application labels (Excel import/export) |
| **Users** | `/platform/users` | Organization administrators only (re-enable this page) |

Why you still do not see Locale labels today:

- The item exists in **source** (`web/src/navigation/modules.ts`) as “Locales & labels”.
- The running container often still serves an **older web build**.
- Administration is an accordion; if it is collapsed, children are easy to miss.

**Implementation after approval**

- Label in the menu: **Locale labels** (your wording).
- Keep Administration **open by default** for super admin so Tenants, Locale labels, and Users are all visible without extra clicks.
- Rebuild and restart **web** (and API if user/role APIs change) so the running app matches source.

---

## 4. Super admin — create user (Organization Admin only)

When super admin clicks **Add user**:

| Field | Behaviour |
|-------|-----------|
| Organization | Required — pick a tenant |
| Name, email, password | Required |
| **Role dropdown** | **One option only: Organization Administrator** |
| Branding (user settings) | Same tenant branding fields as tenant configure (see §5) |

Super admin **cannot** assign case manager, supervisor, tenant admin, or any other role.

Creating a tenant (Tenants → Create) uses the same rule: the initial sign-in user is **organization_admin**, not `tenant_admin`.

API / UI rules:

- `POST /platform/tenants/{id}/users` creates `organization_admin` only.
- User list for super admin shows **organization admins for that tenant**, not staff created later by the org.

---

## 5. Super admin — tenant branding on user settings

Branding can be set in **two** places (same data, same tenant):

1. **Tenants → Configure** (existing page): logo, display name, primary / secondary / accent, footer, login tagline, locale, thresholds.
2. **Users → create or edit organization admin** (new / restored): a **Tenant branding** section on that form so super admin does not have to leave user settings to set colors and logo.

Saving branding from either screen updates the **tenant** record. The organization admin’s login and shell then use those colors.

---

## 6. Organization login and branding

When someone types an organization-admin (or staff) email on `/login`:

| Element | Behaviour |
|---------|-----------|
| Hero logo | Tenant logo |
| Colors | Tenant primary, secondary, accent applied to buttons, header, focus rings |
| Title / tagline | Tenant display name and login tagline |

After sign-in, the shell keeps the same colors (already applied via `BrandingProvider` when `user.tenant.branding` is present). Super admin login stays **CommunityOne** (no tenant colors).

If branding still looks like CommunityOne after org login, we will verify: login-preview API, CSS variables, and that the tenant actually has colors saved.

---

## 7. Organization — Administration → Users

Organization admin side menu: **Administration → Users** only (no Tenants, no Locale labels).

The user table shows **only users this organization created**:

| Shown | Hidden |
|-------|--------|
| Staff this org admin created (supervisor, case manager, liaison, auditor) | Super admin |
| | Tenant admin (if any leftover seed rows) |
| | Other organization admins |
| | Users from other tenants |
| | Users created by super admin (the org admin themself) |

Create-user dropdown for organization admin: operational roles only (not organization admin, not tenant admin, not platform admin).

**Data change required:** users currently have no `created_by`. Implementation will add `created_by` and filter `GET /admin/users` for `organization_admin` to `created_by = current user` (and same tenant, operational roles only). Existing seed staff can be backfilled as created by `org.admin@demo.rmhs.app` so the demo list is not empty.

---

## 8. Target pictures (after integration)

### Super admin

```
CommunityOne
└── Administration          ← open by default
    ├── Tenants
    ├── Locale labels
    └── Users               ← org admins only; role dropdown = Organization Administrator
                              + tenant branding on that form
```

### Organization admin

```
[Tenant logo]  [Tenant colors on chrome]
└── (operations: dashboard, cases, …)
└── Administration
    └── Users               ← only users this org created
```

---

## 9. Current vs proposed (gap)

| Topic | Current (source / running) | Proposed (this CR) |
|-------|----------------------------|--------------------|
| Super admin menu | Tenants + Locales & labels in source; Users redirected away; running build may omit Locale labels | Tenants + **Locale labels** + **Users**, all visible |
| First user on tenant create | `tenant_admin` | `organization_admin` |
| Super admin create-user roles | Hidden page; old API created tenant admin | Dropdown: **Organization Administrator only** |
| Branding | Tenant create + configure page | Those **plus** branding on org-admin user create/edit |
| Org login colors | Login preview + `applyBranding` exist | Must be **visible** for org email (verify + fix if missing) |
| Org user list | All tenant users except `tenant_admin` | **Only users created by that org admin** |

---

## 10. Out of scope (unless you add them)

- Organization admin editing global Locale labels
- Super admin seeing or editing staff accounts created by the org
- Super admin accessing cases, clients, or reports
- Custom roles beyond the fixed catalogue
- MFA / SSO

---

## 11. Assumptions (confirm or correct)

| ID | Assumption | If wrong |
|----|------------|----------|
| A1 | Super admin’s first user for a tenant is **organization admin**, not tenant admin. | Keep tenant admin as the first user. |
| A2 | Super admin **Users** menu is restored, scoped to org admins. | Keep users only inside tenant create, no Users menu. |
| A3 | Branding on “user settings” means the **create/edit org admin** form. | Means a separate Settings page instead. |
| A4 | Org user list is **created_by = me**, not “all operational users in the tenant”. | Show all staff in the tenant except admins. |
| A5 | Demo `tenant.admin@demo.rmhs.app` is retired from these flows. | Keep it for a third admin layer. |
| A6 | Menu wording is **Locale labels** (not “Locales & labels”). | Keep existing copy. |

---

## 12. Verification after integration (checklist)

### Super admin (`platform.admin@demo.rmhs.app`)

- [ ] Login: CommunityOne branding
- [ ] Side menu: **Administration → Tenants, Locale labels, Users** (all three visible without hunting)
- [ ] Locale labels page: languages + label table + Excel
- [ ] Add user: role dropdown has **only Organization Administrator**
- [ ] On that form, can set tenant logo and color codes; org login then uses them
- [ ] User list does **not** show case managers created by the org

### Organization admin (`org.admin@demo.rmhs.app`)

- [ ] Login: RMHS (or that tenant’s) **logo and colors**
- [ ] After login, header/buttons use those colors
- [ ] Administration shows **Users** only
- [ ] User table: only users this org created
- [ ] Cannot see super admin or leftover tenant admin rows

---

## 13. Integration plan (after you approve)

1. Navigation: Locale labels visible; Users menu restored for super admin; Administration expanded by default.
2. Super admin create user: `organization_admin` only; branding section on the form; tenant create seeds org admin.
3. API: list/create platform users = org admins; add `users.created_by`; org `GET /admin/users` filtered by creator.
4. Org login: confirm login-preview + CSS variables for tenant colors.
5. Seed/docs: update demo accounts and `codebase/docs/administration-and-roles.md`.
6. Rebuild web + API and re-run the checklist in §12.

---

## 14. Approval

Please mark this CR before we integrate.

| Decision | Tick |
|----------|------|
| Approved as written | ☐ |
| Approved with changes (note below) | ☐ |
| Rejected | ☐ |

**Changes requested:**

- A1 first user role: ☐ organization_admin ☐ tenant_admin  
- A4 org user list: ☐ created by this org admin only ☐ all operational users in the tenant  
- A5 tenant.admin demo account: ☐ hide/retire ☐ keep  

| Role | Name | Date |
|------|------|------|
| Product / requester | | |
| Engineering | | |

---

*End of CR-2026-002.*

**Related delivery docs:** [HANDOVER.md](./HANDOVER.md) · [TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md)

# CommunityOne — Administration and roles

**Product:** CommunityOne · **Demo org:** Rolling Meadows (RMHS)  
**Password:** `ChangeMe123!` (unless `SEED_USER_PASSWORD` is set)

Implemented per **CR-2026-002**. Full review history: [Docs/CR-2026-002-super-admin-org-admin-locale-branding.md](../../Docs/CR-2026-002-super-admin-org-admin-locale-branding.md).

---

## Role matrix

| Role | Demo email | Login | Sidebar (Administration) |
|------|------------|-------|---------------------------|
| **Super admin** | `platform.admin@demo.rmhs.app` | CommunityOne | **Tenants**, **Locale labels**, **Users** (org admins only) |
| **Organization admin** | `org.admin@demo.rmhs.app` | Tenant logo + colors | **Users** only (staff they created) |
| **Staff** | e.g. `case.manager@demo.rmhs.app` | Tenant branding | No Administration |

`tenant.admin@demo.rmhs.app` is **retired** (seed marks inactive if present).

---

## Super admin

- **Tenants** — create organizations; initial account is **organization administrator** (not tenant admin).
- **Locale labels** — `/platform/translations` — global languages and UI labels.
- **Users** — `/platform/users` — list/create **organization administrators** only; role is fixed; form includes **tenant branding** (logo, colors, tagline).
- Cannot open `/admin/users` or operational modules (redirect to `/platform/tenants`).

---

## Organization admin

- Login and shell use **tenant branding** (colors via CSS variables, logo in header).
- **Administration → Users** lists only **operational users they created** (`created_by` = current user).
- Can assign supervisor, case manager, liaison, auditor — not organization admin.

---

## Verification checklist

### Super admin

- [ ] Sidebar: Tenants, Locale labels, Users (Administration expanded)
- [ ] Create org admin: role locked; branding section saves to tenant
- [ ] User list shows org admins only (not case managers)

### Organization admin

- [ ] Login shows RMHS (or tenant) colors and logo
- [ ] Users table: case manager / supervisor only (not org admin row, not platform users)

---

## Technical references

| Area | Location |
|------|----------|
| Navigation | `web/src/navigation/modules.ts` |
| Platform users + branding | `web/src/pages/platform/PlatformUsersPage.tsx` |
| Org user scope | `api/app/routers/admin.py` (`list_users`, `created_by`) |
| Platform org admins | `api/app/routers/platform.py` |
| User `created_by` | `api/app/models/user.py`, `api/app/db/session.py` |

Rebuild after pull:

```bash
cd codebase
docker compose build web api
docker compose up -d
```

Restart API once so `init_db` adds `users.created_by` and seed backfill runs on next seed cycle.

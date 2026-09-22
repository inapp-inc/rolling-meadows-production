# Case Management Platform — Administration and roles

**Product:** Case Management Platform · **Demo org:** Demo Human Services Agency (DEMO)

## Roles at a glance

| Role | Example login | Login branding | Administration modules |
|------|---------------|----------------|-------------------------|
| **Super admin** | `platform.admin@demo.example.com` | Platform product | **Tenants**, **Locale labels**, **Users** (org admins only) |
| **Organization admin** | `org.admin@demo.example.com` | Tenant logo + colors | **Users** only (staff they created) |
| **Staff** | e.g. `case.manager@demo.example.com` | Tenant branding | No Administration |

`tenant.admin@demo.example.com` is **retired** (seed marks inactive if present).

## Super admin vs organization admin

| Capability | Super admin | Organization admin |
|------------|-------------|-------------------|
| Create tenants | Yes | No |
| Configure tenant branding (any tenant) | Yes | Own tenant only (Admin → Configuration) |
| Create org admins | Yes | No |
| Create staff users | Yes (scoped) | Yes (staff they created) |
| Platform locale labels | Yes | No |
| Operational modules (cases, clients, …) | No (platform console only) | Yes |

## Sign-in verification checklist

- [ ] Platform admin login shows platform logo and blue theme
- [ ] Org admin login shows demo agency colors and logo
- [ ] Staff login shows tenant branding in shell footer
- [ ] Spanish locale has no client-specific municipality branding in defaults

# Proposal: Rolling Meadows Platform — Bootstrap & Auth

## Summary

Bootstrap the production codebase as a Dockerized **React + FastAPI + MongoDB** modular monolith, with **integrated login** as the first deliverable. Operational UI behaviour remains governed by the approved prototype (`Docs/ui/`). Functional requirements remain in `Docs/FSD-Rolling-Meadows.md`.

## Problem

The approved prototype uses browser localStorage and a role-selector sign-in. Production requires server-side persistence, tenant-scoped authentication, and containerized deployment. Login is not yet integrated in the new codebase.

## Proposed solution

1. **Platform-fit (ADR-0017):** FastAPI as primary API instead of Express; React SPA; MongoDB; Docker Compose for local and deployable baseline.
2. **OpenAPI-first:** `Docs/openapi.yaml` defines auth and health contracts before implementation.
3. **Bootstrap SEED (`seed-00-bootstrap`):** `codebase/` with `web/`, `api/`, `docker-compose.yml`.
4. **Auth SEED (`seed-02-auth-rbac`):** JWT login, `/auth/me`, protected routes in React, role-based landing pages matching BRD §5.2.

## Non-goals (this change)

- Full case/client/report API surface (later SEED units)
- Enterprise SSO/MFA (Phase 2 pre go-live)
- Platform Admin / Tenant Admin consoles (later SEED units)
- Migrating all prototype pages to React (incremental)

## Success criteria

- `docker compose up --build` starts web, api, mongo
- User can log in via React with email/password against FastAPI
- JWT carries tenant_id and role; `/auth/me` returns user profile with landing path
- OpenAPI documents all auth endpoints

## References

- BRD: `Docs/project.md`
- FSD: `Docs/FSD-Rolling-Meadows.md`
- UI reference: `Docs/ui/`
- OpenAPI: `Docs/openapi.yaml`

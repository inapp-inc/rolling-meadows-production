# HIPAA-aligned technical controls (implementation)

This document maps implemented platform controls to common HIPAA Security Rule themes. It is **not** a compliance certification.

## Access control

- Unique user accounts with JWT bearer authentication
- Role-based access on API routes; tenant id enforced on every query
- Account lockout after repeated failed sign-ins (`max_failed_logins`, default 5)
- Password composition rules (minimum length + character classes) on create/change/reset
- Password rotation: maximum age (tenant `password_max_age_days`, default 90), reuse of recent passwords blocked; expired passwords force change at `/account/change-password` before other routes

## Audit controls

- **`phi_access_log`**: append-only records for read/list/search of clients and cases (no PHI in log payloads)
- **Export events**: document downloads (`GET /documents/{id}/download`), report/dashboard exports (`POST /compliance/phi-export` from the web client), with resource type/id only in logs
- **`admin_audit_log`**: sign-in, sign-out, failed sign-in, and administrative actions
- Tenant administrators can review logs at **Administration → Audit & access logs**

## Session management

- Configurable absolute session lifetime (platform default 30 minutes; tenant override via `session_timeout_minutes`)
- Idle timeout (default 15 minutes; tenant override via `idle_timeout_minutes`) enforced in the web client
- JWT expiry aligned with absolute session policy
- Tenant administrators configure session and password policy under **Administration → Tenant Settings**

## Transmission & edge security

- Set `ENFORCE_HTTPS=true` in production so HTTP requests are rejected and HSTS is sent
- Response headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control: no-store`

## Operator responsibilities (not automated here)

- Business Associate Agreements with tenants
- Encryption at rest for PostgreSQL and backups (infrastructure)
- Workforce training, incident response, and periodic risk analysis

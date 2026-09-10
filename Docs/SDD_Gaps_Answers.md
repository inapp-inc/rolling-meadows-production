# Gaps Answers: Gaps Questionnaire: Rolling Meadows Case Management Platform

**Version:** 1.0  
**Date:** 2026-09-03  
**Status:** Complete

---

## Functional gaps

### F1 — Which user roles must be supported in v1 production?
- **Answer**: Six roles per BRD §5: Platform Administrator, Tenant Administrator, Supervisor/Dept Admin, Case Manager, Cross-Program Liaison, Auditor. Prototype (Docs/ui) implements Case Manager, Supervisor, Liaison, Auditor via role selector; Platform Admin and Tenant Admin screens are BRD scope but not yet in prototype.
- **Owner**: Product
- **Confidence**: H

### F2 — What is the authoritative UI reference for field layouts, validations, and navigation?
- **Answer**: Approved prototype Demo v8 under Docs/ui/ (Assumption A5). Production React app shall match layouts, fields, validations, and navigation unless changed through formal change control. Module map: analytics, cases, clients, documents, services, workflow (see Docs/ui/js/core/modules.js).
- **Owner**: Product
- **Confidence**: H

### F3 — Which functional modules are in scope for v1?
- **Answer**: Tenant Management, Administration, Access, Client Management, Case Management, Case Assignment, Cross-Program Liaison, Documents, Workflow, Services, Analytics — per BRD §3.1. Prototype covers operational modules; tenant/platform admin and Support Access are BRD additions for production.
- **Owner**: Product
- **Confidence**: H

### F4 — How many programs, workflows, and form families must v1 support?
- **Answer**: Four programs, twelve service workflows, eight form families — per BRD §6.1. Subcategory at case creation determines workflow, stage labels, deliverables, and form family for the case lifetime (BR-WF-01).
- **Owner**: Product
- **Confidence**: H

### F5 — What case lifecycle stages must be implemented?
- **Answer**: Eight stages: Intake → Assessment → Risk → Care Plan → Services → Follow-up → Reassessment → Closure, plus Documents and Activity tabs at every stage. Stage status derived from completion evidence (BRD §6.2). Prototype implements via case-workspace.html stepper and dedicated stage pages.
- **Owner**: Product
- **Confidence**: H

### F6 — What assignment types and history requirements apply?
- **Answer**: Initial, Transfer, Directed reassignment, Bulk reassignment, Claim, Coverage — per BRD §7. Every change requires reason category + note; immutable append-only history; acknowledgment queue with 3-day escalation (FR-ASG-*).
- **Owner**: Product
- **Confidence**: H

### F7 — What duplicate detection rules apply?
- **Answer**: Tenant-scoped scoring: exact name 50, edit distance ≤2 name 35, substring 25, normalized phone 40, DOB 30; threshold ≥25 flags duplicate (configurable per tenant). Cross-program engagement flag within tenant. Prototype implements in deduplicationService.js.
- **Owner**: Product
- **Confidence**: H

### F8 — What reporting tiers and builder capabilities are required?
- **Answer**: Four standard tiers (Caseload & Program, Executive, Operational, Integrity & Audit) plus custom report builder, subscriptions (capture-only, no email delivery in v1), runtime filters, chart/table export, drill-down — FR-RPT-*. Report builder unavailable to Platform Admin, Auditor, Liaison.
- **Owner**: Product
- **Confidence**: H

### F9 — What Support Access controls are required for platform operator?
- **Answer**: Read-only, ticket-referenced, time-boxed (default 4h), named-record retrieval only (no browse/list/export), tenant policy (Always / Per-session / Disabled), persistent banner, full audit, tenant admin notification and revocation — BRD §4.4, FR-TEN-06/07.
- **Owner**: Product
- **Confidence**: H

### F10 — What languages must the UI support?
- **Answer**: English and Spanish — complete interface, form, and domain labels; switchable without losing work in progress (NFR-09). Prototype has locales under Docs/ui/js/locales/.
- **Owner**: Product
- **Confidence**: H

## Data and domain gaps

### D1 — What is the source of truth for client and case data in production?
- **Answer**: Server-side persistence with MongoDB as system of record. Production stack: React SPA + Python FastAPI API + MongoDB (ADR-0017 exception — FastAPI primary backend instead of Express). Prototype uses browser localStorage — out of scope for production. Every entity carries tenant_id; no cross-tenant sharing.
- **Owner**: Architecture
- **Confidence**: H

### D2 — What are the core business entities?
- **Answer**: Per BRD §10.1: Tenant, Tenant Configuration, User, Role Assignment, Client, Case, Case Assignment (history), Referral, Intake, Risk Assessment, Reassessment, Case Closure, Care Plan, Service Enrolment, CBO Referral, Case Note, Document, Program/Category/Subcategory/Workflow/Form Family, Service Event, Custom Report, Report Subscription, Audit Log. Prototype repositories under Docs/ui/js/repositories/ mirror this model.
- **Owner**: Architecture
- **Confidence**: H

### D3 — What retention and archival rules apply?
- **Answer**: Configurable retention period per tenant (FR-ADM-04). Audit log and Support Access records retained for tenant statutory period (BRD §4.4). Suspended tenants retain all data; offboarding requires export + written authorization before purge (FR-TEN-05).
- **Owner**: Compliance
- **Confidence**: M

### D4 — Is legacy data migration in scope?
- **Answer**: No — legacy data migration is a separate workstream per tenant (BRD §3.2). v1 starts with seed/configuration data and tenant onboarding flows.
- **Owner**: Product
- **Confidence**: H

### D5 — How is tenant identity applied to data access?
- **Answer**: Derived from authenticated user at sign-in; applied server-side to every query, export, and report — never from UI or URL (BR-AUTH-02, BR-TEN-01). Enforced at data-access layer with automated cross-tenant tests (NFR-01).
- **Owner**: Architecture
- **Confidence**: H

## Integration and API gaps

### I1 — What authentication mechanism is required for production?
- **Answer**: Phase 1 (bootstrap): email/password login via FastAPI JWT endpoints (POST /auth/login, GET /auth/me). Tenant and role resolved server-side from authenticated user (BR-AUTH-02). Phase 2 (pre go-live): directory-backed SSO/MFA per tenant (NFR-05). Prototype role selector replaced by credential login in codebase/web.
- **Owner**: Architecture
- **Confidence**: H

### I2 — What external systems must v1 integrate with?
- **Answer**: No outbound integrations required for v1 baseline: email delivery deferred (report subscriptions captured only), no CBO transmission, no cross-tenant matching, no billing. Identity provider per tenant is the primary external integration.
- **Owner**: Architecture
- **Confidence**: H

### I3 — What API contract will frontend and backend share?
- **Answer**: OpenAPI spec at Docs/openapi.yaml. REST API via Python FastAPI; React SPA (codebase/web) consumes API. Auth contract defined first (login integration priority). Edit OpenAPI before changing API shapes.
- **Owner**: Architecture
- **Confidence**: H

### I4 — How will document storage work?
- **Answer**: Per-client document vault with upload and external links (FR-DOC-01). Storage backend (object store vs MongoDB GridFS) not specified in BRD — to be decided in architecture.
- **Owner**: Architecture
- **Confidence**: L

## Non-functional and constraints

### N1 — What performance targets apply?
- **Answer**: Search/lists ≤2s at 50k clients and 100k cases per tenant; reports ≤5s; bulk reassignment of 500 cases ≤30s (NFR-02).
- **Owner**: Architecture
- **Confidence**: H

### N2 — What security and compliance requirements apply?
- **Answer**: HIPAA-aligned safeguards (A6); tenant isolation at data layer; RBAC at service layer; encryption in transit and at rest; immutable audit log; least privilege for liaison/auditor/support access; OWASP Top 10 validation at delivery.
- **Owner**: Security
- **Confidence**: H

### N3 — What scalability and availability targets apply?
- **Answer**: ≥25 tenants, 2,000 concurrent users; no tenant degrades another; 99.5% availability business hours; RPO 24h, RTO 4h; single-tenant restore (NFR-03, NFR-04).
- **Owner**: Architecture
- **Confidence**: H

### N4 — What tech stack and deployment constraints apply?
- **Answer**: React + Python FastAPI + MongoDB modular monolith (ADR-0017 exception to ADR-0001 Express default). Docker Compose runs web, api, and mongo containers (ADR-0003). Config via env/files, no hardcoded environment values.
- **Owner**: Architecture
- **Confidence**: H

### N5 — What accessibility requirements apply?
- **Answer**: WCAG 2.1 AA: keyboard operability, visible focus, contrast, screen-reader labelling (NFR-08). Responsive desktop and tablet; read/log on mobile (NFR-12).
- **Owner**: UX
- **Confidence**: H

### N6 — What configurability is required without code release?
- **Answer**: Programs, subcategories, workflows, form families, risk domains, service events, duplicate threshold, follow-up cadence values — NFR-10. Central catalogue maintained by platform; tenants enable subset and relabel.
- **Owner**: Product
- **Confidence**: H

## Scope and out-of-scope

### S1 — What is explicitly out of scope for this release?
- **Answer**: Cross-tenant client matching; tenant self-service signup/billing; public client portal; billing/payroll/timesheets; legacy migration; outbound email delivery; browser-session-only prototype persistence.
- **Owner**: Product
- **Confidence**: H

### S2 — What is deferred but mandatory before production go-live?
- **Answer**: Enterprise SSO and MFA (BRD §3.2); server-side persistence (this build); BAA execution per tenant before activation (A3).
- **Owner**: Product
- **Confidence**: H

### S3 — What is the first delivery milestone?
- **Answer**: Full platform per BRD scope, implemented as SEED units from scaffold bootstrap through all modules. Prototype (Docs/ui/) remains reference only; production code lives in codebase/.
- **Owner**: Delivery
- **Confidence**: M

### S4 — Does v1 include Platform Admin and Tenant Admin UI?
- **Answer**: Yes — required by FR-TEN-* and FR-ADM-* though not present in current prototype. Admin consoles to be designed to match BRD; operational screens match Docs/ui/.
- **Owner**: Product
- **Confidence**: H

## Open decisions

### O1 — Identity provider per tenant
- **Options**: Azure AD; Okta; Auth0; Generic OIDC/SAML — confirm with Rolling Meadows IT
- **Owner**: Architecture
- **Due**: Before seed-02-auth-rbac

### O2 — Document blob storage backend
- **Options**: S3-compatible object store; Azure Blob; GridFS in MongoDB
- **Owner**: Architecture
- **Due**: Before seed-09-documents

### O3 — Cloud deployment target
- **Options**: AWS; Azure; GCP — region and tenancy model
- **Owner**: Platform Ops
- **Due**: Before seed-00-bootstrap

### O4 — Statutory retention period default
- **Options**: Confirm with Legal/Compliance per tenant type (HIPAA minimum 6 years often cited)
- **Owner**: Compliance
- **Due**: Before seed-01-platform-tenancy

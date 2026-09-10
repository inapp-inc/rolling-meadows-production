# Functional Specification: Rolling Meadows Case Management Platform

**Version:** 1.0  
**Date:** 2026-09-03  
**Status:** Approved  
**Author:** AI-Generated Draft (from BRD-RM-6.1 + Docs/ui prototype)  
**Approved:** 2026-09-03 — stack confirmed React + FastAPI + Docker  
**Stakeholders:** Rolling Meadows Human Services — platform leadership, product owners, BAs, QA, delivery  
**Source documents:** `Docs/project.md`, `Docs/ui/`, `Discovery and Design/gap-questionnaire.json`

---

## 1. Executive Summary

The Rolling Meadows Case Management Platform is a multi-tenant system of record for community health and social service case delivery. Each agency operates in an isolated workspace with four programs, twelve service workflows, and a unified eight-stage case lifecycle. Production replaces fragmented spreadsheets and paper files with one client record, one case workspace, explicit auditable case ownership, duplicate detection at entry, and tiered self-service analytics in English and Spanish.

The approved UI prototype under `Docs/ui/` (Demo v8) defines layouts, fields, validations, and navigation for tenant-facing operational screens. This FSD translates BRD-RM-6.1 into implementable requirements with traceable acceptance criteria for spec-driven delivery.

---

## 2. Background & Problem Statement

Human services agencies deliver senior support, parenting support, mental health, and community services through separate program teams. Client information is fragmented across program-specific spreadsheets and paper files. The same resident is registered multiple times; staff lack cross-program visibility; follow-up depends on individual memory; case ownership changes are verbal with no record; reports are assembled manually.

The platform addresses these problems per BRD §2.1 with measurable outcomes O1–O7 (duplicate rate, stage completion, overdue follow-ups, cross-program lookup time, reporting effort, ownership traceability, tenant onboarding time).

---

## 3. Goals & Success Criteria

| Goal | Success Metric | BRD Ref |
|------|----------------|---------|
| Single client identity per tenant | < 5 confirmed duplicate pairs per 1,000 clients | O1 |
| Standardised case process | ≥ 95% cases complete all mandatory stages | O2 |
| Risk-driven follow-up | < 2% overdue high-risk follow-ups at month end | O3 |
| Cross-program visibility | Identify existing engagement in < 30 seconds | O4 |
| Self-service reporting | −80% staff hours per monthly reporting cycle | O5 |
| Auditable ownership | 100% ownership changes with actor and reason | O6 |
| Multi-tenant onboarding | New agency live in ≤ 5 business days | O7 |

**Out of scope (v1):** Cross-tenant client matching; tenant self-service signup/billing; public client portal; legacy data migration; outbound email; billing/payroll; browser localStorage persistence (prototype only). See BRD §3.2 and gaps S1–S2.

---

## 4. Stakeholders & User Personas

### Stakeholders

| Role | Interest |
|------|----------|
| Platform leadership | Multi-tenant strategy, platform health |
| Product owners | Prioritisation, prototype alignment |
| BAs / QA | Traceability, acceptance testing |
| Delivery | SEED-unit implementation against OpenAPI |

### Personas

**Platform Administrator** — Provisions and monitors tenants; no standing access to client PHI; uses Support Access when needed.

**Tenant Administrator** — Manages users, configuration, case ownership reassignment, duplicate merges; read-only on case content.

**Supervisor / Dept Admin** — Full operational access; duplicate admin; bulk reassignment; lands on Case Creation.

**Case Manager** — Runs full lifecycle for caseload of 20–40 clients; lands on Case Creation.

**Cross-Program Liaison** — Restricted lookup only; redirected from operational pages.

**Auditor** — Integrity and audit reports only; read-only aggregate assurance.

---

## 5. Functional Requirements

Requirements trace to BRD FR-* IDs. UI behaviour for operational screens SHALL match `Docs/ui/` unless this FSD or change control explicitly differs.

### Epic 1: Tenancy & Platform Administration

> Platform-scoped tenant lifecycle and console. *Gaps: F3, F9; FR-TEN-*.*

#### Story 1.1: Provision tenant
**As a** Platform Administrator, **I want** to create a tenant with legal name, short code, contact, timezone, locale, and enabled programs **so that** a new agency can be onboarded without a code release.

**Acceptance Criteria:**
- [ ] Given valid provisioning input, when the Platform Admin saves, then a tenant record exists in Draft status (FR-TEN-01).
- [ ] Given a Draft tenant, when readiness check fails (missing admin, supervisor, CM, or enabled workflow), then activation is blocked (FR-TEN-03).
- [ ] Given a passing readiness check, when the Platform Admin activates, then tenant status is Active and tenant users can sign in (FR-TEN-02).

#### Story 1.2: Platform console
**As a** Platform Administrator, **I want** a console listing all tenants with usage metrics **so that** I can monitor platform health.

**Acceptance Criteria:**
- [ ] Given multiple tenants, when the console loads, then each row shows status, user count, active case count, storage, and last activity (FR-TEN-04).
- [ ] Given a Suspended tenant, when a tenant user attempts sign-in, then access is denied and data is retained (BR-TEN-03).

#### Story 1.3: Tenant offboarding
**As a** Platform Administrator, **I want** to export and purge a tenant dataset with authorization **so that** offboarding is controlled and auditable.

**Acceptance Criteria:**
- [ ] Given offboarding initiated, when export completes, then a full tenant dataset is available (FR-TEN-05).
- [ ] Given purge requested without written authorization on record, when submitted, then purge is rejected.

---

### Epic 2: Access Control & Authentication

> Authenticated sign-in, tenant resolution, role guards. *Gaps: F1, I1; BR-AUTH-*.*

#### Story 2.1: Tenant-scoped sign-in
**As a** user, **I want** to sign in and land on my role-specific page **so that** I see only what I am permitted to access.

**Acceptance Criteria:**
- [ ] Given an unauthenticated request to a protected route, when accessed, then redirect to sign-in (BR-AUTH-01).
- [ ] Given an authenticated session, when any data query runs, then tenant_id is derived server-side from the user, never from client input (BR-AUTH-02).
- [ ] Given a Case Manager, when sign-in completes, then landing page is Case Creation (§5.2).
- [ ] Given a Liaison, when navigating to case detail, then redirect to Cross-Program Lookup (§5.2).

#### Story 2.2: Service-layer authorization
**As a** security reviewer, **I want** access denied at the API layer **so that** hidden navigation is not a security control.

**Acceptance Criteria:**
- [ ] Given a user without permission, when calling a restricted API, then HTTP 403 is returned (BR-AUTH-03).
- [ ] Given the permission matrix (BRD §5.1), when each role is tested, then allowed actions succeed and denied actions return 403.

*Note: Production requires directory-backed auth + MFA for admin/supervisor (NFR-05). Prototype role selector is not production behaviour.*

---

### Epic 3: Tenant Administration

> User, role, and configuration management within a tenant. *FR-ADM-*.*

#### Story 3.1: User lifecycle
**As a** Tenant Administrator, **I want** to manage users and roles **so that** access reflects current staffing.

**Acceptance Criteria:**
- [ ] Given a new user, when created, then exactly one role is assigned (FR-ADM-01).
- [ ] Given a user with open cases, when deactivation is attempted, then it is blocked until cases are reassigned (FR-ADM-02, BR-ASG-04).
- [ ] Given any admin change, when saved, then an audit log entry records actor, before, after, timestamp (FR-ADM-05).

#### Story 3.2: Program and workflow configuration
**As a** Tenant Administrator, **I want** to enable programs and workflows from the central catalogue **so that** local terminology can be applied without code changes.

**Acceptance Criteria:**
- [ ] Given the platform catalogue, when the Tenant Admin enables a workflow, then it appears at case creation for that tenant (FR-ADM-03, NFR-10).
- [ ] Given branding/locale/cadence/threshold settings, when saved, then they apply tenant-wide (FR-ADM-04).

---

### Epic 4: Client Management & Duplicate Detection

> Registration, search, 360° profile, duplicate queue. *Gaps: F7; FR-CLI-*; prototype: client-*.html, admin-duplicates.html, deduplicationService.js.*

#### Story 4.1: Client registration with duplicate warning
**As a** Case Manager, **I want** inline duplicate detection as I type **so that** I do not create redundant records.

**Acceptance Criteria:**
- [ ] Given name, phone, address entered, when required fields are present, then save is permitted (FR-CLI-01).
- [ ] Given typing name/phone/DOB, when similarity score ≥ tenant threshold (default 25), then inline warning displays before save (FR-CLI-02, §9.1).
- [ ] Given a client active in another program, when registration proceeds, then cross-program engagement flag is shown (FR-CLI-02).
- [ ] Given emergency trigger captured, when registration completes, then route to urgent case creation (FR-CLI-03).

#### Story 4.2: Client search and 360° profile
**As a** Case Manager, **I want** to search and view a complete client profile **so that** I have full context for service delivery.

**Acceptance Criteria:**
- [ ] Given search by name/phone/address, when queried, then fuzzy name matching returns results with duplicate pairs surfaced (FR-CLI-04).
- [ ] Given a selected client, when profile loads, then demographics, all cases, ownership history, and stage deliverables display (FR-CLI-05).

#### Story 4.3: Duplicate merge queue
**As a** Supervisor, **I want** to compare, merge, or dismiss duplicate pairs **so that** data quality is maintained.

**Acceptance Criteria:**
- [ ] Given pairs in the duplicate queue, when compared side-by-side, then survivor can be selected and merge executed (FR-CLI-06).
- [ ] Given merge or dismiss, when confirmed, then audit log entry is written (FR-CLI-06).

---

### Epic 5: Case Lifecycle & Workspace

> Case creation, eight-stage lifecycle, case workspace. *Gaps: F4, F5; FR-CASE-*; prototype: case-workspace.html, stage pages.*

#### Story 5.1: Case creation with workflow preview
**As a** Case Manager, **I want** to create a case from category/subcategory **so that** the correct workflow applies for the case lifetime.

**Acceptance Criteria:**
- [ ] Given category and subcategory selected, when preview shown, then workflow, stages, and form family match BRD §6.1 mapping (FR-CASE-01, BR-WF-01).
- [ ] Given only tenant-enabled workflows, when creating a case, then disabled workflows are not selectable (BR-WF-01).

#### Story 5.2: Unified case workspace
**As a** Case Manager, **I want** all stages in one workspace with a progress stepper **so that** I can complete the lifecycle without losing context.

**Acceptance Criteria:**
- [ ] Given an open case, when workspace loads, then eight stage tabs plus Documents and Activity are present with stepper progress (FR-CASE-03).
- [ ] Given stage completion evidence present, when stage status computed, then completed stages show complete and first incomplete shows in progress (§6.2).
- [ ] Given referral/intake captured, when intake saved, then referral source, reason, referrer, screening questions, and consent are stored (FR-CASE-02).

#### Story 5.3: Risk, care plan, services, follow-up, reassessment, closure
**As a** Case Manager, **I want** to record clinical and operational deliverables per stage **so that** the case evidence base supports funding and continuity.

**Acceptance Criteria:**
- [ ] Given risk domains rated Low/Medium/High, when saved, then composite score and overall level are calculated per BR-RISK-01; override note is documentation only (FR-CASE-04).
- [ ] Given care plan items, enrolments, CBO referrals, when recorded, then each is voidable with mandatory reason (FR-CASE-05, BR-VOID-01).
- [ ] Given current risk level, when follow-up tab viewed, then cadence displays per BR-FU-01 and overdue state per BR-FU-02 (FR-CASE-06).
- [ ] Given reassessment trigger, when saved, then previous ratings retained and current risk updated (FR-CASE-07).
- [ ] Given closure attempted, when required fields missing, then closure blocked; when complete, case is read-only (FR-CASE-08, FR-CASE-09, BR-CLOSE-01).

#### Story 5.4: Case search
**As a** Supervisor, **I want** to search cases by text, category, subcategory, and owner **so that** I can manage caseloads.

**Acceptance Criteria:**
- [ ] Given search filters, when applied, then matching cases return within performance target (FR-CASE-10, NFR-02).

---

### Epic 6: Case Assignment

> Ownership model, history, bulk/coverage, acknowledgment. *Gaps: F6; FR-ASG-*; BR-ASG-*.*

#### Story 6.1: Assign and transfer ownership
**As a** Case Manager, **I want** to transfer my case with a documented reason **so that** accountability is clear.

**Acceptance Criteria:**
- [ ] Given case creation, when saved, then creating CM is owner; no case exists without owner (FR-ASG-01).
- [ ] Given owning CM initiates transfer, when reason category and note provided, then ownership updates and history row is appended atomically (FR-ASG-02, FR-ASG-04, FR-ASG-07, BR-ASG-01).
- [ ] Given assignment UI, when recipient selected, then open caseload and high-risk count display (FR-ASG-05).

#### Story 6.2: Supervisor bulk reassignment
**As a** Supervisor, **I want** to reassign cases in bulk **so that** I can rebalance caseloads on staff changes.

**Acceptance Criteria:**
- [ ] Given filter by owner/program/risk, when bulk reassignment confirmed, then all selected cases update with individual history rows (FR-ASG-03).
- [ ] Given 500 cases selected, when bulk reassignment runs, then completion within 30 seconds (NFR-02).

#### Story 6.3: Coverage and acknowledgment
**As a** Supervisor, **I want** temporary coverage assignments and acknowledgment tracking **so that** handoffs are supervised.

**Acceptance Criteria:**
- [ ] Given coverage with end date, when date passes, then ownership reverts automatically with history event (FR-ASG-06, BR-ASG-05).
- [ ] Given new assignment, when recipient has not acknowledged within 3 working days, then supervisor escalation triggers (FR-ASG-09).
- [ ] Given closed case, when assignment attempted, then blocked; on reopen, owner becomes actor (FR-ASG-10).

---

### Epic 7: Workflow & Task Board

> Pipeline progress, handoff queue. *FR-WFL-*; prototype: workflow-hub.html.*

#### Story 7.1: Task and handoff board
**As a** Supervisor, **I want** a board showing pipeline progress and handoff items **so that** stalled cases are visible.

**Acceptance Criteria:**
- [ ] Given cases in scope, when board loads, then each shows stage progress, current stage, and owner (FR-WFL-01).
- [ ] Given incomplete intake, in-progress risk, or unacknowledged assignment, when board computed, then case appears in handoff queue (FR-WFL-02, BR-INT-01).

---

### Epic 8: Services & Enrolment

> Service coordination, bulk enrolment, CBO referrals. *FR-SVC-*; prototype: services-hub.html, bulk-enrollment.html.*

#### Story 8.1: Service coordination hub
**As a** Case Manager, **I want** a hub showing caseload services **so that** I can coordinate enrolments and referrals.

**Acceptance Criteria:**
- [ ] Given active caseload, when hub loads, then active cases, open CBO referrals, and enrolment counts per client display (FR-SVC-01).

#### Story 8.2: Bulk enrolment
**As a** Case Manager, **I want** to bulk-enrol filtered cohorts **so that** I can efficiently assign service events.

**Acceptance Criteria:**
- [ ] Given cohort filter (all/high-risk/incomplete intake), when bulk enrolment confirmed, then selected clients enrol in chosen service event (FR-SVC-02).

---

### Epic 9: Documents

> Per-client document vault. *FR-DOC-*; prototype: documents-hub.html.*

#### Story 9.1: Document vault
**As a** Case Manager, **I want** to upload and link documents per client **so that** records are centralised.

**Acceptance Criteria:**
- [ ] Given a client, when document uploaded or external link added, then it appears in vault accessible from client list and case workspace (FR-DOC-01).

---

### Epic 10: Reporting & Analytics

> Four tiers, custom builder, subscriptions. *Gaps: F8; FR-RPT-*; prototype: reports.html, report-builder.html, custom-reports.html.*

#### Story 10.1: Standard report tiers
**As a** Supervisor, **I want** four report tiers with runtime filters **so that** I can analyse caseload and outcomes without manual preparation.

**Acceptance Criteria:**
- [ ] Given a report tier, when loaded, then content matches BRD §10.2 for that tier (FR-RPT-01).
- [ ] Given runtime filters (period, program, status, service event, owner), when changed, then all sections re-render (FR-RPT-02).
- [ ] Given any chart or table, when export clicked, then chart image and tabular export available; drill-down opens underlying records (FR-RPT-03).

#### Story 10.2: Custom report builder
**As a** Tenant Administrator, **I want** to build and share custom reports **so that** ad-hoc analytics are self-service.

**Acceptance Criteria:**
- [ ] Given builder access (not Platform Admin, Auditor, Liaison), when report built, then column selection, joins, filters, aggregates work (FR-RPT-04, FR-RPT-07).
- [ ] Given saved report, when listed, then preview, edit, export, and tenant share work (FR-RPT-05).
- [ ] Given subscription created, when saved, then email and frequency stored; delivery deferred (FR-RPT-06, BRD §3.2).

---

### Epic 11: Support Access

> Platform operator read-only support sessions. *Gaps: F9; FR-TEN-06/07; BR-TEN-04.*

#### Story 11.1: Support Access session
**As a** Platform Administrator, **I want** bounded read-only access to a named record **so that** I can diagnose tenant issues without standing PHI access.

**Acceptance Criteria:**
- [ ] Given ticket reference and reason, when session starts, then read-only banner displays and Tenant Admin is notified (FR-TEN-06).
- [ ] Given active session, when record retrieved by case/client reference, then view succeeds; browse/list/export/bulk actions fail (BR-TEN-04).
- [ ] Given session duration exceeded (default 4h), when expired, then access ends without silent extension (§4.4).
- [ ] Given Tenant Admin policy Disabled, when Platform Admin requests session, then denied (§4.4).

---

### Epic 12: Cross-Program Liaison

> Restricted lookup. *BR-LIA-01; prototype: liaison-lookup.html.*

#### Story 12.1: Liaison lookup
**As a** Cross-Program Liaison, **I want** to confirm client engagement **so that** I can route inquiries without clinical detail.

**Acceptance Criteria:**
- [ ] Given client search within tenant, when results return, then only name, program, case manager, and contact number display (BR-LIA-01).
- [ ] Given liaison role, when accessing operational pages, then redirect to lookup (§5.2).

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Tenant isolation | Enforced at data-access layer; automated cross-tenant read tests every release |
| NFR-02 | Performance | Search/lists ≤2s @ 50k clients; reports ≤5s; bulk reassignment 500 cases ≤30s |
| NFR-03 | Scalability | ≥25 tenants, 2,000 concurrent users; tenant performance isolation |
| NFR-04 | Availability | 99.5% business hours; RPO 24h; RTO 4h; single-tenant restore |
| NFR-05 | Security | Directory auth per tenant; MFA for admin/supervisor; encryption; service-layer RBAC |
| NFR-06 | Privacy | Least privilege; Support Access retention per statutory period |
| NFR-07 | Auditability | Immutable tenant audit log; exportable |
| NFR-08 | Accessibility | WCAG 2.1 AA |
| NFR-09 | Localisation | Full EN/ES; fail build on missing translation keys |
| NFR-10 | Configurability | Program/workflow/cadence/threshold changes without code release |
| NFR-11 | Usability | ≤3 clicks from sign-in to active case |
| NFR-12 | Responsiveness | Desktop/tablet full function; mobile read/log |

---

## 7. System & Data Architecture (High-Level)

Production follows **React + Python FastAPI + MongoDB** modular monolith (ADR-0017 exception — FastAPI primary API instead of Express). OpenAPI contract at `Docs/openapi.yaml`. Prototype `Docs/ui/` remains UI reference; production code in `codebase/web/` and `codebase/api/`. Deployed via Docker Compose (web + api + mongo).

### Key Entities

| Entity | Key Attributes | Relationships |
|--------|---------------|---------------|
| Tenant | id, status, config, branding | has many Users, Clients |
| User | id, tenant_id, role | belongs to Tenant |
| Client | id, tenant_id, demographics | has many Cases |
| Case | id, tenant_id, client_id, workflow, owner_id, status | belongs to Client; has Assignment history |
| CaseAssignment | id, case_id, from_owner, to_owner, type, reason | append-only history |
| AuditLog | id, tenant_id, actor, action, entity, timestamp | per tenant |

Full entity list: BRD §10.1, gaps D2.

### Integration Points

| System | Operation | Direction | Auth | Notes |
|--------|-----------|-----------|------|-------|
| Identity Provider (TBD) | OIDC/SAML login | Inbound | Per-tenant directory | Decision O1 — before auth SEED unit |
| Object storage (TBD) | Document upload/download | Outbound | IAM / signed URLs | Decision O2 — before documents SEED unit |

**OpenAPI alignment:** All owned APIs defined in `Docs/openapi.yaml`; implementation and contract tests reference operationIds.

### UI Reference Mapping

| Prototype module | HTML entry points | Production epic |
|------------------|-------------------|-----------------|
| clients | client-registration, client-search, client-profile, admin-duplicates, liaison-lookup | Epic 4, 12 |
| cases | case-creation, case-search, case-workspace, stage pages | Epic 5 |
| workflow | workflow-hub | Epic 7 |
| services | services-hub, bulk-enrollment, service-coordination | Epic 8 |
| documents | documents-hub | Epic 9 |
| analytics | reports, report-builder, custom-reports | Epic 10 |

---

## 8. User Flows (Key Scenarios)

### Flow 1: New client and case (happy path)
1. Case Manager signs in → lands on Case Creation.
2. Registers new client; duplicate check runs inline; no match above threshold.
3. Creates case: selects program subcategory; previews workflow; confirms.
4. Completes referral/intake on case workspace Intake tab.
5. Progresses through Assessment → Risk → Care Plan → Services.
6. System derives follow-up cadence from risk level.

**Error states:** Duplicate score ≥ threshold → warning before save; missing consent/DOB → incomplete intake flag and handoff queue.

### Flow 2: Case transfer with audit trail
1. Owning Case Manager opens case workspace → Assign.
2. Selects recipient; views caseload/high-risk counts.
3. Enters reason category and note; confirms.
4. Ownership updates; history row appended; recipient sees case in Newly Assigned queue.
5. Recipient acknowledges within 3 working days or supervisor escalates.

**Error states:** Missing reason → validation error; closed case → assignment blocked.

### Flow 3: Tenant onboarding (platform)
1. Platform Admin provisions tenant (Draft).
2. Seeds first Tenant Administrator.
3. Tenant Admin configures programs/workflows and creates users.
4. Readiness check passes → Platform Admin activates tenant.

---

## 9. Assumptions

See `Docs/SDD_Assumptions.md` for items derived from gaps with Confidence L or open decisions.

- **[A1]** Rolling Meadows Human Services is tenant one; four programs are configuration within that tenant (BRD A1).
- **[A2]** No cross-tenant data sharing (BRD A2).
- **[A3]** BAA required before tenant activation (BRD A3).
- **[A4]** Twelve workflows maintained centrally; tenants enable subset (BRD A4).
- **[A5]** `Docs/ui/` prototype is authoritative for operational UI unless change-controlled (BRD A5).
- **[A6]** HIPAA-aligned safeguards apply (BRD A6).
- **[A7]** One user account per tenant per person (BRD A7).
- **[A8]** Desktop/tablet primary; responsive web not native apps (BRD A8).

---

## 10. Constraints

- **Technical:** MERN stack per ADR-0001; OpenAPI-first API changes; tenant scoping non-negotiable.
- **Regulatory:** HIPAA-aligned handling; audit retention per tenant statutory period.
- **Prototype:** Do not extend `Docs/ui/` for production; migrate patterns to `codebase/`.
- **Delivery:** Stage-gated SDD; PR operations manual.

---

## 11. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Identity provider per tenant (O1) | Architecture | Before seed-02-auth-rbac |
| 2 | Document storage backend (O2) | Architecture | Before seed-09-documents |
| 3 | Cloud deployment target (O3) | Platform Ops | Before seed-00-bootstrap |
| 4 | Statutory retention default (O4) | Compliance | Before seed-01-platform-tenancy |
| 5 | BRD-RM-6.1 formal approval sign-off | Product | Before architecture stage |

---

## 12. Out of Scope (Parking Lot)

Candidate enhancements from BRD §12.2: tenant self-service billing; assignment approval workflow; workload-aware suggestions; team ownership; tenant form builder; client portal; SMS/email reminders; CBO transmission; predictive risk; offline capture; grant export packs.

---

## 13. Glossary

| Term | Definition |
|------|------------|
| Tenant | Distinct agency/data controller with isolated workspace |
| Workflow | Twelve program-specific service delivery templates |
| Form family | Determines intake questions, risk domains, note types per workflow |
| Support Access | Time-boxed, read-only platform operator access to named records |
| SEED Unit | Small PR-sized spec-driven delivery slice |

---

## Traceability Matrix (starter)

| Spec ID | FSD Epic | Prototype reference | OpenSpec (planned) |
|---------|----------|---------------------|-------------------|
| FR-TEN-* | Epic 1, 11 | — | openspec/specs/tenancy |
| FR-ADM-* | Epic 3 | — | openspec/specs/administration |
| FR-CLI-* | Epic 4 | Docs/ui/client-* | openspec/specs/client-management |
| FR-CASE-* | Epic 5 | Docs/ui/case-* | openspec/specs/case-lifecycle |
| FR-ASG-* | Epic 6 | case-workspace header | openspec/specs/case-assignment |
| FR-WFL-* | Epic 7 | workflow-hub.html | openspec/specs/workflow |
| FR-SVC-* | Epic 8 | services-hub.html | openspec/specs/services |
| FR-DOC-* | Epic 9 | documents-hub.html | openspec/specs/documents |
| FR-RPT-* | Epic 10 | reports.html | openspec/specs/reporting |
| BR-LIA-01 | Epic 12 | liaison-lookup.html | openspec/specs/access-control |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-03 | AI Draft | Initial FSD from BRD-RM-6.1 + Docs/ui + gaps questionnaire |

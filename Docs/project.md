# Rolling Meadows — Multi-Tenant Case Management Platform
## Business Requirements Document

| Field | Value | Field | Value |
|---|---|---|---|
| **Document ID** | BRD-RM-6.1 | **Version** | 6.1 |
| **Status** | For approval | **Supersedes** | BRD-RM-6.0 |
| **Prepared for** | Rolling Meadows Human Services | **Date** | September 2026 |
| **Audience** | Platform and program leadership, product owners, BAs, QA, delivery | **Languages** | English and Spanish |

### Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context and Objectives](#2-business-context-and-objectives)
3. [Scope](#3-scope)
4. [Tenancy Model and Administration](#4-tenancy-model-and-administration)
5. [Roles and Access Control](#5-roles-and-access-control)
6. [Service Model and Case Lifecycle](#6-service-model-and-case-lifecycle)
7. [Case Ownership and Assignment](#7-case-ownership-and-assignment)
8. [Functional Requirements](#8-functional-requirements)
9. [Business Rules](#9-business-rules)
10. [Data and Reporting Model](#10-data-and-reporting-model)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Risks and Future Enhancements](#12-risks-and-future-enhancements)

A unified system of record for community health and social service case delivery, operated as a multi-tenant platform. Each agency runs in an isolated workspace across four programs, twelve service workflows and a single eight-stage case lifecycle.

**What changed in version 6.1.** A tenant layer above the department, so the platform serves multiple agencies from one deployment; platform and tenant administration covering tenant lifecycle and configuration; formal case ownership with assignment history, so every transfer between case managers is recorded with actor, reason and timestamp; and a controlled Support Access mechanism giving the platform operator read-only access to tenant records for support purposes.

---

## 1. Executive Summary

Human services agencies deliver senior support, parenting support, mental health and community services through separate program teams. Client information, risk assessments, service enrolments and outcome reporting are held in program-specific spreadsheets and paper files. The same resident is registered more than once, staff cannot see that a client is already open elsewhere, follow-up depends on individual memory, case ownership changes are handed over verbally with no record, and every report is assembled by hand.

The Rolling Meadows Case Management Platform replaces that fragmentation with one client record, one case workspace and one reporting layer per agency. Every case follows a standard eight-stage lifecycle from Intake to Closure, while the questions, risk domains and deliverables inside each stage adapt to the specific service workflow. Duplicate detection runs at the point of entry, follow-up cadence is derived from assessed risk, case ownership is explicit and fully auditable, and leadership receives tiered analytics with no manual preparation.

The platform is delivered as a multi-tenant solution. Rolling Meadows Human Services is the founding tenant; further agencies are onboarded through configuration rather than a new deployment, each in a strictly isolated workspace with its own users, clients, configuration and reporting.

### 1.1  Target business outcomes

| **#** | **Outcome**                                      | **Measure**                                      | **Target**            |
|--------|--------------------------------------------------|--------------------------------------------------|-----------------------|
| **O1** | Eliminate duplicate client records               | Confirmed duplicate pairs per 1,000 clients      | < 5 (from ~40 today) |
| **O2** | Standardise the case process across all programs | Cases completing all mandatory stages            | ≥ 95%                 |
| **O3** | Prevent missed follow-ups on high-risk clients   | Overdue high-risk follow-ups at month end        | < 2%                 |
| **O4** | Give staff cross-program visibility of a client  | Time to identify existing engagement             | < 30 seconds         |
| **O5** | Remove manual reporting effort                   | Staff hours per monthly reporting cycle          | −80%                  |
| **O6** | Make case ownership traceable end to end         | Ownership changes with recorded actor and reason | 100%                  |
| **O7** | Onboard a new agency without a code release      | Elapsed time from agreement to tenant go-live    | ≤ 5 business days     |

### 1.2  Solution at a glance

| **Area** | **Detail** |
|---|---|
| **Tenancy**           | Multi-tenant: one deployment, many agencies; strict data isolation; per-tenant configuration, branding and reporting                                                                                      |
| **Administration**    | Platform Administrator manages tenants and platform health; Tenant Administrator manages users, configuration and case ownership within one agency                                                        |
| **Service model**     | Four programs and 12 service workflows, each with tailored forms, risk domains and deliverables                                                                                                           |
| **Case lifecycle**    | Intake → Assessment → Risk → Care Plan → Services → Follow-up → Reassessment → Closure, plus Documents and Activity                                                                                       |
| **Ownership**         | One accountable case manager at any time; assignment and reassignment recorded as immutable history                                                                                                       |
| **Core capabilities** | Registration with duplicate detection · unified case workspace · service coordination and bulk enrolment · document vault · task and handoff board · four report tiers plus a self-service report builder |

---

## 2. Business Context and Objectives

### 2.1  Problem statement

| **Problem**                    | **Business impact**                                                                                                                                                                            |
|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **No single client identity**  | The same resident is registered separately by each program; service history is invisible, effort is duplicated, and a liaison cannot confirm existing engagement without calling each program. |
| **Untracked case ownership**   | When staff leave, go on leave or rebalance caseloads, cases change hands verbally. Nobody can evidence who was accountable on a given date.                                                    |
| **Process varies by worker**   | Risk assessment, care planning and closure are inconsistently completed, weakening the evidence base for funding.                                                                              |
| **Follow-up is memory-driven** | High-risk clients are contacted late; there is no systemic view of what is overdue.                                                                                                            |
| **Manual reporting**           | Caseload, executive and grant reporting is assembled by hand each cycle, delaying decisions and introducing error.                                                                             |
| **No path to a second agency** | A neighbouring agency wanting the same capability would require a separate build, deployment and support line.                                                                                 |

### 2.2  Users and what they need

| **Role**                    | **Primary need**                                                                | **Success looks like**                                   |
|-----------------------------|---------------------------------------------------------------------------------|----------------------------------------------------------|
| **Platform Administrator**  | Provision, configure, monitor and suspend tenants across the platform           | New agency live in days; no access to client records     |
| **Tenant Administrator**    | Manage users, roles, service configuration and case ownership for one agency    | Correct access, current configuration, no orphaned cases |
| **Supervisor / Dept Admin** | See all active cases, resolve duplicates, reassign work, monitor staff activity | Balanced caseloads, clean data, no stalled handoffs      |
| **Case Manager**            | Run the full case lifecycle for a caseload of 20–40 clients in one place        | Every stage completed; nothing overdue                   |
| **Cross-Program Liaison**   | Confirm whether a client is engaged and reach the right case manager            | Correct routing without clinical detail                  |
| **Auditor**                 | Aggregate integrity and audit evidence only                                     | Read-only assurance with no case content                 |

### 2.3  Business objectives

- **BO-01** Establish one authoritative client record per tenant, with duplicate detection enforced at the point of entry.
- **BO-02** Standardise case delivery on a single eight-stage lifecycle while preserving program-specific clinical content.
- **BO-03** Make risk assessment drive operational behaviour — follow-up cadence, overdue alerts and supervisor escalation.
- **BO-04** Make case ownership explicit, transferable and permanently auditable, so accountability survives staff change.
- **BO-05** Operate multiple agencies from a single platform with guaranteed data isolation and per-tenant configuration.
- **BO-06** Enforce least privilege so liaison, audit and platform-operator functions are served without exposing client detail.
- **BO-07** Deliver self-service analytics, from caseload lists to executive outcome KPIs, in English and Spanish.

---

## 3. Scope

### 3.1  In scope

| **Module**                | **Business capability**                                                                                                        | **Primary users**                     |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------|
| **Tenant Management**     | Tenant provisioning, configuration, branding, activation, suspension and offboarding; platform health and usage monitoring     | Platform Admin                        |
| **Administration**        | User and role management, program and workflow configuration, service catalogue, retention and locale settings within a tenant | Tenant Admin                          |
| **Access**                | Authenticated sign-in, tenant resolution, role-specific landing page, access guards                                            | All                                   |
| **Client Management**     | Registration, search, 360° client profile, duplicate detection and merge                                                       | CM, Supervisor                        |
| **Case Management**       | Case creation by category, referral and intake, unified case workspace across ten tabs                                         | CM, Supervisor                        |
| **Case Assignment**       | Assign and reassign case ownership individually or in bulk, with mandatory reason and permanent history                        | CM, Supervisor, Tenant Admin          |
| **Cross-Program Liaison** | Restricted lookup returning program, owner and contact number only                                                             | Liaison                               |
| **Documents**             | Per-client document vault with upload, link and case-scoped views                                                              | CM, Supervisor                        |
| **Workflow**              | Task and handoff board, pipeline progress, newly assigned queue                                                                | CM, Supervisor                        |
| **Services**              | Enrolment, CBO referral tracking, service coordination hub, bulk allocation                                                    | CM, Supervisor                        |
| **Analytics**             | Four standard report tiers, custom reports, visual report builder, subscriptions                                               | CM, Supervisor, Tenant Admin, Auditor |

### 3.2  Out of scope for this release

| **Item**                                   | **Position**                                                                                   | **Disposition**                     |
|--------------------------------------------|------------------------------------------------------------------------------------------------|-------------------------------------|
| **Enterprise SSO and MFA**                 | Prototype uses a role selector; production requires directory-backed authentication per tenant | Deferred — mandatory before go-live |
| **Server-side persistence**                | Prototype stores data in the browser session only                                              | Deferred — mandatory before go-live |
| **Tenant self-service signup and billing** | Tenants are provisioned by the platform operator; no subscription or invoicing engine          | Deferred                            |
| **Cross-tenant client matching**           | Tenants are separate data controllers; no client, case or duplicate matching spans tenants     | Excluded by design                  |
| **Outbound email delivery**                | Report subscriptions and assignment notifications are captured but not despatched              | Deferred                            |
| **Public / client-facing portal**          | No self-service resident access in this release                                                | Deferred                            |
| **Billing, payroll and timesheets**        | Staff hours in reporting are a derived estimate, not a timekeeping record                      | Excluded                            |
| **Legacy data migration**                  | Record load strategy is a separate workstream per tenant                                       | Separate project                    |

### 3.3  Assumptions

| **#** | **Assumption** |
|---|---|
| **A1** | A tenant is a distinct operating agency or municipal department that is the data controller for its own client records. Rolling Meadows Human Services is tenant one; its four programs are configuration within that tenant, not separate tenants.                                                                                  |
| **A2** | No client, case, document, report or duplicate match is ever shared between tenants. Cross-program visibility operates strictly within one tenant.                                                                                                                                                                                   |
| **A3** | The Platform Administrator may access tenant client records for support purposes, but only through controlled Support Access (§4.4) — read-only, time-boxed, per-record and fully audited. The platform operator is therefore a Business Associate and a signed Business Associate Agreement is a precondition of tenant activation. |
| **A4** | The catalogue of twelve workflows, form families and risk domains is maintained centrally; a tenant enables the subset it delivers and may relabel it, but does not author new clinical content in this release.                                                                                                                     |
| **A5** | The approved prototype (Demo v8) represents agreed layouts, fields, validations and navigation for tenant-facing screens; production shall match it unless changed through formal change control.                                                                                                                                    |
| **A6** | Client records contain protected health and personal information; the platform is treated as an in-scope system for HIPAA-aligned safeguards.                                                                                                                                                                                        |
| **A7** | Users belong to exactly one tenant. A person working for two agencies holds two separate user accounts.                                                                                                                                                                                                                              |
| **A8** | Front-line staff work primarily on desktop and tablet; mobile support is responsive, not a native application.                                                                                                                                                                                                                       |

---

## 4. Tenancy Model and Administration

### 4.1  What is scoped to a tenant

Every record in the platform belongs to exactly one tenant. Tenant identity is resolved at sign-in and applied to every query, export and report; it is never supplied by the user interface or a URL parameter.

| **Tenant-scoped (isolated per agency)**        | **Platform-scoped (shared, operator-managed)**          |
|------------------------------------------------|---------------------------------------------------------|
| Users, roles and permissions                   | Tenant registry and lifecycle status                    |
| Clients, cases and all case records            | Workflow, form family and risk domain catalogue         |
| Programs, categories and subcategories enabled | Reference lists: closure reasons, note types, operators |
| Service events and CBO directory               | Language bundles (English, Spanish)                     |
| Documents and the audit log                    | Platform health, capacity and usage metrics             |
| Custom reports, subscriptions and branding     | Release version and feature flags                       |

### 4.2  Tenant lifecycle — platform administration flow

| **#** | **Stage**      | **Platform Administrator action**                                                                          | **Exit condition**                            |
|--------|----------------|------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| 1      | **Provision**  | Create tenant record: legal name, short code, primary contact, time zone, default locale, enabled programs | Tenant exists in Draft status                 |
| 2      | **Configure**  | Apply branding, enable workflows and service events, set retention period and password policy              | Configuration validated against the catalogue |
| 3      | **Seed users** | Create the first Tenant Administrator and issue activation; all further users are created by the tenant    | Tenant Administrator has signed in            |
| 4      | **Validate**   | Run the readiness check: at least one supervisor, one case manager, one enabled program and workflow       | Readiness check passes                        |
| 5      | **Activate**   | Set tenant to Active; sign-in opens to tenant users                                                        | Tenant is live                                |
| 6      | **Operate**    | Monitor usage, storage, error rate and licence consumption per tenant                                      | Within agreed thresholds                      |
| 7      | **Suspend**    | Set tenant to Suspended: sign-in blocked, data retained intact, no deletion                                | Reversible on reactivation                    |
| 8      | **Offboard**   | Export the full tenant dataset, obtain written authorisation, then purge after the retention period        | Certificate of destruction issued             |

### 4.3  Division of administrative responsibility

| **Responsibility**                             | **Platform Administrator**        | **Tenant Administrator**     |
|------------------------------------------------|-----------------------------------|------------------------------|
| **Create, suspend and offboard tenants**       | Yes                               | No                           |
| **Tenant branding and locale defaults**        | Sets at provisioning              | Maintains thereafter         |
| **Enable programs, workflows, service events** | Sets the permitted set            | Enables within that set      |
| **Create and deactivate users, assign roles**  | First administrator only          | All users                    |
| **Reassign case ownership, including in bulk** | No                                | Yes                          |
| **Merge duplicate clients**                    | No                                | Yes                          |
| **View client records and case detail**        | Read-only, under Support Access   | Yes, read-only               |
| **View the audit log**                         | Platform and tenant-config events | All events within the tenant |

### 4.4  Support Access

The platform operator requires sight of live records to diagnose and resolve tenant issues. Support Access provides this without creating standing access to protected health information across every tenant. It is a deliberate, bounded exception, not a permission.

| **Control**                | **Rule**                                                                                                                                             |
|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Read-only**              | Support Access grants view only. No create, edit, void, merge, assignment, export or bulk action is possible in any circumstance.                    |
| **Tenant consent**         | A tenant sets its policy to Always permitted, Per-session approval required, or Disabled. Default is per-session approval.                           |
| **Justification**          | Every session requires a support ticket reference and a written reason before any record is displayed.                                               |
| **Time-boxed**             | A session expires after a configurable period (default 4 hours) and cannot be silently extended.                                                     |
| **Targeted retrieval**     | Records are retrieved by a specific case number or client reference. Browsing, listing or searching the tenant client base is not available.         |
| **Visible**                | A persistent banner marks the session as support access, naming the operator and the tenant.                                                         |
| **Fully audited**          | Every record viewed is written to the tenant audit log with operator, ticket reference, entity, and timestamp — visible to the Tenant Administrator. |
| **Notified and revocable** | The Tenant Administrator is notified on session start and may terminate an active session or disable Support Access at any time.                     |

**Contractual precondition.** Because the operator can view protected health information, a Business Associate Agreement must be executed with each tenant before activation, and Support Access audit records must be retained for the tenant’s statutory retention period.

---

## 5. Roles and Access Control

### 5.1  Permission matrix

| **Permission**                                   | **Platform Admin** | **Tenant Admin** | **Supervisor** | **Case Manager** | **Liaison** | **Auditor** |
|--------------------------------------------------|--------------------|------------------|----------------|------------------|-------------|-------------|
| **Manage tenants and platform settings**         | ✓                  | —                | —              | —                | —           | —           |
| **View client records under Support Access**     | Support            | —                | —              | —                | —           | —           |
| **Manage users, roles and tenant configuration** | —                  | ✓                | —              | —                | —           | —           |
| **View case detail and workspace**               | —                  | ✓                | ✓              | ✓                | —           | —           |
| **Create and edit cases**                        | —                  | —                | ✓              | ✓                | —           | —           |
| **Assign own case to another case manager**      | —                  | ✓                | ✓              | ✓                | —           | —           |
| **Reassign any case, including in bulk**         | —                  | ✓                | ✓              | —                | —           | —           |
| **Void own records (with reason)**               | —                  | —                | ✓              | ✓                | —           | —           |
| **Void any record (with reason)**                | —                  | ✓                | ✓              | —                | —           | —           |
| **Bulk service enrolment**                       | —                  | —                | ✓              | ✓                | —           | —           |
| **Merge duplicate clients**                      | —                  | ✓                | ✓              | —                | —           | —           |
| **View cross-program engagement flag**           | —                  | ✓                | ✓              | ✓                | ✓           | —           |
| **Caseload, executive and operational reports**  | —                  | ✓                | ✓              | ✓                | —           | —           |
| **Integrity and audit reports**                  | —                  | ✓                | ✓              | ✓                | —           | ✓           |
| **Global read-only enforcement**                 | —                  | ✓                | —              | —                | —           | ✓           |

**Scope rules.** A Case Manager sees their own caseload; a Supervisor sees all active cases in their program; a Tenant Administrator sees the whole tenant but cannot create or edit case content. Every role is confined to a single tenant. The Platform Administrator operates across tenants and may view client records only through Support Access, read-only and audited.

### 5.2  Landing page and access guards

| **Role**                   | **Landing on sign-in**      | **Guard behaviour**                                                                                                                      |
|----------------------------|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| **Platform Administrator** | Tenant Console              | Blocked from tenant operational pages except through a live Support Access session, which is read-only, ticket-referenced and time-boxed |
| **Tenant Administrator**   | Administration Console      | Full read access within the tenant; case content is read-only                                                                            |
| **Supervisor**             | Case Creation               | Full operational access, plus duplicate administration and reassignment                                                                  |
| **Case Manager**           | Case Creation               | Operational access within own caseload scope                                                                                             |
| **Cross-Program Liaison**  | Cross-Program Lookup        | Any attempt to reach dashboard, case or client detail redirects to lookup                                                                |
| **Auditor**                | Integrity and Audit reports | Any other report tier or operational page redirects to the integrity tier                                                                |

- **BR-AUTH-01** Unauthenticated users shall be redirected to sign-in from any protected page.
- **BR-AUTH-02** Tenant identity shall be derived from the authenticated user and applied server-side to every query; it shall never be accepted from the client.
- **BR-AUTH-03** Access shall be denied at the service layer as well as hidden in navigation; concealment is not a control.

---

## 6. Service Model and Case Lifecycle

### 6.1  Programs, subcategories and workflows

Each program owns one case category with three subcategories. Each subcategory maps to a workflow that determines stage labels, deliverables, focus areas and the form family — which in turn defines referral sources and reasons, intake questions, assessment labels, risk domains, note types, reassessment triggers and closure fields.

| **Program / category**        | **Subcategories and workflows**                                                                              | **Form families**              |
|-------------------------------|--------------------------------------------------------------------------------------------------------------|--------------------------------|
| **Senior Social Services**    | Seniors at Risk · In-Home Support · Nutrition Programs                                                       | Senior, In-home, Nutrition     |
| **Parenting Support**         | Youth Empowerment (School Attendance Support) · Family Resource Center · Parent Education (Parenting Skills) | Parenting                      |
| **Mental Health Services**    | Crisis Response · Outpatient Counseling · Peer Support                                                       | Mental health                  |
| **Community Social Services** | Housing Assistance (Family Stability) · Employment Support · General Intake (Community Intake)               | Parenting, Employment, General |

**BR-WF-01** Subcategory selection at case creation shall determine the workflow, stage labels, deliverables, focus areas and form family for the entire case. A default workflow shall apply where no mapping exists. Only workflows enabled for the tenant shall be selectable.

### 6.2  The eight-stage case lifecycle

| **#** | **Stage**        | **Business purpose**                                                                         | **Completion evidence**                             |
|--------|------------------|----------------------------------------------------------------------------------------------|-----------------------------------------------------|
| 1      | **Intake**       | Capture the referral and register or match the client; screen for immediate need and consent | Referral recorded, intake complete, consent on file |
| 2      | **Assessment**   | Document the comprehensive assessment of the client situation                                | Assessment notes recorded                           |
| 3      | **Risk**         | Rate each risk domain and derive an overall risk level                                       | Risk assessment saved with composite score          |
| 4      | **Care Plan**    | Agree the issues, goals and services that will address assessed risk                         | At least one active care plan item                  |
| 5      | **Services**     | Enrol the client in services and raise CBO referrals                                         | Enrolment or referral recorded                      |
| 6      | **Follow-up**    | Contact the client at the cadence set by risk level and log the outcome                      | Case note logged within cadence                     |
| 7      | **Reassessment** | Re-rate risk on trigger or timer and compare against baseline                                | Reassessment recorded                               |
| 8      | **Closure**      | Record reason, outcomes achieved, remaining risk and onward referral                         | Closure record complete; case set to closed         |

Documents and Activity are available at every stage. Stage status is derived from the presence of its completion evidence, not set manually; the first incomplete stage is shown as in progress.

---

## 7. Case Ownership and Assignment

### 7.1  Ownership model

Every case has exactly one accountable case manager at any point in time. Ownership is established at case creation and changes only through an explicit assignment event. Assignment is never a silent field update: it is a recorded transaction with a source owner, a target owner, an actor, a reason and a timestamp.

| **Assignment type**       | **Initiated by**           | **When used**                                                                                     |
|---------------------------|----------------------------|---------------------------------------------------------------------------------------------------|
| **Initial**               | System at case creation    | The creating case manager becomes the owner; supervisors may create on behalf of another worker   |
| **Transfer**              | Owning Case Manager        | The current owner hands a case to a named colleague — specialism, language, geography or workload |
| **Directed reassignment** | Supervisor or Tenant Admin | Caseload rebalancing, escalation, performance or conduct-related reallocation                     |
| **Bulk reassignment**     | Supervisor or Tenant Admin | Staff departure, extended leave or team restructure — many cases moved in one transaction         |
| **Claim**                 | Supervisor                 | Taking ownership of an unassigned or stalled case from the handoff queue                          |
| **Coverage**              | Supervisor or Tenant Admin | Temporary ownership for a defined period, reverting automatically to the substantive owner        |

### 7.2  Assignment flow

| **#** | **Step**                 | **Behaviour**                                                                           | **Validation**                                                              |
|--------|--------------------------|-----------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| 1      | **Initiate**             | Actor opens Assign from the case workspace header, the caseload table or the task board | Actor holds assign or reassign permission; case is not closed               |
| 2      | **Select recipient**     | Eligible case managers listed with current open caseload and high-risk count            | Recipient is active, in the same tenant, and permitted for the case program |
| 3      | **State reason**         | Reason category selected and free-text note captured                                    | Both mandatory; note minimum length enforced                                |
| 4      | **Set effective period** | Immediate by default; coverage assignments carry an end date                            | End date must be in the future                                              |
| 5      | **Confirm**              | Confirmation summarises current owner, new owner, reason and effective date             | Explicit confirmation required                                              |
| 6      | **Apply**                | Ownership updates, history row written, audit entry written, recipient notified         | Atomic — ownership and history succeed or fail together                     |
| 7      | **Acknowledge**          | Case appears in the recipient’s Newly Assigned queue until acknowledged                 | Unacknowledged beyond 3 working days escalates to the supervisor            |

### 7.3  Assignment history

Assignment history is permanent, append-only and visible on the case workspace, the client 360° profile and the Activity tab. It answers, for any date, who was accountable for this case and why it changed.

| **Item** | **Detail** |
|---|---|
| **Recorded fields**   | Case reference · previous owner · new owner · assignment type · actor · reason category · reason note · effective from · effective to · acknowledged at · timestamp                         |
| **Reason categories** | Caseload balancing · specialism or language match · geographic reassignment · staff departure · planned leave · escalation · client request · conflict of interest · other (note mandatory) |
| **Reporting**         | Assignment volume by actor and reason; average case tenure per manager; cases reassigned more than twice; unacknowledged assignments                                                        |

---

## 8. Functional Requirements

Requirements are stated as business capability. Field-level layouts, validation messages and click behaviour remain governed by the approved prototype and the screen-level UI specification.

### 8.1  Tenant management and administration

| **ID** | **Requirement** |
|---|---|
| **FR-TEN-01** | The system shall allow a Platform Administrator to create a tenant with legal name, short code, primary contact, time zone, default locale and enabled programs.                                                                                |
| **FR-TEN-02** | The system shall maintain tenant status as Draft, Active, Suspended or Offboarded, and shall block sign-in for any status other than Active.                                                                                                    |
| **FR-TEN-03** | The system shall prevent activation until a readiness check passes: at least one tenant administrator, one supervisor, one case manager and one enabled program and workflow.                                                                   |
| **FR-TEN-04** | The system shall present a platform console listing every tenant with status, user count, active case count, storage consumed and last activity.                                                                                                |
| **FR-TEN-05** | The system shall support full export of a single tenant dataset for offboarding, and shall require recorded written authorisation before any purge.                                                                                             |
| **FR-TEN-06** | The system shall provide a Support Access session allowing a Platform Administrator read-only retrieval of a named client or case, requiring a ticket reference and reason, expiring automatically, and displaying a persistent support banner. |
| **FR-TEN-07** | The system shall allow a Tenant Administrator to set the tenant Support Access policy, view every support session and record viewed, and terminate an active session.                                                                           |
| **FR-ADM-01** | The system shall allow a Tenant Administrator to create, edit, deactivate and reactivate users, and to assign exactly one role per user.                                                                                                        |
| **FR-ADM-02** | The system shall prevent deactivation of a user who owns open cases until those cases have been reassigned.                                                                                                                                     |
| **FR-ADM-03** | The system shall allow a Tenant Administrator to enable or disable programs, subcategories, workflows and service events from the permitted catalogue, and to relabel them for local terminology.                                               |
| **FR-ADM-04** | The system shall allow a Tenant Administrator to configure branding, default locale, duplicate threshold, follow-up cadence values and retention period.                                                                                        |
| **FR-ADM-05** | The system shall record every administrative change to users, roles and configuration in the tenant audit log with actor, before value, after value and timestamp.                                                                              |

### 8.2  Case assignment

| **ID** | **Requirement** |
|---|---|
| **FR-ASG-01** | The system shall assign an owning case manager at case creation and shall not permit a case to exist without an owner.                                          |
| **FR-ASG-02** | The system shall allow an owning case manager to transfer their case to another eligible case manager within the same tenant.                                   |
| **FR-ASG-03** | The system shall allow a Supervisor or Tenant Administrator to reassign any case in scope, individually or in bulk by current owner, program or risk level.     |
| **FR-ASG-04** | The system shall require a reason category and a free-text note for every assignment, and shall reject an assignment without them.                              |
| **FR-ASG-05** | The system shall display each candidate recipient’s current open caseload and high-risk count at the point of selection.                                        |
| **FR-ASG-06** | The system shall support coverage assignments with an effective end date, reverting ownership automatically to the substantive owner on expiry.                 |
| **FR-ASG-07** | The system shall write an immutable assignment history record for every ownership change and shall never overwrite or delete prior records.                     |
| **FR-ASG-08** | The system shall present assignment history on the case workspace, the client 360° profile and the Activity tab, in reverse chronological order.                |
| **FR-ASG-09** | The system shall place newly assigned cases in the recipient’s Newly Assigned queue and escalate to the supervisor if unacknowledged beyond three working days. |
| **FR-ASG-10** | The system shall block assignment of a closed case, and shall reassign to the actor on reopen.                                                                  |

### 8.3  Client and case management

| **ID** | **Requirement** |
|---|---|
| **FR-CLI-01**  | The system shall register a client with name, phone and address mandatory, and date of birth optional but required for a complete intake.                                                                                                                             |
| **FR-CLI-02**  | The system shall run duplicate detection on name, phone and date of birth as the user types, within the tenant only, warning before save, and shall display a cross-program engagement flag where the client is already active in another program in the same tenant. |
| **FR-CLI-03**  | The system shall route a registration to case creation as urgent where an emergency trigger, service need or emergency contact reason is captured; otherwise it completes as registration-only.                                                                       |
| **FR-CLI-04**  | The system shall support client search by name, phone or address, including fuzzy name matching, surfacing duplicate pairs within the result set.                                                                                                                     |
| **FR-CLI-05**  | The system shall present a 360° client profile showing demographics, all cases, ownership history and every stage deliverable.                                                                                                                                        |
| **FR-CLI-06**  | The system shall provide a duplicate queue with side-by-side comparison, survivor selection, merge and dismiss, each written to the audit log.                                                                                                                        |
| **FR-CASE-01** | The system shall create a case from a mandatory category and subcategory selection, previewing the resulting workflow before the user commits.                                                                                                                        |
| **FR-CASE-02** | The system shall capture referral source, reason and referrer, intake screening questions specific to the form family, and a consent indicator.                                                                                                                       |
| **FR-CASE-03** | The system shall present all eight stages plus Documents and Activity as tabs within a single case workspace, with a stepper showing progress.                                                                                                                        |
| **FR-CASE-04** | The system shall rate each risk domain as Low, Medium or High, calculate a composite score and derive an overall risk level, allowing a documented override note.                                                                                                     |
| **FR-CASE-05** | The system shall record care plan items (issue, goal, service, status), service enrolments and CBO referrals against the case, each voidable with a mandatory reason.                                                                                                 |
| **FR-CASE-06** | The system shall log follow-up contacts by type and display the required cadence derived from the current risk level.                                                                                                                                                 |
| **FR-CASE-07** | The system shall record reassessments against a trigger, retain previous ratings and update the current risk level.                                                                                                                                                   |
| **FR-CASE-08** | The system shall require closure reason, services provided, outcomes achieved, remaining risks and onward referral before a case may be closed.                                                                                                                       |
| **FR-CASE-09** | The system shall make a closed case read-only while retaining full history, ownership history and audit trail.                                                                                                                                                        |
| **FR-CASE-10** | The system shall support case search by free text, category, cascading subcategory and current owner.                                                                                                                                                                 |

### 8.4  Workflow, services, documents and reporting

| **ID** | **Requirement** |
|---|---|
| **FR-WFL-01** | The system shall present a task and handoff board showing pipeline progress across the eight stages, the current stage and the current owner for every case in scope. |
| **FR-WFL-02** | The system shall queue cases for handoff where intake is incomplete, the risk stage is in progress, or an assignment is unacknowledged.                               |
| **FR-SVC-01** | The system shall provide a service coordination hub showing active caseload, open CBO referrals and enrolment counts per client.                                      |
| **FR-SVC-02** | The system shall support bulk enrolment of filtered cohorts — all, high risk, or incomplete intake — into a selected service event.                                   |
| **FR-DOC-01** | The system shall maintain a per-client document vault supporting upload and external links, accessible from the client list and the case workspace.                   |
| **FR-RPT-01** | The system shall provide four standard report tiers: Caseload and Program, Executive, Operational, and Integrity and Audit, scoped to the tenant.                     |
| **FR-RPT-02** | All report pages shall support runtime filters for period, program, case status, service event and case owner, re-rendering every section on change.                  |
| **FR-RPT-03** | Every report shall support chart image and tabular export, and drill-down from chart or table into the underlying client records.                                     |
| **FR-RPT-04** | The system shall allow users to build custom table and chart reports across the reporting entities, using column selection, joins, filter operators and aggregates.   |
| **FR-RPT-05** | The system shall allow saved custom reports to be listed, previewed, edited, exported and shared within the tenant.                                                   |
| **FR-RPT-06** | The system shall allow a user to subscribe to a report by email address and frequency (daily, weekly, monthly).                                                       |
| **FR-RPT-07** | The report builder shall be unavailable to platform administrator, auditor and liaison roles.                                                                         |

---

## 9. Business Rules

### 9.1  Duplicate detection

A similarity score is calculated between any two client records within the same tenant. A score of 25 or above marks a possible duplicate, triggering an inline warning at data entry and placing the pair in the duplicate queue. The threshold is configurable per tenant.

| **Match condition**                | **Points** | **Rationale**                               |
|------------------------------------|------------|---------------------------------------------|
| **Exact name match**               | 50         | Strongest single indicator                  |
| **Name within edit distance of 2** | 35         | Catches spelling and transcription variance |
| **Name substring match**           | 25         | Catches nickname and partial-name entry     |
| **Normalised phone match**         | 40         | Household-level indicator, high precision   |
| **Date of birth match**            | 30         | Corroborating, weak alone                   |

### 9.2  Operational rules

| **ID** | **Rule** |
|---|---|
| **BR-TEN-01**   | Every record shall carry a tenant reference. Any query, export or report returning a record outside the requesting user’s tenant is a critical defect.                                                                                                                                                                                   |
| **BR-TEN-02**   | Client, case and duplicate matching shall never span tenants. Case numbers are unique within a tenant, not globally.                                                                                                                                                                                                                     |
| **BR-TEN-03**   | A suspended tenant retains all data intact; suspension blocks sign-in and processing but shall not delete or degrade records.                                                                                                                                                                                                            |
| **BR-TEN-04**   | Platform Administrator access to tenant client data is permitted only within an active Support Access session: read-only, ticket-referenced, time-boxed, retrieved by specific record, notified to the tenant administrator and written to the tenant audit log. Support Access shall never permit a write, an export or a bulk listing. |
| **BR-ASG-01**   | A case shall have exactly one owner at any instant. Ownership changes are transactional: the history record and the ownership update succeed or fail together.                                                                                                                                                                           |
| **BR-ASG-02**   | A reason category and note are mandatory on every assignment. Assignment history is append-only and shall never be edited or deleted, including after case closure.                                                                                                                                                                      |
| **BR-ASG-03**   | A recipient must be an active user in the same tenant, holding a case-managing role, and permitted for the case program.                                                                                                                                                                                                                 |
| **BR-ASG-04**   | A user with open cases cannot be deactivated until every case is reassigned; bulk reassignment is the supported route.                                                                                                                                                                                                                   |
| **BR-ASG-05**   | Coverage assignments revert automatically on their end date; the reversion is itself recorded as an assignment event.                                                                                                                                                                                                                    |
| **BR-ASG-06**   | Ownership transfers on confirmation, not on acceptance. The recipient is accountable from that moment; acknowledgement is tracked for supervision, and its absence escalates but does not reverse the transfer.                                                                                                                          |
| **BR-INT-01**   | A case shall be flagged as an incomplete intake when date of birth is missing or consent is not on file. Incomplete cases remain on intake and appear in the handoff queue.                                                                                                                                                              |
| **BR-RISK-01**  | Domain ratings score Low = 1, Medium = 2, High = 3. Composite score is the domain average multiplied by 25 and rounded. Overall risk is High at an average of 2.5 or above, Medium at 1.5 or above, otherwise Low. A risk override note is documentation only and shall not alter the calculated score or level.                         |
| **BR-FU-01**    | Follow-up cadence derives from overall risk: High weekly (7 days), Medium monthly (30 days), Low quarterly (90 days). Cadence values are configurable per tenant.                                                                                                                                                                        |
| **BR-FU-02**    | A case is overdue when days elapsed since the last case note, or the case open date where none exists, meet or exceed the cadence.                                                                                                                                                                                                       |
| **BR-VOID-01**  | Enrolments, care plan items and case notes shall be voided rather than deleted, with a mandatory reason written to the audit log.                                                                                                                                                                                                        |
| **BR-CLOSE-01** | Closure requires explicit confirmation. Once closed, the workspace is read-only for all roles.                                                                                                                                                                                                                                           |
| **BR-AUDIT-01** | Every create, update, merge, void, assignment, configuration change and closure shall be recorded with tenant, actor, action, entity reference, reason and timestamp.                                                                                                                                                                    |
| **BR-LIA-01**   | Liaison results shall be limited to client name, program, case manager and contact number, within the tenant only.                                                                                                                                                                                                                       |

---

## 10. Data and Reporting Model

### 10.1  Core business entities

| **Group**        | **Entities**                                                                                          |
|------------------|-------------------------------------------------------------------------------------------------------|
| **Tenancy**      | Tenant, Tenant Configuration, Tenant Feature Enablement, Platform Audit Log                           |
| **Identity**     | User, Role Assignment, Client                                                                         |
| **Case record**  | Case, Case Assignment (history), Referral, Intake, Risk Assessment, Reassessment, Case Closure        |
| **Delivery**     | Care Plan, Service Enrolment, CBO Referral, Case Note, Document                                       |
| **Program data** | Program, Category, Subcategory, Workflow, Form Family, Service Event, Initiative, Service Utilisation |
| **Analytics**    | Custom Report, Report Subscription, Tenant Audit Log                                                  |

A tenant holds many users and clients. A client may hold multiple cases across multiple programs within that tenant. Every case belongs to one client, one program, one category and one subcategory, and has exactly one current owner plus an ordered chain of assignment history records. Assessments, care plan items, enrolments, notes and documents attach to the client and are scoped to the case in which they were created. Every entity carries a tenant reference.

### 10.2  Report tiers

| **Tier**               | **Audience**                          | **Content**                                                                                                                                                        |
|------------------------|---------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Caseload & Program** | CM, Supervisor, Tenant Admin          | Clients by program, multi-program enrolment, caseload by risk, event enrolment, overdue follow-ups, open CBO referrals                                             |
| **Executive**          | Supervisor, Tenant Admin              | Community impact totals, zip and age distribution, initiative performance, outcome KPIs (referral completion, time to service, 7-day intake rate, enrolment trend) |
| **Operational**        | Supervisor, Tenant Admin              | Subdivision caseload, service utilisation trend, staff activity, caseload distribution and assignment turnover by manager                                          |
| **Integrity & Audit**  | CM, Supervisor, Tenant Admin, Auditor | Duplicate pairs, incomplete intakes, registration-only records, unassigned or unacknowledged cases, and the full tenant audit log                                  |

---

## 11. Non-Functional Requirements

| **ID**     | **Category**     | **Requirement**                                                                                                                                                                                                     |
|------------|------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **NFR-01** | Tenant isolation | Tenant scoping shall be enforced at the data-access layer, not in application code alone, and covered by automated tests that attempt cross-tenant reads on every release.                                          |
| **NFR-02** | Performance      | Search and list views shall return within 2 seconds at 50,000 clients and 100,000 cases per tenant; reports within 5 seconds; bulk reassignment of 500 cases within 30 seconds.                                     |
| **NFR-03** | Scalability      | At least 25 tenants and 2,000 concurrent users on one deployment, with no tenant able to degrade another’s performance.                                                                                             |
| **NFR-04** | Availability     | 99.5% availability in business hours; recovery point objective 24 hours, recovery time 4 hours; restore possible for a single tenant.                                                                               |
| **NFR-05** | Security         | Directory-backed authentication per tenant, with multi-factor for administrator and supervisor roles; role and tenant checks enforced at the service layer; encryption in transit and at rest.                      |
| **NFR-06** | Privacy          | Least-privilege access and minimum necessary disclosure for liaison, auditor and support-access roles; Support Access records retained for the tenant statutory period; retention schedule configurable per tenant. |
| **NFR-07** | Auditability     | An immutable audit log per tenant covering all state changes including ownership, retained for the statutory period and exportable.                                                                                 |
| **NFR-08** | Accessibility    | WCAG 2.1 AA: keyboard operability on all interactive rows and controls, visible focus, sufficient contrast, and screen-reader labelling.                                                                            |
| **NFR-09** | Localisation     | Complete English and Spanish coverage of interface, form and domain labels, switchable without loss of work in progress.                                                                                            |
| **NFR-10** | Configurability  | Programs, subcategories, workflows, form families, risk domains, service events, duplicate threshold and cadence values shall be configurable without a code release.                                               |
| **NFR-11** | Usability        | Consistent tabbed workspace, breadcrumb navigation and drill-down drawers; no more than three clicks from sign-in to any active case.                                                                               |
| **NFR-12** | Responsiveness   | Full functionality on desktop and tablet; read and log actions usable on mobile.                                                                                                                                    |

---

## 12. Risks and Future Enhancements

### 12.1  Key risks

| **#** | **Risk**                                                                                                          | **Severity** | **Mitigation**                                                                                                                                                                   |
|--------|-------------------------------------------------------------------------------------------------------------------|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **R1** | Cross-tenant data leakage through a query, export or report that omits the tenant filter                          | Critical     | Tenant scoping enforced at the data-access layer; automated cross-tenant tests as a release gate; no client-supplied tenant identifier                                           |
| **R2** | Prototype uses browser-session storage and a role selector; production security and persistence are unbuilt       | High         | Treat the backend and identity workstream as a mandatory gate; no live client data until it is closed                                                                            |
| **R3** | Support Access becomes a standing route to client PHI across every tenant, or is used to bulk-extract records     | High         | Read-only, no export or listing; named-record retrieval only; ticket reference, tenant-set policy, auto-expiry, per-record audit, tenant-side termination; BAA before activation |
| **R4** | Twelve workflows with distinct form families, multiplied by per-tenant configuration, create a large test surface | High         | Drive all variation from configuration; regression pack covering all twelve workflows and a representative tenant configuration set                                              |
| **R5** | Assignment history is incomplete if ownership can be changed by any route other than the assignment transaction   | High         | Owner is a derived field with no direct write path; reject any update not carrying a history record                                                                              |
| **R6** | Duplicate threshold of 25 may produce excessive false positives at scale                                          | Medium       | Threshold configurable per tenant; tune against a live data sample before go-live                                                                                                |
| **R7** | Staff resistance where the current process is paper-based and handovers are informal                              | Medium       | Role-based training, supervised pilot with one program, parallel-run period                                                                                                      |
| **R8** | Spanish content drift as forms and tenant relabelling evolve                                                      | Medium       | Fail the build on missing translation keys; treat localisation as a release gate                                                                                                 |

### 12.2  Candidate enhancements

Recorded as future scope, not part of this baseline: tenant self-service signup and subscription billing · assignment approval requiring recipient acceptance before transfer · workload-aware assignment suggestions · secondary and team-based ownership · tenant-authored form builder · client-facing portal with appointment self-service · SMS and email reminders driven by follow-up cadence · direct CBO referral transmission with status callback · predictive risk scoring · offline field capture for home visits · grant reporting export packs.

**Approval.** Sign-off on this document establishes the business baseline for build. Changes to scope, business rules or the approved prototype after approval shall be raised through formal change control.

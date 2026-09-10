# Assumptions & Gap Handling: Gaps Questionnaire: Rolling Meadows Case Management Platform

**Source:** `Discovery and Design/gap-questionnaire.json`
**Gaps version:** 1.0  
**Date:** 2026-09-03  
**Gaps status:** In progress

---

## Summary

The following items were **not fully addressed** in the gaps questionnaire (missing answer and/or confidence L, plus open decisions). They are handled as explicit assumptions so the SDD process can remain traceable.

## Unresolved items → handling

For each item below, choose one handling approach and keep it consistent with the FSD and implementation plan:

- **Assume & proceed**: state the assumption clearly; implement to that assumption; revisit later.
- **Defer**: mark out of scope for current phase; add to backlog.
- **Block**: stop downstream work until resolved (recommended for high-risk unknowns).

### I1
- **Type**: gap
- **Item**: What authentication mechanism is required for production?
- **Current answer/options**: Directory-backed authentication per tenant with MFA for administrator and supervisor roles (NFR-05). Prototype uses role selector only — deferred SSO/MFA integration is mandatory before go-live (BRD §3.2). Specific IdP (Azure AD, Okta, etc.) not named in BRD.
- **Owner**: Architecture
- **Confidence**: L
- **Handling**: _[Assume & proceed | Defer | Block]_
- **Assumption statement**: _[what we will assume]_
- **Impact**: _[what could change if assumption is wrong]_
- **Follow-up**: _[who + when + how to validate]_

### I4
- **Type**: gap
- **Item**: How will document storage work?
- **Current answer/options**: Per-client document vault with upload and external links (FR-DOC-01). Storage backend (object store vs MongoDB GridFS) not specified in BRD — to be decided in architecture.
- **Owner**: Architecture
- **Confidence**: L
- **Handling**: _[Assume & proceed | Defer | Block]_
- **Assumption statement**: _[what we will assume]_
- **Impact**: _[what could change if assumption is wrong]_
- **Follow-up**: _[who + when + how to validate]_

### O1
- **Type**: decision
- **Item**: Identity provider per tenant
- **Current answer/options**: Options: Azure AD; Okta; Auth0; Generic OIDC/SAML — confirm with Rolling Meadows IT
- **Owner**: Architecture
- **Handling**: _[Assume & proceed | Defer | Block]_
- **Assumption statement**: _[what we will assume]_
- **Impact**: _[what could change if assumption is wrong]_
- **Follow-up**: _[who + when + how to validate]_

### O2
- **Type**: decision
- **Item**: Document blob storage backend
- **Current answer/options**: Options: S3-compatible object store; Azure Blob; GridFS in MongoDB
- **Owner**: Architecture
- **Handling**: _[Assume & proceed | Defer | Block]_
- **Assumption statement**: _[what we will assume]_
- **Impact**: _[what could change if assumption is wrong]_
- **Follow-up**: _[who + when + how to validate]_

### O3
- **Type**: decision
- **Item**: Cloud deployment target
- **Current answer/options**: Options: AWS; Azure; GCP — region and tenancy model
- **Owner**: Platform Ops
- **Handling**: _[Assume & proceed | Defer | Block]_
- **Assumption statement**: _[what we will assume]_
- **Impact**: _[what could change if assumption is wrong]_
- **Follow-up**: _[who + when + how to validate]_

### O4
- **Type**: decision
- **Item**: Statutory retention period default
- **Current answer/options**: Options: Confirm with Legal/Compliance per tenant type (HIPAA minimum 6 years often cited)
- **Owner**: Compliance
- **Handling**: _[Assume & proceed | Defer | Block]_
- **Assumption statement**: _[what we will assume]_
- **Impact**: _[what could change if assumption is wrong]_
- **Follow-up**: _[who + when + how to validate]_

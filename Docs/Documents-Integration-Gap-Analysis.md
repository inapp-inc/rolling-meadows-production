# Documents Module — Integration Gap Analysis

**Purpose:** Deep comparison of the UI mock (`Docs/ui`) against the React frontend (`codebase/web`) and the existing API (`codebase/api`), so backend work can be scoped with confidence.

**Requirement anchor:** FR-DOC-01 — *per-client document vault supporting upload and external links, accessible from the client list and case workspace* (`Docs/project.md`, Epic 9 in `Docs/FSD-Rolling-Meadows.md`).

**Last updated:** 2026-09-08 — Phase A frontend mock parity completed (shared vault panel, seed v30, responsive hub).

**Prototype references:**

| Surface | HTML | JS |
|---------|------|-----|
| Documents Hub (caseload list + vault drawer) | `Docs/ui/documents-hub.html` | `Docs/ui/js/pages/documents-hub.js` |
| Document service (shared logic) | — | `Docs/ui/js/services/documentService.js` |
| Document repository | — | `Docs/ui/js/repositories/documentRepository.js` |
| Case workspace — Documents tab | `Docs/ui/case-workspace.html` | `Docs/ui/js/pages/case-workspace.js` → `renderDocumentsTab` |
| Client 360° profile — Documents section | `Docs/ui/client-profile.html` | `Docs/ui/js/pages/client-profile.js` → `renderDocumentsSection` |

**React references:**

| Surface | Path |
|---------|------|
| Documents Hub page | `codebase/web/src/pages/documents/DocumentsHubPage.tsx` |
| Vault drawer body | `codebase/web/src/components/DocumentVaultDrawerBody.tsx` |
| **Shared vault panel** | `codebase/web/src/components/DocumentVaultPanel.tsx` |
| **Shared document list** | `codebase/web/src/components/DocumentVaultList.tsx` |
| File preview modal | `codebase/web/src/components/FilePreviewModal.tsx` |
| Document helpers (client-side) | `codebase/web/src/mock/documentService.ts` |
| Case workspace — Documents tab | `codebase/web/src/pages/cases/CaseStageTabs.tsx` → delegates to `DocumentVaultPanel` |
| Client profile — Documents section | `codebase/web/src/pages/clients/ClientProfilePage.tsx` → `DocumentVaultPanel` |
| Mock mutations | `codebase/web/src/mock/workspaceService.ts` |
| REST client stubs | `codebase/web/src/api/client.ts` → `documentsApi` |
| Backend router (partial) | `codebase/api/app/routers/documents.py` |
| Responsive styles | `codebase/web/public/css/components.css`, `pages.css` |

---

## Executive summary

**Frontend mock parity (Phase A) is complete** for FR-DOC-01 demo flows. The shared `DocumentVaultPanel` powers the case workspace Documents tab and the client profile Documents section; the hub uses a read-only drawer built on `DocumentVaultList`. Seed data (v30) includes previewable SVG samples and a SharePoint link for Mary Smith.

**Still outstanding:**

- **REST integration** — React runs on mock store (`USE_MOCK_AUTH`); `documentsApi` is never called.
- **Backend** — list/upload/link only; no `clientId` query, content/download, delete, or MIME allowlist.
- **OpenAPI** — no `/documents` paths in `Docs/openapi.yaml`.
- **Broader profile** — full 9-section case-scoped 360° view not implemented (Documents section only).

Backend implementation can proceed using this document plus the mock UX as the contract reference.

---

## Integration status matrix

| Capability | Prototype | React (mock) | Backend API | Notes |
|------------|-----------|--------------|-------------|-------|
| Documents Hub — caseload table | ✅ | ✅ | N/A (uses caseload API) | Row click + Open Vault; responsive card layout on mobile |
| Hub — side drawer (read-only list) | ✅ | ✅ | — | Preview + open link; live count via `version` refresh |
| Hub — “Manage in workspace” link | ✅ | ✅ | — | |
| Hub — role guard (CM + Supervisor only) | ✅ | ✅ | Partial | React uses `viewCaseDetail`; auditor/liaison blocked |
| Case workspace — document list | ✅ | ✅ | Via case workspace payload | Stacked list with uploader · date · size/hostname meta |
| Case workspace — file upload | ✅ | ✅ | `POST /documents/upload` exists | `<input type="file">`, 512 KB enforced, accepted extensions |
| Case workspace — add external link | ✅ | ✅ | `POST /documents/link` exists | Display name + URL; `normalizeUrl`; auto-title from hostname |
| Case workspace — add sample document | ✅ | ✅ | ❌ | SVG consent/assessment via `buildSampleDocument` |
| Case workspace — delete document | ❌ (prototype has no delete) | ✅ | ❌ | React extension; backend needs product decision |
| Case workspace — preview modal | ✅ | ✅ | ❌ | PDF iframe, images inline, link preview; download in header |
| Case workspace — read-only when closed | ✅ | ✅ | Partial | Backend checks closed case on upload/link only |
| Client profile — documents section | ✅ Full vault | ✅ | — | Uses first open case (or first case); not full 9-section profile |
| `stageContext` on upload/link | ✅ | ✅ | ✅ (optional field) | `case-workspace`, `client-profile`, seed contexts |
| Audit on upload/link | ✅ | ✅ (mock) | ✅ | |
| 512 KB upload limit | ✅ | ✅ | ✅ | Enforced in `DocumentVaultPanel` |
| Accepted file types (.pdf, .png, .jpg, .jpeg, .svg) | ✅ | ✅ | Not validated server-side | `accept` attribute on file input |
| Seed — SVG consent + assessment samples | ✅ | ✅ | — | Mary Smith + John Davis; SEED_VERSION=30 |
| Seed — SharePoint external link | ✅ | ✅ | — | `doc-mary-discharge-link` |
| REST integration (non-mock mode) | N/A | ❌ | Partial | `documentsApi` unused |
| OpenAPI contract | N/A | N/A | ❌ | Missing from `Docs/openapi.yaml` |
| Responsive / mobile layout | — | ✅ | — | Hub table cards, vault form grid, preview scaling |

**Legend:** ✅ Done · ⚠️ Partial · ❌ Missing

---

## Data model comparison

### Prototype document entity (`DocumentRepository`)

Stored in localStorage via `RM.BaseRepository.createBase('document')`.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Primary key |
| `clientId` | string | **Vault is keyed by client** |
| `caseId` | optional | Not used in prototype repository queries |
| `filename` | string | Display name |
| `sourceType` | `'file' \| 'url'` | Distinguishes upload vs link |
| `mimeType` | string | Preview routing |
| `size` | number | Bytes; 0 for links |
| `dataUrl` | string | Base64 data URL for files (demo storage) |
| `externalUrl` | string | For links |
| `uploadedBy` | string | Role label string |
| `uploadedAt` | ISO datetime | Sort desc |
| `stageContext` | string | e.g. `'general'`, `'intake'`, `'assessment'`, `'case-workspace'`, `'client-profile'` |

Repository methods: `findByClientId`, `findByCaseId` (case filter exists but hub/workspace use client scope).

### React mock entity (`MockDocument` in `types.ts`)

| Field | Prototype equivalent | Gap |
|-------|---------------------|-----|
| `name` | `filename` | Different property name; mapped to `filename` in `buildWorkspace` |
| `type` | `sourceType` | Values `'link'`, `'upload'` (+ legacy seed labels); mapped in workspace payload |
| `stageContext` | `stageContext` | ✅ Added; set on upload/link/sample |
| Other fields | Aligned | |

### Backend Mongo document (`documents.py`)

| Mongo field | API camelCase | Gap |
|-------------|---------------|-----|
| `_id` | `id` | OK |
| `tenant_id` | — | OK (internal) |
| `client_id` | `clientId` | OK |
| `case_id` | `caseId` | OK |
| `filename` | `filename` | OK |
| `source_type` | `sourceType` | OK |
| `mime_type` | `mimeType` | OK |
| `size` | `size` | OK |
| `external_url` | `externalUrl` | OK |
| `data_base64` | — | **Not returned in list** — preview/download needs new endpoint |
| `uploaded_by` | — | **Not resolved to display name in list** |
| `uploaded_at` | `uploadedAt` | OK |
| `stage_context` | `stageContext` | OK in DB; ✅ included in mock `buildWorkspace` payload; still omitted from API `_document_payload` |

---

## Surface-by-surface UI status

### 1. Documents Hub (`DocumentsHubPage.tsx`)

**Implemented (matches prototype):**

- Caseload table: client name, process stage badge, document count, Open Vault
- Row keyboard activation, active row highlight
- Side drawer with lead text, stacked list (`DocumentVaultList`), external-link badge, preview/open actions
- `FilePreviewModal` outside drawer (avoids transform trap)
- i18n via `pages.documentsHub.*` and `documents.*`
- Link to case workspace Documents tab
- Document count refreshes when mock store updates (`version` dependency)
- Mobile: table collapses to labelled card rows (`data-label` + CSS in `pages.css`)

**Remaining gaps:**

| # | Gap | Notes |
|---|-----|-------|
| H1 | Hub drawer is read-only | Same as prototype — upload in workspace/profile only |
| H2 | No explicit auditor/liaison redirect | Route guard equivalent to prototype redirect |

### 2. Case workspace — Documents tab (`CaseStageTabs.tsx` → `DocumentVaultPanel`)

**Implemented (prototype parity):**

- Shared `DocumentVaultPanel` with file upload, link form, sample document, stacked list, preview modal, delete
- 512 KB limit and accepted file types enforced
- URL normalization/validation; display name + URL fields; auto-title from hostname
- Toast feedback on upload, link, sample
- SVG sample documents (consent first, then assessment)
- `stageContext: 'case-workspace'`
- Role-based `uploadedBy` via i18n `role.*` keys
- Read-only when case closed

**Remaining gaps:**

| # | Gap | Notes |
|---|-----|-------|
| W1 | Delete not in prototype | Kept as React extension; backend decision pending |

### 3. Client 360° profile — Documents section

**Implemented:**

- Documents section on `ClientProfilePage` using `ProfileSection` + `DocumentVaultPanel`
- `stageContext: 'client-profile'`
- Workspace link label `documents.manageInWorkspaceProfile`
- Uses first open case (or first case) for `caseId` / audit linkage

**Remaining gaps:**

| # | Gap | Notes |
|---|-----|-------|
| P1 | Full 9-section case-scoped 360° profile | Broader profile epic; only Documents section added here |
| P2 | Case switcher on profile | Prototype supports multi-case profile view |

### 4. Shared components

| Component | Status | Notes |
|-----------|--------|-------|
| `DocumentVaultPanel` | ✅ Complete | Upload + link + sample + list + preview + toasts |
| `DocumentVaultList` | ✅ Complete | Shared by panel and hub drawer |
| `DocumentVaultDrawerBody` | ✅ Complete | Read-only hub drawer; uses `DocumentVaultList` |
| `FilePreviewModal` | ✅ Complete | Wired from panel and hub |
| `documentService.ts` | ✅ Complete | `normalizeUrl`, `buildSampleDocument`, SVG builders, `readFileAsDataUrl`, limits |

---

## Mock layer status

| Function | Location | Status |
|----------|----------|--------|
| `documentsForClient` | `caseService.ts` | ✅ Filter by `clientId`, sort `uploadedAt` desc |
| `addDocumentLink` | `workspaceService.ts` | ✅ URL validation, `stageContext`, role `uploadedBy` |
| `addDocumentUpload` | `workspaceService.ts` | ✅ Called from `DocumentVaultPanel` |
| `addSampleDocument` | `workspaceService.ts` | ✅ Accepts full sample payload with `dataUrl` |
| `deleteDocument` | `workspaceService.ts` | ✅ React extension |
| Sample SVG builders | `documentService.ts` | ✅ Ported from prototype |
| Audit | `recordAudit` | ✅ On link/upload/delete |

### Seed data (`seed.ts` SEED_VERSION=30)

**Implemented (`seedSampleDocuments`):**

- Mary Smith: consent SVG (`doc-mary-consent`) + assessment SVG (`doc-mary-assessment`)
- Mary Smith: SharePoint discharge link (`doc-mary-discharge-link`)
- John Davis: consent SVG (`doc-john-consent`)
- All include `dataUrl`, `mimeType`, `size`, `uploadedBy`, `stageContext`, `caseId`

---

## Frontend ↔ API wiring gaps

`documentsApi` in `api/client.ts`:

```typescript
documentsApi.list(token, caseId?)
documentsApi.upload(token, { clientId, caseId?, filename, mimeType, dataBase64 })
documentsApi.addLink(token, { clientId, caseId?, filename, externalUrl })
```

**Not wired:** No page imports or calls `documentsApi`. All surfaces use `useMockData` + `workspaceService` exclusively.

**Missing client methods (needed for REST mode):**

| Method | Purpose |
|--------|---------|
| `get(token, documentId)` | Metadata + download URL or inline base64 |
| `delete(token, documentId)` | If delete is kept |
| `listByClient(token, clientId)` | Hub + profile (backend currently filters by `caseId` or caseload) |

**Case workspace REST path:** Today loads documents via `caseApi.getWorkspace` → `evidence.documents`. Upload/link should call `documentsApi` then refresh workspace.

---

## Backend API gaps

### Existing (`codebase/api/app/routers/documents.py`)

| Endpoint | Status |
|----------|--------|
| `GET /documents?caseId=` | ✅ Caseload-scoped for CM |
| `POST /documents/upload` | ✅ Base64 body, 512 KB max, closed-case guard |
| `POST /documents/link` | ✅ Closed-case guard |

### Missing (required for full parity)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /documents?clientId=` | Hub list + profile vault | **P0** |
| `GET /documents/{id}` | Metadata | **P0** |
| `GET /documents/{id}/content` | Stream file or redirect for preview/download | **P0** |
| `DELETE /documents/{id}` | Match React delete (if approved) | P1 |
| MIME / extension allowlist | `.pdf,.png,.jpg,.jpeg,.svg` | **P0** |
| URL normalization on link | Match prototype `normalizeUrl` | **P0** |
| Resolve `uploadedBy` to user display name in list responses | UX parity | P1 |
| Include `uploadedBy` / `stageContext` in case workspace `_document_payload` | API workspace display | P1 |
| Object storage migration path | FR mentions signed URLs (O2) | P2 (architecture) |

### Storage note

Prototype stores files as **data URLs in localStorage**. Backend stores **base64 in Mongo** (`data_base64`). Production should move to object storage with signed URLs; frontend preview/download contract should abstract this early (`contentUrl` vs inline `dataUrl`).

---

## OpenAPI / contract gaps

`Docs/openapi.yaml` contains **no `/documents` paths**. Before backend work:

1. Add schemas: `DocumentSummary`, `DocumentUploadRequest`, `DocumentLinkRequest`, `DocumentListResponse`
2. Document query params: `caseId`, `clientId` (mutually compatible with caseload rules)
3. Document error codes: `too_large`, `invalid_url`, `read_only`, `unsupported_type`
4. Align with `DocumentSummary` in `codebase/web/src/api/client.ts`
5. Include optional `stageContext` on upload/link requests (already in backend payloads)

---

## Permissions & roles

| Role | Prototype | React | Backend |
|------|-----------|-------|---------|
| Case Manager | Hub + vault R/W | ✅ via `viewCaseDetail` | ✅ caseload filter |
| Supervisor | Hub + vault R/W | ✅ | ✅ (no CM filter) |
| Auditor | Redirect away from hub | Blocked by route | N/A |
| Liaison | Redirect away from hub | Blocked by route | N/A |
| Read-only vault | Closed case / closure record | `readOnly` on workspace + profile | Closed case on POST only |

**Gap:** Backend does not expose a dedicated “vault read-only” flag; frontend derives from case status.

---

## i18n status

Keys under `documents.*` and `pages.documentsHub.*` are wired in EN/ES. Document vault UI uses:

- `documents.uploadLabel`, `displayNameLabel`, `urlLabel`, `addLink`, `addSample`
- `documents.documentUploaded`, `linkAdded`, `sampleAdded`, `fileTooLarge`, `invalidUrl`, `readFailed`
- `role.*` for `uploadedBy` display

No known hardcoded English remains on document surfaces.

---

## Recommended implementation order

### Phase A — Frontend mock parity ✅ **COMPLETE**

1. ~~Create `DocumentVaultPanel` shared component~~
2. ~~Replace workspace documents tab with `DocumentVaultPanel`~~
3. ~~Add documents section to client profile~~
4. ~~Port `buildSampleDocument` / SVG generators to `documentService.ts`~~
5. ~~Enrich seed documents (SEED v30)~~
6. ~~Wire `FilePreviewModal` from workspace + profile~~
7. ~~Responsive hub + vault styles~~

### Phase B — API contract **NEXT**

1. Add `/documents` paths to `Docs/openapi.yaml`
2. Extend backend: `clientId` query, `GET /documents/{id}`, content/download endpoint
3. Add validation (MIME, URL, size) and resolve `uploadedBy` names
4. Include `uploadedBy` / `stageContext` in `_document_payload`
5. Decide on **delete** (keep React behaviour vs prototype)

### Phase C — REST integration

1. Implement `useDocuments` hook or extend workspace loader to call `documentsApi`
2. Gate with `USE_MOCK_AUTH` same as other pages
3. Hub: `listByClient` or derive counts from caseload+documents batch
4. Upload: FileReader → base64 → `documentsApi.upload`
5. Preview: fetch content endpoint → blob URL or signed URL

### Phase D — Production storage (O2)

1. S3/Azure blob + signed URLs
2. Replace inline base64 in API responses
3. Virus scan / retention policies per tenant

---

## FR-DOC-01 acceptance checklist

Use this to sign off integration:

- [x] **Upload:** User can pick `.pdf/.png/.jpg/.jpeg/.svg` ≤ 512 KB; file appears in vault with uploader, date, size *(mock)*
- [x] **Link:** User can add URL with optional title; invalid URL rejected; link opens in new tab *(mock)*
- [x] **Hub access:** Caseload table opens read-only drawer with preview for files *(mock)*
- [x] **Workspace access:** Full vault on case Documents tab with upload/link/sample *(mock)*
- [x] **Profile access:** Full vault on client profile Documents section *(mock; first case only)*
- [x] **Preview:** PDF in iframe, images inline, links show location + open button *(mock)*
- [x] **Closed case:** Vault read-only on workspace and profile *(mock)*
- [x] **i18n:** EN/ES for document vault strings *(mock)*
- [x] **Audit:** Upload and link events in activity trail *(mock)*
- [ ] **REST mode:** Same behaviours against API (not mock store)
- [ ] **OpenAPI:** Contract published and matches implementation

---

## Files reference

### Completed (Phase A)

| Area | Files |
|------|-------|
| Shared UI | `DocumentVaultPanel.tsx`, `DocumentVaultList.tsx`, `DocumentVaultDrawerBody.tsx`, `FilePreviewModal.tsx` |
| Document logic | `mock/documentService.ts` |
| Hub | `pages/documents/DocumentsHubPage.tsx` |
| Workspace | `pages/cases/CaseStageTabs.tsx` |
| Profile | `pages/clients/ClientProfilePage.tsx`, `pages/clients/profile/ProfileSection.tsx` |
| Mock | `workspaceService.ts`, `seed.ts`, `types.ts`, `caseService.ts`, `store.ts` (SEED v30) |
| Styles | `public/css/components.css`, `public/css/pages.css` |

### Remaining (Phases B–C)

| Area | Files |
|------|-------|
| API client | `api/client.ts` — add get/delete/listByClient; wire in vault panel |
| Backend | `routers/documents.py`, `services/cases.py` `_document_payload` |
| Contract | `Docs/openapi.yaml` |
| Tests | Upload limit, URL validation, closed-case guard, CM caseload isolation |

---

## Related broader gaps (out of scope)

- Client Profile 360° view (9 workflow sections + activity) — **partial**; Documents section only
- Object storage decision (O2 in FSD) — required before production document storage
- Profile case switcher for multi-case clients

---

*Updated after Phase A frontend implementation (2026-09-08). Next update: after OpenAPI + backend Phase B.*

# Support Access Specification

## Purpose

Define bounded, read-only platform operator access to tenant records for support purposes with full audit and tenant control.

## Requirements

### Requirement: Read-only support sessions

Support Access SHALL grant view only. Create, edit, void, merge, assignment, export, and bulk actions SHALL NOT be permitted.

#### Scenario: Write attempt during support session

- **GIVEN** an active Support Access session
- **WHEN** the Platform Administrator attempts to edit a case note
- **THEN** the action is denied

### Requirement: Named-record retrieval only

Records SHALL be retrieved by specific case number or client reference. Browsing, listing, or searching the tenant client base SHALL NOT be available.

#### Scenario: List clients blocked

- **GIVEN** an active Support Access session
- **WHEN** the Platform Administrator requests a client list API
- **THEN** the request is denied

### Requirement: Session prerequisites

Every session SHALL require a support ticket reference and written reason before any record is displayed.

#### Scenario: Session without ticket rejected

- **GIVEN** a Platform Administrator
- **WHEN** Support Access is requested without ticket reference
- **THEN** session start is rejected

### Requirement: Time-boxed expiry

Sessions SHALL expire after a configurable period (default 4 hours) and SHALL NOT be silently extended.

#### Scenario: Session expires

- **GIVEN** a Support Access session started 4 hours ago
- **WHEN** the operator requests another record
- **THEN** access is denied and re-authentication is required

### Requirement: Tenant audit visibility

Every record viewed during Support Access SHALL be written to the tenant audit log with operator, ticket reference, entity, and timestamp visible to the Tenant Administrator.

#### Scenario: View creates audit entry

- **GIVEN** an active Support Access session with valid ticket
- **WHEN** a named case is viewed
- **THEN** a tenant audit log entry is created

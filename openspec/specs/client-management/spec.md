# Client Management Specification

## Purpose

Define client registration, search, 360° profile, duplicate detection, and merge behaviour within a tenant. UI reference: `Docs/ui/` client module.

## Requirements

### Requirement: Mandatory registration fields

The system SHALL require name, phone, and address for client registration. Date of birth is optional but required for complete intake.

#### Scenario: Save with required fields

- **GIVEN** name, phone, and address are provided
- **WHEN** registration is saved
- **THEN** the client record is created in the user's tenant

### Requirement: Tenant-scoped duplicate detection

The system SHALL run duplicate detection on name, phone, and date of birth within the tenant only, warning before save when similarity score meets or exceeds the tenant threshold (default 25).

#### Scenario: Inline duplicate warning

- **GIVEN** an existing client with normalized phone match in the same tenant
- **WHEN** a new registration reaches score ≥ threshold
- **THEN** an inline warning displays before save is confirmed

### Requirement: Duplicate scoring algorithm

Similarity scoring SHALL apply: exact name 50 points; name edit distance ≤2 → 35; substring 25; normalized phone 40; date of birth 30.

#### Scenario: Phone match triggers warning

- **GIVEN** two records with the same normalized phone in one tenant
- **WHEN** duplicate score is calculated
- **THEN** score includes 40 points for phone match

### Requirement: Cross-program engagement flag

The system SHALL display a cross-program engagement flag when the client is active in another program within the same tenant.

#### Scenario: Active case in another program

- **GIVEN** Client X has an open case in Program A
- **WHEN** a user registers or views Client X in Program B context
- **THEN** a cross-program engagement flag is visible

### Requirement: Duplicate merge audit

Merge and dismiss actions in the duplicate queue SHALL be written to the audit log.

#### Scenario: Merge creates audit entry

- **GIVEN** a supervisor confirms duplicate merge with survivor selected
- **WHEN** merge completes
- **THEN** an audit log entry records actor, action, and entity references

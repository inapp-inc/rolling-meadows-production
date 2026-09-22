# Tenancy Specification

## Purpose

Define multi-tenant platform behaviour: tenant lifecycle, isolation, platform console, and offboarding for the Case Management Platform.

## Requirements

### Requirement: Tenant provisioning

The system SHALL allow a Platform Administrator to create a tenant with legal name, short code, primary contact, time zone, default locale, and enabled programs.

#### Scenario: Create tenant in Draft status

- **GIVEN** a Platform Administrator with valid provisioning input
- **WHEN** the tenant is saved
- **THEN** a tenant record exists with status Draft

### Requirement: Tenant activation gate

The system SHALL prevent tenant activation until a readiness check passes.

#### Scenario: Block activation when readiness fails

- **GIVEN** a Draft tenant missing a supervisor, case manager, tenant administrator, or enabled workflow
- **WHEN** activation is attempted
- **THEN** activation is rejected with a readiness failure reason

### Requirement: Tenant data isolation

Every record SHALL carry a tenant reference. Queries returning records outside the requesting user's tenant SHALL be treated as a critical defect.

#### Scenario: Cross-tenant read denied

- **GIVEN** User A authenticated in Tenant 1
- **WHEN** User A requests a client record belonging to Tenant 2
- **THEN** the system returns not found or forbidden and logs the attempt

### Requirement: Suspended tenant retention

A suspended tenant SHALL retain all data intact; suspension blocks sign-in and processing but SHALL NOT delete records.

#### Scenario: Suspended tenant sign-in blocked

- **GIVEN** a tenant with status Suspended
- **WHEN** a tenant user attempts sign-in
- **THEN** sign-in is denied and no data is deleted

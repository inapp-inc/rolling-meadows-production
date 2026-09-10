# Access Control Specification

## Purpose

Define authentication, tenant resolution, role-based access control, and navigation guards for all platform users.

## Requirements

### Requirement: Unauthenticated redirect

Unauthenticated users SHALL be redirected to sign-in from any protected page.

#### Scenario: Protected route without session

- **GIVEN** no authenticated session
- **WHEN** a protected route is requested
- **THEN** the user is redirected to sign-in

### Requirement: Server-side tenant resolution

Tenant identity SHALL be derived from the authenticated user and applied server-side to every query. It SHALL NOT be accepted from the client or URL.

#### Scenario: Client-supplied tenant ignored

- **GIVEN** an authenticated user in Tenant A
- **WHEN** a request includes a tenant identifier for Tenant B in the body or query string
- **THEN** the system uses Tenant A only and does not return Tenant B data

### Requirement: Service-layer authorization

Access SHALL be denied at the service layer, not only hidden in navigation.

#### Scenario: Forbidden API call

- **GIVEN** a Cross-Program Liaison
- **WHEN** the liaison calls an API to fetch case clinical detail
- **THEN** the API returns HTTP 403 Forbidden

### Requirement: Role landing pages

Each role SHALL land on its designated page after sign-in per the permission matrix.

#### Scenario: Case Manager landing

- **GIVEN** a Case Manager signing in successfully
- **WHEN** sign-in completes
- **THEN** the user lands on Case Creation

#### Scenario: Liaison redirect from operational pages

- **GIVEN** a Cross-Program Liaison
- **WHEN** the liaison navigates to case workspace
- **THEN** the user is redirected to Cross-Program Lookup

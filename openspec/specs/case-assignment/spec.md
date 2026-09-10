# Case Assignment Specification

## Purpose

Define case ownership, assignment types, immutable history, bulk reassignment, coverage, and acknowledgment queue.

## Requirements

### Requirement: Single owner invariant

Every case SHALL have exactly one accountable case manager at any instant. A case SHALL NOT exist without an owner.

#### Scenario: Owner at creation

- **GIVEN** a new case is created by a Case Manager
- **WHEN** creation completes
- **THEN** the creating Case Manager is the owner

### Requirement: Mandatory assignment reason

Every ownership change SHALL require a reason category and free-text note. Assignments without them SHALL be rejected.

#### Scenario: Missing reason rejected

- **GIVEN** a valid transfer recipient
- **WHEN** assignment is submitted without reason note
- **THEN** assignment fails with validation error

### Requirement: Atomic ownership update

Ownership update and history record SHALL succeed or fail together.

#### Scenario: History accompanies ownership change

- **GIVEN** a confirmed reassignment
- **WHEN** ownership updates
- **THEN** an append-only history row is written in the same transaction

### Requirement: Immutable assignment history

Assignment history SHALL be append-only and SHALL NOT be edited or deleted, including after case closure.

#### Scenario: History preserved after closure

- **GIVEN** a closed case with three prior assignments
- **WHEN** assignment history is viewed
- **THEN** all three records remain visible unchanged

### Requirement: Acknowledgment escalation

Newly assigned cases SHALL appear in the recipient's Newly Assigned queue. Unacknowledged assignments beyond three working days SHALL escalate to the supervisor.

#### Scenario: Escalation after three working days

- **GIVEN** an assignment made three working days ago without acknowledgment
- **WHEN** escalation job runs
- **THEN** the supervisor receives an escalation notification or queue item

# Case Lifecycle Specification

## Purpose

Define case creation, eight-stage lifecycle, workspace behaviour, risk scoring, and closure. UI reference: `Docs/ui/case-workspace.html` and stage pages.

## Requirements

### Requirement: Workflow determined at creation

Subcategory selection at case creation SHALL determine workflow, stage labels, deliverables, focus areas, and form family for the entire case.

#### Scenario: Subcategory maps to workflow

- **GIVEN** a tenant-enabled subcategory mapped to a workflow in the catalogue
- **WHEN** case creation preview is shown
- **THEN** the preview displays the correct workflow and form family

### Requirement: Unified case workspace

The system SHALL present all eight lifecycle stages plus Documents and Activity as tabs within a single case workspace with a progress stepper.

#### Scenario: Workspace tabs present

- **GIVEN** an open case
- **WHEN** the case workspace loads
- **THEN** Intake through Closure tabs plus Documents and Activity are available

### Requirement: Derived stage status

Stage status SHALL be derived from completion evidence, not set manually. The first incomplete stage SHALL show as in progress.

#### Scenario: Intake incomplete blocks later stages

- **GIVEN** a case missing consent on file
- **WHEN** stage status is computed
- **THEN** Intake shows in progress and the case appears in the handoff queue per BR-INT-01

### Requirement: Risk scoring

Domain ratings SHALL score Low=1, Medium=2, High=3. Composite score is domain average × 25 rounded. Overall risk: High ≥2.5 avg, Medium ≥1.5, else Low. Override note is documentation only.

#### Scenario: Calculated risk level

- **GIVEN** domain ratings averaging 2.6
- **WHEN** risk assessment is saved
- **THEN** overall risk level is High regardless of override note text

### Requirement: Closed case read-only

Once closed, the case workspace SHALL be read-only for all roles while retaining full history.

#### Scenario: Edit blocked on closed case

- **GIVEN** a case with status Closed
- **WHEN** a Case Manager attempts to edit intake fields
- **THEN** the edit is rejected

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(64), ForeignKey("clients.id"), nullable=False, index=True)
    case_number: Mapped[str] = mapped_column(String(32), nullable=False)
    program_id: Mapped[str] = mapped_column(String(64), nullable=False)
    case_category_id: Mapped[str] = mapped_column(String(64), nullable=False)
    case_subcategory_id: Mapped[str] = mapped_column(String(64), nullable=False)
    case_manager_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    incomplete_intake: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    current_stage: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    open_date: Mapped[date] = mapped_column(Date, nullable=False)
    closed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)


class CaseReferral(Base):
    __tablename__ = "case_referrals"

    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    source: Mapped[str | None] = mapped_column(String(256), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    referrer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    date_received: Mapped[date | None] = mapped_column(Date, nullable=True)


class CaseIntake(Base):
    __tablename__ = "case_intakes"

    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    consent_on_file: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    living_arrangement: Mapped[str | None] = mapped_column(String(256), nullable=True)
    medical_history: Mapped[str | None] = mapped_column(Text, nullable=True)
    comprehensive_assessment_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    completeness: Mapped[str] = mapped_column(String(32), default="incomplete", nullable=False)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    assessment_date: Mapped[date] = mapped_column(Date, nullable=False)
    ratings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    composite_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overall_risk: Mapped[str | None] = mapped_column(String(32), nullable=True)
    override_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    assessor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class CarePlanItem(Base):
    __tablename__ = "care_plan_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    issue: Mapped[str] = mapped_column(String(500), nullable=False)
    goal: Mapped[str] = mapped_column(String(500), nullable=False)
    service: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="Not Started", nullable=False)
    voided: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    void_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    voided_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ServiceEnrollment(Base):
    __tablename__ = "service_enrollments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    service_or_event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    date_enrolled: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    enrolled_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    voided: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class CboReferral(Base):
    __tablename__ = "cbo_referrals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    cbo_name: Mapped[str] = mapped_column(String(256), nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="Pending", nullable=False)
    referral_date: Mapped[date] = mapped_column(Date, nullable=False)


class CaseNote(Base):
    __tablename__ = "case_notes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    author_id: Mapped[str] = mapped_column(String(64), nullable=False)
    note_date: Mapped[date] = mapped_column(Date, nullable=False)
    note_type: Mapped[str] = mapped_column(String(64), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    voided: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    void_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    voided_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Reassessment(Base):
    __tablename__ = "reassessments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    reassessment_date: Mapped[date] = mapped_column(Date, nullable=False)
    trigger: Mapped[str] = mapped_column(String(256), nullable=False)
    previous_ratings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    new_ratings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class CaseClosure(Base):
    __tablename__ = "case_closures"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), nullable=False, unique=True)
    client_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    closure_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    outcomes_summary: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


class AssignmentHistory(Base):
    __tablename__ = "assignment_history"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False)
    case_manager_id: Mapped[str] = mapped_column(String(64), nullable=False)
    assigned_by: Mapped[str] = mapped_column(String(64), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    previous_case_manager_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class CaseAuditEntry(Base):
    __tablename__ = "case_audit_log"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

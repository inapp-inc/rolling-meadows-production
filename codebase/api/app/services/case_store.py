import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import (
    AssignmentHistory,
    CarePlanItem,
    Case,
    CaseAuditEntry,
    CaseClosure,
    CaseIntake,
    CaseNote,
    CaseReferral,
    CboReferral,
    Reassessment,
    RiskAssessment,
    ServiceEnrollment,
)
from app.models.client import Client
from app.models.document import Document
from app.models.user import User
from app.services.clients import client_model_to_dict
from app.services.workflow import compute_stage_statuses, current_stage_number


def case_model_to_dict(case: Case) -> dict:
    return {
        "_id": case.id,
        "tenant_id": case.tenant_id,
        "client_id": case.client_id,
        "case_number": case.case_number,
        "program_id": case.program_id,
        "case_category_id": case.case_category_id,
        "case_subcategory_id": case.case_subcategory_id,
        "case_manager_id": case.case_manager_id,
        "status": case.status,
        "incomplete_intake": case.incomplete_intake,
        "current_stage": case.current_stage,
        "open_date": case.open_date.isoformat(),
        "closed_date": case.closed_date.isoformat() if case.closed_date else None,
        "created_by": case.created_by,
    }


def _referral_to_dict(row: CaseReferral) -> dict:
    return {
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "source": row.source,
        "reason": row.reason,
        "referrer_name": row.referrer_name,
        "date_received": row.date_received.isoformat() if row.date_received else None,
    }


def _intake_to_dict(row: CaseIntake) -> dict:
    return {
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "consent_on_file": row.consent_on_file,
        "living_arrangement": row.living_arrangement,
        "medical_history": row.medical_history,
        "comprehensive_assessment_notes": row.comprehensive_assessment_notes,
        "completeness": row.completeness,
    }


def _risk_to_dict(row: RiskAssessment) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "date": row.assessment_date.isoformat(),
        "ratings": row.ratings or {},
        "composite_score": row.composite_score,
        "overall_risk": row.overall_risk,
        "override_note": row.override_note,
        "assessor_id": row.assessor_id,
    }


def _care_plan_to_dict(row: CarePlanItem) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "issue": row.issue,
        "goal": row.goal,
        "service": row.service,
        "status": row.status,
        "voided": row.voided,
        "created_at": row.created_at.isoformat(),
    }


def _enrollment_to_dict(row: ServiceEnrollment) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "service_or_event_id": row.service_or_event_id,
        "date_enrolled": row.date_enrolled.isoformat(),
        "status": row.status,
        "enrolled_by": row.enrolled_by,
        "voided": row.voided,
    }


def _cbo_to_dict(row: CboReferral) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "cbo_name": row.cbo_name,
        "status": row.status,
        "date": row.referral_date.isoformat(),
    }


def _note_to_dict(row: CaseNote) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "author_id": row.author_id,
        "date": row.note_date.isoformat(),
        "type": row.note_type,
        "text": row.text,
        "voided": row.voided,
    }


def _reassessment_to_dict(row: Reassessment) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "date": row.reassessment_date.isoformat(),
        "trigger": row.trigger,
        "previous_ratings": row.previous_ratings or {},
        "new_ratings": row.new_ratings or {},
    }


def _closure_to_dict(row: CaseClosure) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "date": row.closure_date.isoformat(),
        "reason": row.reason,
        "outcomes_summary": row.outcomes_summary or {},
    }


def _assignment_to_dict(row: AssignmentHistory) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "tenant_id": row.tenant_id,
        "case_manager_id": row.case_manager_id,
        "assigned_by": row.assigned_by,
        "reason": row.reason,
        "assigned_at": row.assigned_at.isoformat(),
        "previous_case_manager_id": row.previous_case_manager_id,
    }


def _document_to_dict(row: Document) -> dict:
    return {
        "_id": row.id,
        "case_id": row.case_id,
        "client_id": row.client_id,
        "tenant_id": row.tenant_id,
        "filename": row.filename,
        "source_type": row.source_type,
        "mime_type": row.mime_type,
        "size": row.size,
        "external_url": row.external_url,
        "data_base64": row.data_base64,
        "uploaded_by": row.uploaded_by,
        "uploaded_at": row.uploaded_at.isoformat(),
        "stage_context": row.stage_context,
    }


def _audit_to_dict(row: CaseAuditEntry) -> dict:
    doc = {
        "tenant_id": row.tenant_id,
        "actor_id": row.actor_id,
        "action": row.action,
        "entity_id": row.entity_id,
        "timestamp": row.timestamp.isoformat(),
    }
    if row.meta:
        doc["meta"] = row.meta
    return doc


async def get_case_row(session: AsyncSession, case_id: str, tenant_id: str) -> Case:
    result = await session.execute(
        select(Case).where(Case.id == case_id, Case.tenant_id == tenant_id, Case.status != "deleted")
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Case not found"})
    return case


async def get_case(session: AsyncSession, case_id: str, tenant_id: str) -> dict:
    case = await get_case_row(session, case_id, tenant_id)
    return case_model_to_dict(case)


async def get_client(session: AsyncSession, client_id: str, tenant_id: str) -> dict:
    result = await session.execute(
        select(Client).where(Client.id == client_id, Client.tenant_id == tenant_id, Client.status != "merged")
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Client not found"})
    return client_model_to_dict(client)


async def list_cases_for_tenant(
    session: AsyncSession,
    tenant_id: str,
    *,
    status: str = "active",
    case_manager_id: str | None = None,
) -> list[dict]:
    query = select(Case).where(Case.tenant_id == tenant_id, Case.status == status)
    if case_manager_id:
        query = query.where(Case.case_manager_id == case_manager_id)
    query = query.order_by(Case.open_date.desc())
    result = await session.execute(query)
    return [case_model_to_dict(c) for c in result.scalars().all()]


async def list_case_numbers(session: AsyncSession, tenant_id: str) -> list[str]:
    result = await session.execute(select(Case.case_number).where(Case.tenant_id == tenant_id))
    return [row[0] for row in result.all()]


async def users_map(session: AsyncSession, tenant_id: str) -> dict[str, dict]:
    result = await session.execute(select(User).where(User.tenant_id == tenant_id))
    users = {}
    for user in result.scalars().all():
        users[user.id] = {"_id": user.id, "name": user.name, "role": user.role}
    return users


async def audit(
    session: AsyncSession,
    tenant_id: str,
    actor_id: str,
    action: str,
    entity_id: str,
    meta: dict | None = None,
) -> None:
    session.add(
        CaseAuditEntry(
            id=f"aud-{uuid.uuid4().hex[:12]}",
            tenant_id=tenant_id,
            actor_id=actor_id,
            action=action,
            entity_id=entity_id,
            timestamp=datetime.now(timezone.utc),
            meta=meta,
        )
    )


async def load_all_evidence(session: AsyncSession, case_id: str) -> dict:
    referral_result = await session.execute(select(CaseReferral).where(CaseReferral.case_id == case_id))
    referral_row = referral_result.scalar_one_or_none()

    intake_result = await session.execute(select(CaseIntake).where(CaseIntake.case_id == case_id))
    intake_row = intake_result.scalar_one_or_none()

    risk_result = await session.execute(
        select(RiskAssessment)
        .where(RiskAssessment.case_id == case_id)
        .order_by(RiskAssessment.assessment_date.desc())
        .limit(1)
    )
    risk_row = risk_result.scalar_one_or_none()

    care_result = await session.execute(
        select(CarePlanItem).where(CarePlanItem.case_id == case_id, CarePlanItem.voided.is_(False))
    )
    care_rows = sorted(care_result.scalars().all(), key=lambda row: row.created_at)

    enroll_result = await session.execute(
        select(ServiceEnrollment).where(ServiceEnrollment.case_id == case_id, ServiceEnrollment.voided.is_(False))
    )
    enroll_rows = sorted(enroll_result.scalars().all(), key=lambda row: row.date_enrolled, reverse=True)

    cbo_result = await session.execute(select(CboReferral).where(CboReferral.case_id == case_id))
    cbo_rows = sorted(cbo_result.scalars().all(), key=lambda row: row.referral_date, reverse=True)

    notes_result = await session.execute(
        select(CaseNote).where(CaseNote.case_id == case_id, CaseNote.voided.is_(False))
    )
    note_rows = sorted(notes_result.scalars().all(), key=lambda row: row.note_date, reverse=True)

    reassess_result = await session.execute(select(Reassessment).where(Reassessment.case_id == case_id))
    reassess_rows = sorted(reassess_result.scalars().all(), key=lambda row: row.reassessment_date, reverse=True)

    closure_result = await session.execute(select(CaseClosure).where(CaseClosure.case_id == case_id))
    closure_row = closure_result.scalar_one_or_none()

    assign_result = await session.execute(select(AssignmentHistory).where(AssignmentHistory.case_id == case_id))
    assign_rows = sorted(assign_result.scalars().all(), key=lambda row: row.assigned_at, reverse=True)

    audit_result = await session.execute(
        select(CaseAuditEntry)
        .where(CaseAuditEntry.entity_id == case_id)
        .order_by(CaseAuditEntry.timestamp.desc())
        .limit(50)
    )
    audit_rows = audit_result.scalars().all()

    doc_result = await session.execute(
        select(Document).where(Document.case_id == case_id).order_by(Document.uploaded_at.desc())
    )
    doc_rows = doc_result.scalars().all()

    return {
        "referral": _referral_to_dict(referral_row) if referral_row else None,
        "intake": _intake_to_dict(intake_row) if intake_row else None,
        "risk": _risk_to_dict(risk_row) if risk_row else None,
        "care_plan_items": [_care_plan_to_dict(row) for row in care_rows],
        "enrollments": [_enrollment_to_dict(row) for row in enroll_rows],
        "cbo_referrals": [_cbo_to_dict(row) for row in cbo_rows],
        "notes": [_note_to_dict(row) for row in note_rows],
        "reassessments": [_reassessment_to_dict(row) for row in reassess_rows],
        "closure": _closure_to_dict(closure_row) if closure_row else None,
        "documents": [_document_to_dict(row) for row in doc_rows],
        "assignment_history": [_assignment_to_dict(row) for row in assign_rows],
        "activity": [_audit_to_dict(row) for row in audit_rows],
    }


async def refresh_case_stage(
    session: AsyncSession,
    case_row: Case,
    client: dict,
    evidence: dict,
) -> None:
    referral = evidence.get("referral")
    intake = evidence.get("intake")
    incomplete_intake = not (
        referral
        and referral.get("source")
        and referral.get("reason")
        and intake
        and intake.get("consent_on_file")
        and client.get("dob")
    )
    case_doc = case_model_to_dict(case_row)
    stage_statuses = compute_stage_statuses(case_doc, client, evidence)
    case_row.current_stage = current_stage_number(stage_statuses)
    case_row.incomplete_intake = incomplete_intake


async def update_client_fields(
    session: AsyncSession,
    client_id: str,
    tenant_id: str,
    *,
    name: str | None = None,
    phone: str | None = None,
    address: str | None = None,
    dob: str | None = None,
) -> dict:
    result = await session.execute(
        select(Client).where(Client.id == client_id, Client.tenant_id == tenant_id)
    )
    client_row = result.scalar_one_or_none()
    if not client_row:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Client not found"})

    if name:
        client_row.name = name.strip()
    if phone:
        client_row.phone = phone.strip()
    if address:
        client_row.address = address.strip()
    if dob is not None:
        client_row.dob = date.fromisoformat(dob) if dob else None

    return client_model_to_dict(client_row)

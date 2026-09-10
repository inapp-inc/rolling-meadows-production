import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_doc
from app.db.session import get_session
from app.models.case import (
    AssignmentHistory,
    CarePlanItem,
    CaseClosure,
    CaseNote,
    CboReferral,
    Reassessment,
    RiskAssessment,
    ServiceEnrollment,
)
from app.models.user import User
from app.services.case_access import assert_case_access, assert_caseload
from app.services.case_store import (
    audit,
    get_case,
    get_case_row,
    get_client,
    load_all_evidence,
    refresh_case_stage,
    users_map,
)
from app.services.cases import build_workspace
from app.services.risk import calc_for_subcategory

router = APIRouter(prefix="/cases", tags=["case-stages"])


class RiskPayload(BaseModel):
    ratings: dict[str, str]
    overrideNote: str | None = None


class CarePlanItemPayload(BaseModel):
    issue: str
    goal: str
    service: str
    status: str = "Not Started"


class VoidPayload(BaseModel):
    reason: str = Field(min_length=1)


class EnrollmentPayload(BaseModel):
    serviceOrEventId: str


class CboReferralPayload(BaseModel):
    cboName: str
    status: str = "Pending"


class NotePayload(BaseModel):
    type: str
    text: str


class ReassessmentPayload(BaseModel):
    trigger: str
    newRatings: dict[str, str]


class ClosurePayload(BaseModel):
    reason: str
    outcomesSummary: dict[str, str]


class AssignmentPayload(BaseModel):
    caseManagerId: str
    reason: str = Field(min_length=1)


async def _workspace_response(session: AsyncSession, case_id: str, user: dict) -> dict:
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    evidence = await load_all_evidence(session, case_id)
    users = await users_map(session, user["tenant_id"])
    return build_workspace(case, client, evidence, users)


@router.put("/{case_id}/risk", operation_id="saveCaseRisk")
async def save_risk(
    case_id: str,
    body: RiskPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    if case.get("status") == "closed":
        raise HTTPException(status_code=400, detail={"error": "read_only", "message": "Case is closed"})

    calc = calc_for_subcategory(case["case_subcategory_id"], body.ratings)
    today = date.today()
    risk_id = f"risk-{case_id}-{today.isoformat()}"
    result = await session.execute(select(RiskAssessment).where(RiskAssessment.id == risk_id))
    risk_row = result.scalar_one_or_none()
    if risk_row is None:
        risk_row = RiskAssessment(
            id=risk_id,
            case_id=case_id,
            client_id=case["client_id"],
            tenant_id=user["tenant_id"],
            assessment_date=today,
        )
        session.add(risk_row)
    risk_row.ratings = body.ratings
    risk_row.composite_score = calc["compositeScore"]
    risk_row.overall_risk = calc["overallRisk"]
    risk_row.override_note = body.overrideNote
    risk_row.assessor_id = user["_id"]

    await audit(session, user["tenant_id"], user["_id"], "risk_saved", case_id)
    await session.flush()
    evidence = await load_all_evidence(session, case_id)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    await refresh_case_stage(session, case_row, client, evidence)
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/care-plan-items", operation_id="addCarePlanItem", status_code=201)
async def add_care_plan_item(
    case_id: str,
    body: CarePlanItemPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    if case.get("status") == "closed":
        raise HTTPException(status_code=400, detail={"error": "read_only", "message": "Case is closed"})

    item_id = f"cp-{uuid.uuid4().hex[:10]}"
    session.add(
        CarePlanItem(
            id=item_id,
            case_id=case_id,
            client_id=case["client_id"],
            tenant_id=user["tenant_id"],
            issue=body.issue.strip(),
            goal=body.goal.strip(),
            service=body.service.strip(),
            status=body.status,
            created_at=datetime.now(timezone.utc),
        )
    )
    await audit(session, user["tenant_id"], user["_id"], "care_plan_added", case_id, {"itemId": item_id})
    await session.flush()
    evidence = await load_all_evidence(session, case_id)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    await refresh_case_stage(session, case_row, client, evidence)
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/care-plan-items/{item_id}/void", operation_id="voidCarePlanItem")
async def void_care_plan_item(
    case_id: str,
    item_id: str,
    body: VoidPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    result = await session.execute(
        select(CarePlanItem).where(
            CarePlanItem.id == item_id,
            CarePlanItem.case_id == case_id,
            CarePlanItem.tenant_id == user["tenant_id"],
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Item not found"})
    item.voided = True
    item.void_reason = body.reason
    item.voided_by = user["_id"]
    item.voided_at = datetime.now(timezone.utc)
    await audit(session, user["tenant_id"], user["_id"], "care_plan_voided", case_id, {"itemId": item_id})
    await session.flush()
    evidence = await load_all_evidence(session, case_id)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    await refresh_case_stage(session, case_row, client, evidence)
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/enrollments", operation_id="addEnrollment", status_code=201)
async def add_enrollment(
    case_id: str,
    body: EnrollmentPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    if case.get("status") == "closed":
        raise HTTPException(status_code=400, detail={"error": "read_only", "message": "Case is closed"})

    existing = await session.execute(
        select(ServiceEnrollment).where(
            ServiceEnrollment.case_id == case_id,
            ServiceEnrollment.service_or_event_id == body.serviceOrEventId,
            ServiceEnrollment.voided.is_(False),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"error": "duplicate", "message": "Already enrolled"})

    session.add(
        ServiceEnrollment(
            id=f"enr-{uuid.uuid4().hex[:10]}",
            case_id=case_id,
            client_id=case["client_id"],
            tenant_id=user["tenant_id"],
            service_or_event_id=body.serviceOrEventId,
            date_enrolled=date.today(),
            status="active",
            enrolled_by=user["_id"],
        )
    )
    await audit(session, user["tenant_id"], user["_id"], "enrollment_added", case_id)
    await session.flush()
    evidence = await load_all_evidence(session, case_id)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    await refresh_case_stage(session, case_row, client, evidence)
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/cbo-referrals", operation_id="addCboReferral", status_code=201)
async def add_cbo_referral(
    case_id: str,
    body: CboReferralPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    session.add(
        CboReferral(
            id=f"cbo-{uuid.uuid4().hex[:10]}",
            case_id=case_id,
            client_id=case["client_id"],
            tenant_id=user["tenant_id"],
            cbo_name=body.cboName.strip(),
            status=body.status,
            referral_date=date.today(),
        )
    )
    await audit(session, user["tenant_id"], user["_id"], "cbo_referral_added", case_id)
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/notes", operation_id="addCaseNote", status_code=201)
async def add_note(
    case_id: str,
    body: NotePayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    if case.get("status") == "closed":
        raise HTTPException(status_code=400, detail={"error": "read_only", "message": "Case is closed"})

    session.add(
        CaseNote(
            id=f"note-{uuid.uuid4().hex[:10]}",
            case_id=case_id,
            client_id=case["client_id"],
            tenant_id=user["tenant_id"],
            author_id=user["_id"],
            note_date=date.today(),
            note_type=body.type,
            text=body.text.strip(),
        )
    )
    await audit(session, user["tenant_id"], user["_id"], "note_added", case_id)
    await session.flush()
    evidence = await load_all_evidence(session, case_id)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    await refresh_case_stage(session, case_row, client, evidence)
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/notes/{note_id}/void", operation_id="voidCaseNote")
async def void_note(
    case_id: str,
    note_id: str,
    body: VoidPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    result = await session.execute(
        select(CaseNote).where(
            CaseNote.id == note_id,
            CaseNote.case_id == case_id,
            CaseNote.tenant_id == user["tenant_id"],
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Note not found"})
    note.voided = True
    note.void_reason = body.reason
    note.voided_by = user["_id"]
    note.voided_at = datetime.now(timezone.utc)
    await session.flush()
    evidence = await load_all_evidence(session, case_id)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    await refresh_case_stage(session, case_row, client, evidence)
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/reassessments", operation_id="addReassessment", status_code=201)
async def add_reassessment(
    case_id: str,
    body: ReassessmentPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    evidence = await load_all_evidence(session, case_id)
    previous = (evidence.get("risk") or {}).get("ratings") or {}
    calc = calc_for_subcategory(case["case_subcategory_id"], body.newRatings)

    session.add(
        Reassessment(
            id=f"re-{uuid.uuid4().hex[:10]}",
            case_id=case_id,
            client_id=case["client_id"],
            tenant_id=user["tenant_id"],
            reassessment_date=date.today(),
            trigger=body.trigger,
            previous_ratings=previous,
            new_ratings=body.newRatings,
        )
    )

    today = date.today()
    risk_id = f"risk-{case_id}-{today.isoformat()}"
    risk_result = await session.execute(select(RiskAssessment).where(RiskAssessment.id == risk_id))
    risk_row = risk_result.scalar_one_or_none()
    if risk_row is None:
        risk_row = RiskAssessment(
            id=risk_id,
            case_id=case_id,
            client_id=case["client_id"],
            tenant_id=user["tenant_id"],
            assessment_date=today,
        )
        session.add(risk_row)
    risk_row.ratings = body.newRatings
    risk_row.composite_score = calc["compositeScore"]
    risk_row.overall_risk = calc["overallRisk"]
    risk_row.assessor_id = user["_id"]

    await audit(session, user["tenant_id"], user["_id"], "reassessment_added", case_id)
    await session.flush()
    evidence = await load_all_evidence(session, case_id)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    await refresh_case_stage(session, case_row, client, evidence)
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/closure", operation_id="closeCase", status_code=201)
async def close_case(
    case_id: str,
    body: ClosurePayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    if case.get("status") == "closed":
        raise HTTPException(status_code=400, detail={"error": "already_closed", "message": "Case already closed"})

    closure_result = await session.execute(select(CaseClosure).where(CaseClosure.case_id == case_id))
    closure_row = closure_result.scalar_one_or_none()
    if closure_row is None:
        closure_row = CaseClosure(
            id=f"closure-{case_id}",
            case_id=case_id,
            client_id=case["client_id"],
            tenant_id=user["tenant_id"],
        )
        session.add(closure_row)
    closure_row.closure_date = date.today()
    closure_row.reason = body.reason
    closure_row.outcomes_summary = body.outcomesSummary
    case_row.status = "closed"
    case_row.closed_date = date.today()
    await audit(session, user["tenant_id"], user["_id"], "case_closed", case_id, {"reason": body.reason})
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.patch("/{case_id}/assignment", operation_id="assignCase")
async def assign_case(
    case_id: str,
    body: AssignmentPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") not in {"supervisor", "tenant_admin", "organization_admin"}:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Supervisor only"})
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    assignee_result = await session.execute(
        select(User).where(
            User.id == body.caseManagerId,
            User.tenant_id == user["tenant_id"],
            User.status == "Active",
        )
    )
    assignee = assignee_result.scalar_one_or_none()
    if not assignee or assignee.role not in {"case_manager", "supervisor"}:
        raise HTTPException(status_code=422, detail={"error": "validation", "message": "Invalid assignee"})

    session.add(
        AssignmentHistory(
            id=f"asg-{uuid.uuid4().hex[:10]}",
            case_id=case_id,
            tenant_id=user["tenant_id"],
            case_manager_id=body.caseManagerId,
            assigned_by=user["_id"],
            reason=body.reason,
            assigned_at=datetime.now(timezone.utc),
            previous_case_manager_id=case_row.case_manager_id,
        )
    )
    case_row.case_manager_id = body.caseManagerId
    await audit(
        session,
        user["tenant_id"],
        user["_id"],
        "case_assigned",
        case_id,
        {"to": body.caseManagerId, "reason": body.reason},
    )
    await session.commit()
    return await _workspace_response(session, case_id, user)


@router.post("/{case_id}/assign-to-me", operation_id="assignCaseToMe")
async def assign_to_me(
    case_id: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") not in {"supervisor", "case_manager", "tenant_admin", "organization_admin"}:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    if case_row.case_manager_id == user["_id"]:
        return await _workspace_response(session, case_id, user)

    session.add(
        AssignmentHistory(
            id=f"asg-{uuid.uuid4().hex[:10]}",
            case_id=case_id,
            tenant_id=user["tenant_id"],
            case_manager_id=user["_id"],
            assigned_by=user["_id"],
            reason="Self-assigned from workflow hub",
            assigned_at=datetime.now(timezone.utc),
            previous_case_manager_id=case_row.case_manager_id,
        )
    )
    case_row.case_manager_id = user["_id"]
    await audit(session, user["tenant_id"], user["_id"], "case_assigned", case_id, {"to": user["_id"]})
    await session.commit()
    return await _workspace_response(session, case_id, user)

import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog.categories import program_for_subcategory
from app.core.deps import get_current_user_doc
from app.db.session import get_session
from app.models.case import AssignmentHistory, Case, CaseIntake, CaseReferral
from app.services.case_access import assert_case_access, assert_caseload
from app.services.case_store import (
    audit,
    get_case,
    get_case_row,
    get_client,
    list_case_numbers,
    list_cases_for_tenant,
    load_all_evidence,
    refresh_case_stage,
    update_client_fields,
    users_map,
)
from app.services.cases import (
    build_workspace,
    case_to_summary,
    new_case_id,
    next_case_number,
    validate_case_create,
)
from app.services.workflow import compute_stage_statuses, current_stage_number

router = APIRouter(prefix="/cases", tags=["cases"])


class CreateCaseRequest(BaseModel):
    clientId: str
    categoryId: str
    subcategoryId: str
    caseManagerId: str | None = None


class ReferralPayload(BaseModel):
    source: str | None = None
    reason: str | None = None
    referrerName: str | None = None


class IntakePayload(BaseModel):
    consentOnFile: bool = False
    livingArrangement: str | None = None
    medicalHistory: str | None = None
    comprehensiveAssessmentNotes: str | None = None


class SaveIntakeRequest(BaseModel):
    name: str | None = None
    dob: str | None = None
    phone: str | None = None
    address: str | None = None
    referral: ReferralPayload | None = None
    intake: IntakePayload | None = None


async def _workspace(session: AsyncSession, case_id: str, user: dict) -> dict:
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    client = await get_client(session, case["client_id"], user["tenant_id"])
    evidence = await load_all_evidence(session, case_id)
    users = await users_map(session, user["tenant_id"])
    return build_workspace(case, client, evidence, users)


@router.get("", operation_id="listCases")
async def list_cases(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    q: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
):
    assert_case_access(user)
    status_value = status_filter or "active"
    case_manager_id = user["_id"] if user.get("role") == "case_manager" else None
    cases = await list_cases_for_tenant(
        session,
        user["tenant_id"],
        status=status_value,
        case_manager_id=case_manager_id,
    )

    items = []
    for case in cases:
        client = await get_client(session, case["client_id"], user["tenant_id"])
        summary = case_to_summary(case, client)
        if q:
            needle = q.lower()
            hay = " ".join(
                filter(
                    None,
                    [summary.get("caseNumber"), summary.get("clientName"), client.get("phone")],
                )
            ).lower()
            if needle not in hay:
                continue
        items.append(summary)
    return {"items": items}


@router.post("", operation_id="createCase", status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CreateCaseRequest,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    try:
        category_id, subcategory_id = validate_case_create(body.categoryId, body.subcategoryId, body.clientId)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"error": "validation", "message": str(exc)}) from exc

    await get_client(session, body.clientId, user["tenant_id"])
    owner_id = body.caseManagerId or user["_id"]
    if user.get("role") == "case_manager" and owner_id != user["_id"]:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Cannot assign to another user"})

    existing_numbers = await list_case_numbers(session, user["tenant_id"])
    case_id = new_case_id()
    case_row = Case(
        id=case_id,
        tenant_id=user["tenant_id"],
        client_id=body.clientId,
        case_number=next_case_number(existing_numbers),
        program_id=program_for_subcategory(subcategory_id),
        case_category_id=category_id,
        case_subcategory_id=subcategory_id,
        case_manager_id=owner_id,
        status="active",
        incomplete_intake=True,
        current_stage=1,
        open_date=date.today(),
        created_by=user["_id"],
    )
    session.add(case_row)
    await session.flush()
    session.add(
        AssignmentHistory(
            id=f"asg-{uuid.uuid4().hex[:10]}",
            case_id=case_id,
            tenant_id=user["tenant_id"],
            case_manager_id=owner_id,
            assigned_by=user["_id"],
            reason="Initial case assignment",
            assigned_at=datetime.now(timezone.utc),
            previous_case_manager_id=None,
        )
    )
    await audit(session, user["tenant_id"], user["_id"], "case_opened", case_id)
    await session.commit()
    return await _workspace(session, case_id, user)


@router.get("/{case_id}/workspace", operation_id="getCaseWorkspace")
async def get_workspace(
    case_id: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    return await _workspace(session, case_id, user)


@router.put("/{case_id}/intake", operation_id="saveCaseIntake")
async def save_intake(
    case_id: str,
    body: SaveIntakeRequest,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    case_row = await get_case_row(session, case_id, user["tenant_id"])
    case = await get_case(session, case_id, user["tenant_id"])
    assert_caseload(user, case)
    if case.get("status") == "closed":
        raise HTTPException(status_code=400, detail={"error": "read_only", "message": "Case is closed"})

    client = await get_client(session, case["client_id"], user["tenant_id"])
    if any([body.name, body.phone, body.address, body.dob is not None]):
        client = await update_client_fields(
            session,
            client["_id"],
            user["tenant_id"],
            name=body.name,
            phone=body.phone,
            address=body.address,
            dob=body.dob,
        )

    if body.referral:
        referral_result = await session.execute(select(CaseReferral).where(CaseReferral.case_id == case_id))
        referral_row = referral_result.scalar_one_or_none()
        if referral_row is None:
            referral_row = CaseReferral(
                case_id=case_id,
                client_id=client["_id"],
                tenant_id=user["tenant_id"],
            )
            session.add(referral_row)
        referral_row.source = body.referral.source
        referral_row.reason = body.referral.reason
        referral_row.referrer_name = body.referral.referrerName
        referral_row.date_received = date.today()

    if body.intake:
        incomplete = not (client.get("dob") and body.intake.consentOnFile)
        intake_result = await session.execute(select(CaseIntake).where(CaseIntake.case_id == case_id))
        intake_row = intake_result.scalar_one_or_none()
        if intake_row is None:
            intake_row = CaseIntake(
                case_id=case_id,
                client_id=client["_id"],
                tenant_id=user["tenant_id"],
            )
            session.add(intake_row)
        intake_row.consent_on_file = body.intake.consentOnFile
        intake_row.living_arrangement = body.intake.livingArrangement
        intake_row.medical_history = body.intake.medicalHistory
        intake_row.comprehensive_assessment_notes = body.intake.comprehensiveAssessmentNotes
        intake_row.completeness = "incomplete" if incomplete else "complete"

    await session.flush()
    evidence = await load_all_evidence(session, case_id)
    referral_doc = evidence.get("referral")
    intake_doc = evidence.get("intake")
    incomplete_intake = not (
        referral_doc
        and referral_doc.get("source")
        and referral_doc.get("reason")
        and intake_doc
        and intake_doc.get("consent_on_file")
        and client.get("dob")
    )
    stage_statuses = compute_stage_statuses(case, client, evidence)
    case_row.current_stage = current_stage_number(stage_statuses)
    case_row.incomplete_intake = incomplete_intake
    await audit(session, user["tenant_id"], user["_id"], "intake_updated", case_id)
    await session.commit()
    return await _workspace(session, case_id, user)

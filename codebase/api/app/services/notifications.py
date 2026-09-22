from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import CaseNote, RiskAssessment
from app.models.client import Client
from app.services.case_access import CASE_ROLES
from app.services.case_store import get_client, list_cases_for_tenant
from app.services.clients import client_model_to_dict
from app.services.deduplication import pairs_among
from app.services.follow_up import follow_up_status

SKIP_ROLES = {"auditor", "cross_program_liaison", "platform_admin"}
MERGE_ROLES = {"supervisor", "tenant_admin", "organization_admin"}


async def _latest_risk(session: AsyncSession, case_id: str) -> dict | None:
    result = await session.execute(
        select(RiskAssessment)
        .where(RiskAssessment.case_id == case_id)
        .order_by(RiskAssessment.assessment_date.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        return None
    return {"overall_risk": row.overall_risk}


async def _latest_note_date(session: AsyncSession, case_id: str) -> str | None:
    result = await session.execute(
        select(CaseNote)
        .where(CaseNote.case_id == case_id, CaseNote.voided.is_(False))
        .order_by(CaseNote.note_date.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    return row.note_date.isoformat() if row else None


async def build_notifications(session: AsyncSession, user: dict) -> list[dict]:
    role = user.get("role")
    if role in SKIP_ROLES:
        return []

    if role not in CASE_ROLES:
        return []

    tenant_id = user["tenant_id"]
    case_manager_id = user["_id"] if role == "case_manager" else None
    cases = await list_cases_for_tenant(
        session,
        tenant_id,
        status="active",
        case_manager_id=case_manager_id,
    )

    items: list[dict] = []
    overdue_rows: list[tuple[int, str, str, str]] = []

    for case in cases:
        case_id = case["_id"]
        client = await get_client(session, case["client_id"], tenant_id)
        client_name = client.get("name") or "Client"

        if case.get("current_stage", 1) >= 6:
            risk = await _latest_risk(session, case_id)
            if risk:
                last_date = await _latest_note_date(session, case_id) or case.get("open_date")
                cadence = follow_up_status(risk.get("overall_risk"), last_date)
                if cadence.get("overdue"):
                    overdue_rows.append(
                        (
                            int(cadence.get("daysOverdue") or 0),
                            client_name,
                            case_id,
                            case.get("client_id", ""),
                        )
                    )

    overdue_rows.sort(key=lambda row: row[0], reverse=True)
    for days_overdue, client_name, case_id, _client_id in overdue_rows[:3]:
        body_key = (
            "notifications.daysOverdueBody"
            if days_overdue == 1
            else "notifications.daysOverdueBodyPlural"
        )
        items.append(
            {
                "type": "overdue",
                "titleKey": "notifications.overdueFollowUp",
                "bodyKey": body_key,
                "bodyParams": {"name": client_name, "count": days_overdue},
                "href": f"/cases/{case_id}?tab=followup",
            }
        )

    for case in cases:
        if not case.get("incomplete_intake"):
            continue
        case_id = case["_id"]
        client = await get_client(session, case["client_id"], tenant_id)
        client_name = client.get("name") or "Client"
        items.append(
            {
                "type": "intake",
                "titleKey": "notifications.incompleteIntake",
                "bodyKey": "notifications.consentDobMissingBody",
                "bodyParams": {"name": client_name},
                "href": f"/cases/{case_id}?tab=intake",
            }
        )
        if sum(1 for i in items if i["type"] == "intake") >= 2:
            break

    if role in MERGE_ROLES:
        client_result = await session.execute(
            select(Client).where(Client.tenant_id == tenant_id, Client.status != "merged")
        )
        active_clients = [client_model_to_dict(c) for c in client_result.scalars().all()]
        dup_count = len(pairs_among(active_clients))
        if dup_count:
            body_key = (
                "notifications.duplicatePairsBody"
                if dup_count == 1
                else "notifications.duplicatePairsBodyPlural"
            )
            items.append(
                {
                    "type": "duplicate",
                    "titleKey": "notifications.duplicateReview",
                    "bodyKey": body_key,
                    "bodyParams": {"count": dup_count},
                    "href": "/clients/duplicates",
                }
            )

    return items[:8]

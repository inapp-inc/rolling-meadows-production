import time
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog.events import EVENT_BY_ID, EVENTS
from app.catalog.risk_domains import PROGRAM_LABELS
from app.core.deps import get_current_user_doc
from app.db.session import get_session
from app.services.case_evidence import load_latest_risk
from app.services.custom_report_runner import list_custom_reports, run_custom_report
from app.services.follow_up import follow_up_status
from app.services.report_analytics import build_tier
from app.services.report_builder_runner import (
    config_to_report_doc,
    report_doc_to_config,
    run_report_config,
)
from app.services.report_caseload import ALL_PROGRAM_IDS, build_caseload, parse_caseload_filters
from app.services.report_db_adapter import build_report_db

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_ROLES = {"supervisor", "case_manager", "auditor", "tenant_admin", "organization_admin"}
CUSTOM_REPORT_ROLES = {"supervisor", "case_manager", "organization_admin"}
REPORT_TIERS = {"executive", "operational", "integrity", "caseload"}

CATALOG = [
    {"id": "clients-by-program", "label": "Clients by program", "type": "chart"},
    {"id": "multi-program-enrollment", "label": "Multi-program enrollment", "type": "chart"},
    {"id": "caseload-by-risk", "label": "Caseload by risk level", "type": "chart"},
    {"id": "event-enrollment", "label": "Event enrollment", "type": "table"},
    {"id": "overdue-follow-ups", "label": "Overdue follow-ups", "type": "table"},
    {"id": "open-cbo-referrals", "label": "Open CBO referrals", "type": "table"},
]


@router.get("/catalog", operation_id="listReports")
async def list_reports(user: Annotated[dict, Depends(get_current_user_doc)]):
    if user.get("role") not in REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    return {"items": CATALOG}


@router.get("/tier/{tier_name}", operation_id="getReportTier")
async def get_report_tier(
    tier_name: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") not in REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    if tier_name not in REPORT_TIERS - {"caseload"}:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Report tier not found"})
    db = await build_report_db(session, user["tenant_id"])
    try:
        payload = await build_tier(db, tier_name, user["tenant_id"], user)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": str(exc)}) from exc
    return payload


@router.get("/custom", operation_id="listCustomReports")
async def get_custom_reports(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    period: str = "all",
    date_from: str = "",
    date_to: str = "",
    program_id: str = "",
    case_status: str = "active",
    event_id: str = "",
):
    if user.get("role") not in CUSTOM_REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    db = await build_report_db(session, user["tenant_id"])
    filters = parse_caseload_filters(
        period=period,
        date_from=date_from,
        date_to=date_to,
        program_id=program_id,
        case_status=case_status,
        event_id=event_id,
    )
    reports = await list_custom_reports(db, user["tenant_id"], user)
    items = []
    for report in reports:
        doc = await db.custom_reports.find_one({"_id": report["id"], "tenant_id": user["tenant_id"]})
        if not doc:
            continue
        preview = await run_custom_report(db, user["tenant_id"], user, doc, filters)
        items.append({**report, "preview": preview})
    return {
        "items": items,
        "filterOptions": {
            "programs": [{"id": pid, "label": PROGRAM_LABELS[pid]} for pid in ALL_PROGRAM_IDS],
            "events": [{"id": event["id"], "label": event["label"]} for event in EVENTS],
        },
    }


@router.post("/custom/preview", operation_id="previewCustomReport")
async def preview_custom_report(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    payload: dict[str, Any] = Body(...),
):
    if user.get("role") not in CUSTOM_REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    config = payload.get("config") or {}
    filters = parse_caseload_filters(
        period=payload.get("period", "all"),
        date_from=payload.get("dateFrom", ""),
        date_to=payload.get("dateTo", ""),
        program_id=payload.get("programId", ""),
        case_status=payload.get("caseStatus", "active"),
        event_id=payload.get("eventId", ""),
    )
    db = await build_report_db(session, user["tenant_id"])
    preview = await run_report_config(db, user["tenant_id"], user, config, filters)
    return preview


@router.get("/custom/{report_id}", operation_id="getCustomReport")
async def get_custom_report(
    report_id: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") not in CUSTOM_REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    db = await build_report_db(session, user["tenant_id"])
    doc = await db.custom_reports.find_one({"_id": report_id, "tenant_id": user["tenant_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Custom report not found"})
    if doc.get("owner_id") != user["_id"] and not doc.get("shared"):
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    return report_doc_to_config(doc)


@router.put("/custom/{report_id}", operation_id="saveCustomReport")
async def save_custom_report(
    report_id: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    payload: dict[str, Any] = Body(...),
):
    if user.get("role") not in CUSTOM_REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    config = {**payload, "id": report_id}
    if not config.get("name"):
        raise HTTPException(status_code=400, detail={"error": "validation_error", "message": "Report name is required"})
    db = await build_report_db(session, user["tenant_id"])
    doc = config_to_report_doc(config, user["tenant_id"], user["_id"])
    await db.custom_reports.update_one({"_id": report_id}, {"$set": doc}, upsert=True)
    await session.commit()
    return report_doc_to_config(doc)


@router.post("/custom", operation_id="createCustomReport")
async def create_custom_report(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    payload: dict[str, Any] = Body(...),
):
    if user.get("role") not in CUSTOM_REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail={"error": "validation_error", "message": "Report name is required"})
    report_id = payload.get("id") or f"cr-{int(time.time() * 1000)}"
    db = await build_report_db(session, user["tenant_id"])
    doc = config_to_report_doc({**payload, "id": report_id}, user["tenant_id"], user["_id"])
    await db.custom_reports.insert_one(doc)
    await session.commit()
    return report_doc_to_config(doc)


@router.get("/caseload", operation_id="getCaseloadReports")
async def get_caseload_reports(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    period: str = "all",
    date_from: str = "",
    date_to: str = "",
    program_id: str = "",
    case_status: str = "active",
    event_id: str = "",
):
    if user.get("role") not in REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    db = await build_report_db(session, user["tenant_id"])
    filters = parse_caseload_filters(
        period=period,
        date_from=date_from,
        date_to=date_to,
        program_id=program_id,
        case_status=case_status,
        event_id=event_id,
    )
    return await build_caseload(db, user["tenant_id"], user, filters)


@router.get("/{report_id}", operation_id="runReport")
async def run_report(
    report_id: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") not in REPORT_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})
    if report_id not in {report["id"] for report in CATALOG}:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Report not found"})

    db = await build_report_db(session, user["tenant_id"])
    tenant_id = user["tenant_id"]
    case_query: dict = {"tenant_id": tenant_id}
    if user.get("role") == "case_manager":
        case_query["case_manager_id"] = user["_id"]

    cases = await db.cases.find(case_query).to_list(5000)
    clients = await db.clients.find({"tenant_id": tenant_id}).to_list(5000)
    clients_by_id = {client["_id"]: client for client in clients}

    if report_id == "clients-by-program":
        counts: dict[str, int] = {}
        for case in cases:
            if case.get("status") != "active":
                continue
            pid = case.get("program_id", "unknown")
            counts[pid] = counts.get(pid, 0) + 1
        return {
            "reportId": report_id,
            "chartType": "bar",
            "data": [
                {"label": PROGRAM_LABELS.get(key, key.replace("prog-", "").replace("-", " ").title()), "value": value}
                for key, value in counts.items()
            ],
        }

    if report_id == "multi-program-enrollment":
        client_programs: dict[str, set] = {}
        for case in cases:
            if case.get("status") != "active":
                continue
            cid = case["client_id"]
            client_programs.setdefault(cid, set()).add(case.get("program_id"))
        multi = sum(1 for programs in client_programs.values() if len(programs) > 1)
        single = len(client_programs) - multi
        return {
            "reportId": report_id,
            "chartType": "bar",
            "data": [{"label": "Single program", "value": single}, {"label": "Multi-program", "value": multi}],
        }

    if report_id == "caseload-by-risk":
        risk_counts: dict[str, int] = {"High": 0, "Medium": 0, "Low": 0, "Unknown": 0}
        for case in cases:
            if case.get("status") != "active":
                continue
            risk = await load_latest_risk(db, case["_id"])
            level = (risk or {}).get("overall_risk") or "Unknown"
            risk_counts[level] = risk_counts.get(level, 0) + 1
        return {
            "reportId": report_id,
            "chartType": "donut",
            "data": [{"label": key, "value": value} for key, value in risk_counts.items() if value > 0],
        }

    if report_id == "event-enrollment":
        enrollments = await db.service_enrollments.find({"tenant_id": tenant_id, "voided": {"$ne": True}}).to_list(5000)
        rows = []
        for enrollment in enrollments:
            case = next((row for row in cases if row["_id"] == enrollment["case_id"]), None)
            if not case:
                continue
            if user.get("role") == "case_manager" and case.get("case_manager_id") != user["_id"]:
                continue
            client = clients_by_id.get(enrollment["client_id"], {})
            event_id = enrollment.get("service_or_event_id")
            event_label = EVENT_BY_ID.get(event_id, {}).get("label", event_id)
            rows.append(
                {
                    "clientName": client.get("name"),
                    "dateEnrolled": enrollment.get("date_enrolled"),
                    "eventName": event_label,
                }
            )
        return {"reportId": report_id, "rows": rows}

    if report_id == "overdue-follow-ups":
        rows = []
        for case in cases:
            if case.get("status") != "active":
                continue
            risk = await load_latest_risk(db, case["_id"])
            if not risk:
                continue
            notes = await db.case_notes.find({"case_id": case["_id"], "voided": {"$ne": True}}).sort("date", -1).to_list(1)
            last_date = notes[0]["date"] if notes else case.get("open_date")
            cadence = follow_up_status(risk.get("overall_risk"), last_date)
            if cadence["overdue"]:
                client = clients_by_id.get(case["client_id"], {})
                rows.append(
                    {
                        "clientName": client.get("name"),
                        "riskLevel": risk.get("overall_risk"),
                        "daysOverdue": cadence["daysOverdue"],
                        "cadence": cadence["label"],
                    }
                )
        rows.sort(key=lambda row: row.get("daysOverdue", 0), reverse=True)
        return {"reportId": report_id, "rows": rows}

    if report_id == "open-cbo-referrals":
        referrals = await db.cbo_referrals.find({"tenant_id": tenant_id, "status": {"$in": ["Pending", "Sent"]}}).to_list(
            5000
        )
        rows = []
        for referral in referrals:
            case = next((row for row in cases if row["_id"] == referral["case_id"]), None)
            if not case:
                continue
            if user.get("role") == "case_manager" and case.get("case_manager_id") != user["_id"]:
                continue
            client = clients_by_id.get(referral["client_id"], {})
            rows.append(
                {
                    "clientName": client.get("name"),
                    "cboName": referral.get("cbo_name"),
                    "status": referral.get("status"),
                    "date": referral.get("date"),
                }
            )
        return {"reportId": report_id, "rows": rows}

    raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Report not found"})

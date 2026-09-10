"""Caseload & program reports mirroring Docs/ui/js/services/reportEngine.js."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from app.catalog.events import EVENT_BY_ID, EVENTS
from app.catalog.risk_domains import PROGRAM_LABELS
from app.services.case_evidence import load_latest_risk
from app.services.follow_up import follow_up_status

REGISTERED_ONLY_PROGRAM_ID = "__registered_only__"

ALL_PROGRAM_IDS = [
    "prog-senior-services",
    "prog-community-services",
    "prog-parenting-support",
    "prog-mental-health",
]

PROGRAM_CHART_COLORS: dict[str, str] = {
    "prog-senior-services": "#2563eb",
    "prog-community-services": "#059669",
    "prog-parenting-support": "#7c3aed",
    "prog-mental-health": "#db2777",
    REGISTERED_ONLY_PROGRAM_ID: "#94a3b8",
}

PROGRAM_CHART_FALLBACK_COLORS = ["#2563eb", "#059669", "#7c3aed", "#db2777", "#d97706", "#0891b2"]

MULTI_PROGRAM_BUCKETS = [
    {"id": "1", "label": "Single program", "color": "#94a3b8"},
    {"id": "2", "label": "2 programs", "color": "#2563eb"},
    {"id": "3plus", "label": "3+ programs", "color": "#7c3aed"},
]

RISK_LEVELS = ["High", "Medium", "Moderate", "Low", "Unknown"]


@dataclass
class CaseloadFilters:
    period: str = "all"
    date_from: str = ""
    date_to: str = ""
    program_id: str = ""
    case_status: str = "active"
    event_id: str = ""


def parse_caseload_filters(
    *,
    period: str = "all",
    date_from: str = "",
    date_to: str = "",
    program_id: str = "",
    case_status: str = "active",
    event_id: str = "",
) -> CaseloadFilters:
    filters = CaseloadFilters(
        period=period or "all",
        date_from=date_from or "",
        date_to=date_to or "",
        program_id=program_id or "",
        case_status=case_status if case_status is not None else "active",
        event_id=event_id or "",
    )
    if filters.period != "custom":
        resolved_from, resolved_to = _period_to_range(filters.period)
        filters.date_from = resolved_from
        filters.date_to = resolved_to
    return filters


def _period_to_range(preset: str) -> tuple[str, str]:
    today = date.today()
    if preset == "all":
        return "", ""
    if preset == "last7":
        start = today - timedelta(days=6)
        return start.isoformat(), today.isoformat()
    if preset == "last30":
        start = today - timedelta(days=29)
        return start.isoformat(), today.isoformat()
    if preset == "last90":
        start = today - timedelta(days=89)
        return start.isoformat(), today.isoformat()
    if preset == "mtd":
        return today.replace(day=1).isoformat(), today.isoformat()
    if preset == "ytd":
        return today.replace(month=1, day=1).isoformat(), today.isoformat()
    return "", ""


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _date_in_range(date_str: str | None, date_from: str, date_to: str) -> bool:
    if not date_from and not date_to:
        return True
    if not date_str:
        return False
    parsed = _parse_date(date_str)
    if not parsed:
        return False
    start = _parse_date(date_from)
    end = _parse_date(date_to)
    if start and parsed < start:
        return False
    if end and parsed > end:
        return False
    return True


def _program_chart_color(program_id: str, index: int) -> str:
    if program_id in PROGRAM_CHART_COLORS:
        return PROGRAM_CHART_COLORS[program_id]
    return PROGRAM_CHART_FALLBACK_COLORS[index % len(PROGRAM_CHART_FALLBACK_COLORS)]


def _case_matches_filters(case: dict, filters: CaseloadFilters) -> bool:
    if filters.program_id and case.get("program_id") != filters.program_id:
        return False
    case_date = case.get("open_date") or case.get("created_at")
    return _date_in_range(case_date, filters.date_from, filters.date_to)


def _client_matches_filters(client: dict, cases: list[dict], filters: CaseloadFilters, *, require_case: bool) -> bool:
    if not _date_in_range(client.get("registered_at"), filters.date_from, filters.date_to):
        return False
    needs_case = require_case or bool(filters.program_id) or bool(filters.case_status)
    if not needs_case:
        return True
    return any(_case_matches_filters(case, filters) for case in cases)


def _filter_cases(cases: list[dict], filters: CaseloadFilters, case_manager_id: str | None) -> list[dict]:
    filtered = cases
    if not filters.case_status:
        pass
    elif filters.case_status == "closed":
        filtered = [case for case in filtered if case.get("status") == "closed"]
    else:
        filtered = [case for case in filtered if case.get("status") != "closed"]
    filtered = [case for case in filtered if _case_matches_filters(case, filters)]
    if case_manager_id:
        filtered = [case for case in filtered if case.get("case_manager_id") == case_manager_id]
    return filtered


def _cases_by_client(cases: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for case in cases:
        grouped.setdefault(case["client_id"], []).append(case)
    return grouped


async def build_caseload(db, tenant_id: str, user: dict, filters: CaseloadFilters) -> dict[str, Any]:
    case_manager_id = user["_id"] if user.get("role") == "case_manager" else None

    case_query: dict = {"tenant_id": tenant_id}
    if case_manager_id:
        case_query["case_manager_id"] = case_manager_id
    all_cases = await db.cases.find(case_query).to_list(5000)
    clients = await db.clients.find({"tenant_id": tenant_id}).to_list(5000)
    clients_by_id = {client["_id"]: client for client in clients}
    cases = _filter_cases(all_cases, filters, None if case_manager_id else None)

    by_program: dict[str, set[str]] = {}
    clients_with_open_case: set[str] = set()
    for case in cases:
        program_id = case.get("program_id") or "unknown"
        by_program.setdefault(program_id, set()).add(case["client_id"])
        clients_with_open_case.add(case["client_id"])

    people_by_program: list[dict] = []
    for index, program_id in enumerate(ALL_PROGRAM_IDS):
        client_ids = by_program.get(program_id, set())
        if not client_ids:
            continue
        people_by_program.append(
            {
                "programId": program_id,
                "programLabel": PROGRAM_LABELS.get(program_id, program_id),
                "count": len(client_ids),
                "color": _program_chart_color(program_id, index),
            }
        )

    for program_id, client_ids in by_program.items():
        if program_id in ALL_PROGRAM_IDS:
            continue
        people_by_program.append(
            {
                "programId": program_id,
                "programLabel": PROGRAM_LABELS.get(program_id, program_id),
                "count": len(client_ids),
                "color": _program_chart_color(program_id, len(people_by_program)),
            }
        )

    if (
        not case_manager_id
        and not filters.program_id
        and (not filters.case_status or filters.case_status == "active")
    ):
        registered_only_ids = [
            client["_id"]
            for client in clients
            if client["_id"] not in clients_with_open_case
            and _client_matches_filters(client, [], filters, require_case=False)
        ]
        if registered_only_ids:
            people_by_program.append(
                {
                    "programId": REGISTERED_ONLY_PROGRAM_ID,
                    "programLabel": "Registration only (no open case)",
                    "count": len(registered_only_ids),
                    "color": _program_chart_color(REGISTERED_ONLY_PROGRAM_ID, len(people_by_program)),
                }
            )

    if filters.program_id:
        people_by_program = [row for row in people_by_program if row["programId"] == filters.program_id]

    client_program_counts: dict[str, set[str]] = {}
    for case in cases:
        client_program_counts.setdefault(case["client_id"], set()).add(case.get("program_id") or "unknown")

    bucket_counts = {"1": 0, "2": 0, "3plus": 0}
    client_program_rows: list[dict] = []
    for client_id, program_ids in client_program_counts.items():
        count = len(program_ids)
        if count >= 3:
            bucket_counts["3plus"] += 1
        else:
            bucket_counts[str(count)] = bucket_counts.get(str(count), 0) + 1
        labels = sorted(PROGRAM_LABELS.get(pid, pid) for pid in program_ids)
        client = clients_by_id.get(client_id, {})
        open_cases = sum(1 for case in cases if case["client_id"] == client_id)
        client_program_rows.append(
            {
                "clientId": client_id,
                "clientName": client.get("name"),
                "programCount": count,
                "programs": " · ".join(labels),
                "openCases": open_cases,
                "bucketId": "3plus" if count >= 3 else str(count),
            }
        )

    multi_program_count = sum(1 for row in client_program_rows if row["programCount"] >= 2)
    multi_program_distribution = [
        {
            "bucketId": bucket["id"],
            "programLabel": bucket["label"],
            "count": bucket_counts.get(bucket["id"], 0),
            "color": bucket["color"],
        }
        for bucket in MULTI_PROGRAM_BUCKETS
    ]

    scoped_client_ids = set(client_program_counts.keys())
    risk_counts = {level: 0 for level in RISK_LEVELS}
    for client_id in scoped_client_ids:
        client = clients_by_id.get(client_id)
        if not client:
            continue
        client_cases = [case for case in cases if case["client_id"] == client_id]
        if not _client_matches_filters(client, client_cases, filters, require_case=True):
            continue
        latest_risk = None
        for case in client_cases:
            risk = await load_latest_risk(db, case["_id"])
            if risk:
                latest_risk = risk
                break
        level = (latest_risk or {}).get("overall_risk") or "Unknown"
        risk_counts[level] = risk_counts.get(level, 0) + 1

    caseload_by_risk = [
        {"riskLevel": level, "count": risk_counts[level]}
        for level in RISK_LEVELS
        if risk_counts[level] > 0
    ]

    enrollment_query: dict = {"tenant_id": tenant_id, "voided": {"$ne": True}}
    if filters.event_id:
        enrollment_query["service_or_event_id"] = filters.event_id
    enrollments = await db.service_enrollments.find(enrollment_query).to_list(5000)
    event_enrollment_rows: list[dict] = []
    for enrollment in enrollments:
        if not _date_in_range(enrollment.get("date_enrolled"), filters.date_from, filters.date_to):
            continue
        case = next((item for item in all_cases if item["_id"] == enrollment.get("case_id")), None)
        if not case:
            continue
        if case_manager_id and case.get("case_manager_id") != case_manager_id:
            continue
        client = clients_by_id.get(enrollment.get("client_id"), {})
        event_id = enrollment.get("service_or_event_id")
        event_enrollment_rows.append(
            {
                "clientName": client.get("name"),
                "dateEnrolled": enrollment.get("date_enrolled"),
                "eventName": EVENT_BY_ID.get(event_id, {}).get("label", event_id),
            }
        )

    overdue_rows: list[dict] = []
    for case in cases:
        risk = await load_latest_risk(db, case["_id"])
        if not risk:
            continue
        notes = (
            await db.case_notes.find({"case_id": case["_id"], "voided": {"$ne": True}})
            .sort("date", -1)
            .to_list(1)
        )
        last_date = notes[0]["date"] if notes else case.get("open_date")
        cadence = follow_up_status(risk.get("overall_risk"), last_date)
        if cadence["overdue"]:
            client = clients_by_id.get(case["client_id"], {})
            overdue_rows.append(
                {
                    "clientName": client.get("name"),
                    "riskLevel": risk.get("overall_risk"),
                    "daysOverdue": cadence["daysOverdue"],
                    "cadence": cadence["label"],
                }
            )
    overdue_rows.sort(key=lambda row: row.get("daysOverdue", 0), reverse=True)

    referrals = await db.cbo_referrals.find(
        {"tenant_id": tenant_id, "status": {"$in": ["Pending", "Sent"]}}
    ).to_list(5000)
    cbo_rows: list[dict] = []
    for referral in referrals:
        case = next((item for item in all_cases if item["_id"] == referral.get("case_id")), None)
        if not case:
            continue
        if case_manager_id and case.get("case_manager_id") != case_manager_id:
            continue
        client = clients_by_id.get(referral.get("client_id"), {})
        cbo_rows.append(
            {
                "clientName": client.get("name"),
                "cboName": referral.get("cbo_name"),
                "status": referral.get("status"),
                "date": referral.get("date"),
            }
        )

    return {
        "filters": {
            "period": filters.period,
            "dateFrom": filters.date_from,
            "dateTo": filters.date_to,
            "programId": filters.program_id,
            "caseStatus": filters.case_status,
            "eventId": filters.event_id,
        },
        "filterOptions": {
            "programs": [{"id": pid, "label": PROGRAM_LABELS[pid]} for pid in ALL_PROGRAM_IDS],
            "events": [{"id": event["id"], "label": event["label"]} for event in EVENTS],
        },
        "peopleByProgram": people_by_program,
        "multiProgram": {
            "count": multi_program_count,
            "distribution": multi_program_distribution,
            "clients": sorted(
                client_program_rows,
                key=lambda row: (-row["programCount"], (row.get("clientName") or "")),
            ),
        },
        "caseloadByRisk": caseload_by_risk,
        "eventEnrollment": event_enrollment_rows,
        "overdueFollowUps": overdue_rows,
        "openCboReferrals": cbo_rows,
    }

"""Run saved custom reports with live data."""

from __future__ import annotations

from typing import Any

from app.catalog.events import EVENT_BY_ID
from app.catalog.risk_domains import PROGRAM_LABELS
from app.services.case_evidence import load_latest_risk
from app.services.report_caseload import (
    ALL_PROGRAM_IDS,
    CaseloadFilters,
    _date_in_range,
    _filter_cases,
    _program_chart_color,
)

ENTITY_LABELS = {
    "client": "Client",
    "case": "Case",
    "riskAssessment": "Risk assessment",
}

PROGRAM_CHART_COLORS = {
    "prog-senior-services": "#2563eb",
    "prog-community-services": "#059669",
    "prog-parenting-support": "#7c3aed",
    "prog-mental-health": "#db2777",
}


def _column_key(entity: str, field: str) -> str:
    return f"{entity}_{field}"


def _format_value(entity: str, field: str, raw: Any) -> str:
    if raw is None or raw == "":
        return ""
    if field == "programId":
        return PROGRAM_LABELS.get(str(raw), str(raw))
    if field == "serviceOrEventId":
        return EVENT_BY_ID.get(str(raw), {}).get("label", str(raw))
    if field == "overallRisk":
        return str(raw)
    if field == "status":
        return str(raw).replace("_", " ").title()
    return str(raw)


async def list_custom_reports(db, tenant_id: str, user: dict) -> list[dict]:
    user_id = user["_id"]
    query = {
        "tenant_id": tenant_id,
        "$or": [{"owner_id": user_id}, {"shared": True}],
    }
    reports = await db.custom_reports.find(query).sort("name", 1).to_list(100)
    return [
        {
            "id": report["_id"],
            "name": report["name"],
            "reportType": report["report_type"],
            "updatedAt": report.get("updated_at"),
            "primaryEntity": report.get("primary_entity", "client"),
        }
        for report in reports
    ]


async def run_custom_report(
    db,
    tenant_id: str,
    user: dict,
    report_doc: dict,
    filters: CaseloadFilters,
) -> dict[str, Any]:
    report_type = report_doc.get("report_type", "table")
    if report_type == "chart":
        return await _run_chart_report(db, tenant_id, user, report_doc, filters)
    return await _run_table_report(db, tenant_id, user, report_doc, filters)


def _read_field(source: dict, field: str) -> Any:
    field_map = {
        "programId": "program_id",
        "overallRisk": "overall_risk",
        "openDate": "open_date",
        "registeredAt": "registered_at",
        "clientId": "client_id",
    }
    return source.get(field_map.get(field, field))


async def _run_table_report(
    db,
    tenant_id: str,
    user: dict,
    report_doc: dict,
    filters: CaseloadFilters,
) -> dict[str, Any]:
    primary_entity = report_doc.get("primary_entity", "client")
    columns = report_doc.get("columns") or []
    case_manager_id = user["_id"] if user.get("role") == "case_manager" else None

    case_query: dict = {"tenant_id": tenant_id}
    if case_manager_id:
        case_query["case_manager_id"] = case_manager_id
    all_cases = await db.cases.find(case_query).to_list(5000)
    cases = _filter_cases(all_cases, filters, None)
    clients = await db.clients.find({"tenant_id": tenant_id}).to_list(5000)

    output_columns = [
        {
            "key": _column_key(col["entity"], col["field"]),
            "label": col.get("label") or col["field"],
        }
        for col in columns
    ]

    rows: list[dict[str, str]] = []
    if primary_entity == "client":
        client_ids = {case["client_id"] for case in cases}
        scoped_clients = [client for client in clients if client["_id"] in client_ids]
        scoped_clients = [
            client
            for client in scoped_clients
            if _date_in_range(client.get("registered_at"), filters.date_from, filters.date_to)
        ]
        clients_by_id = {client["_id"]: client for client in scoped_clients}

        for client_id, client in clients_by_id.items():
            client_cases = [case for case in cases if case["client_id"] == client_id]
            if not client_cases:
                continue
            active_case = next((case for case in client_cases if case.get("status") != "closed"), client_cases[0])
            latest_risk = await load_latest_risk(db, active_case["_id"])
            context = {
                "client": client,
                "case": active_case,
                "riskAssessment": latest_risk or {},
            }
            row: dict[str, str] = {}
            for col, out_col in zip(columns, output_columns, strict=False):
                source = context.get(col["entity"], {})
                raw = _read_field(source, col["field"])
                row[out_col["key"]] = _format_value(col["entity"], col["field"], raw)
            rows.append(row)

        sort_field = report_doc.get("sort_by", {})
        if sort_field.get("field") == "name":
            rows.sort(key=lambda item: item.get(_column_key("client", "name"), ""))

    grain = ENTITY_LABELS.get(primary_entity, primary_entity.title())
    return {
        "reportType": "table",
        "meta": f"{len(rows)} {grain} rows",
        "columns": output_columns,
        "rows": rows,
    }


async def _run_chart_report(
    db,
    tenant_id: str,
    user: dict,
    report_doc: dict,
    filters: CaseloadFilters,
) -> dict[str, Any]:
    case_manager_id = user["_id"] if user.get("role") == "case_manager" else None
    case_query: dict = {"tenant_id": tenant_id}
    if case_manager_id:
        case_query["case_manager_id"] = case_manager_id
    all_cases = await db.cases.find(case_query).to_list(5000)
    cases = _filter_cases(all_cases, filters, None)

    chart = report_doc.get("chart") or {}
    x_field = chart.get("x_axis", {}).get("field", "programId")
    counts: dict[str, int] = {}
    for case in cases:
        if x_field == "programId":
            key = case.get("program_id") or "unknown"
        else:
            key = str(case.get(x_field.replace("programId", "program_id"), "unknown"))
        counts[key] = counts.get(key, 0) + 1

    points: list[dict] = []
    if x_field == "programId":
        for index, program_id in enumerate(ALL_PROGRAM_IDS):
            count = counts.get(program_id, 0)
            if count <= 0:
                continue
            points.append(
                {
                    "label": PROGRAM_LABELS.get(program_id, program_id),
                    "value": count,
                    "color": _program_chart_color(program_id, index),
                }
            )
        for program_id, count in counts.items():
            if program_id in ALL_PROGRAM_IDS or count <= 0:
                continue
            points.append(
                {
                    "label": PROGRAM_LABELS.get(program_id, program_id),
                    "value": count,
                    "color": PROGRAM_CHART_COLORS.get(program_id, "#64748b"),
                }
            )
    else:
        points = [{"label": key, "value": value, "color": "#2563eb"} for key, value in sorted(counts.items())]

    primary_entity = report_doc.get("primary_entity", "case")
    grain = ENTITY_LABELS.get(primary_entity, primary_entity.title())
    return {
        "reportType": "chart",
        "meta": f"{len(points)} groups · {len(cases)} {grain} records",
        "chartType": chart.get("chart_type", "bar"),
        "xLabel": "Program" if x_field == "programId" else x_field,
        "yLabel": "Count",
        "points": points,
        "rowCount": len(cases),
    }

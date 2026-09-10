"""Generic custom report preview runner for the report builder."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any

from app.catalog.events import EVENT_BY_ID
from app.catalog.risk_domains import PROGRAM_LABELS
from app.services.case_evidence import load_latest_risk
from app.services.report_caseload import CaseloadFilters, _date_in_range, _filter_cases, _program_chart_color

ENTITY_LABELS = {
    "client": "Client",
    "case": "Case",
    "serviceEnrollment": "Service enrollment",
    "cboReferral": "CBO referral",
    "riskAssessment": "Risk assessment",
}

FIELD_TO_DB = {
    "programId": "program_id",
    "overallRisk": "overall_risk",
    "openDate": "open_date",
    "registeredAt": "registered_at",
    "caseManagerId": "case_manager_id",
    "clientId": "client_id",
    "caseId": "case_id",
    "serviceOrEventId": "service_or_event_id",
    "dateEnrolled": "date_enrolled",
    "caseNumber": "case_number",
    "currentStage": "current_stage",
    "incompleteIntake": "incomplete_intake",
    "cboName": "cbo_name",
    "compositeScore": "composite_score",
}


def _db_field(field: str) -> str:
    return FIELD_TO_DB.get(field, field)


def _read_field(source: dict | None, field: str) -> Any:
    if not source:
        return None
    return source.get(_db_field(field))


def _format_value(entity: str, field: str, raw: Any) -> str:
    if raw is None or raw == "":
        return ""
    if field == "programId":
        return PROGRAM_LABELS.get(str(raw), str(raw))
    if field == "serviceOrEventId":
        return EVENT_BY_ID.get(str(raw), {}).get("label", str(raw))
    if field == "status" and entity in {"case", "cboReferral"}:
        return str(raw).replace("_", " ").title()
    if field == "incompleteIntake":
        return "Yes" if raw else "No"
    if field == "voided":
        return "Yes" if raw else "No"
    return str(raw)


def _matches_filter(raw: Any, filter_row: dict) -> bool:
    op = filter_row.get("op", "eq")
    value = str(filter_row.get("value", "")).lower()
    current = str(raw if raw is not None else "").lower()
    if op == "empty":
        return raw is None or raw == ""
    if op == "notEmpty":
        return raw is not None and raw != ""
    if op == "eq":
        return current == value
    if op == "neq":
        return current != value
    if op == "contains":
        return value in current
    if op == "true":
        return bool(raw)
    if op == "false":
        return not bool(raw)
    return True


def _column_key(entity: str, field: str) -> str:
    return f"{entity}_{field}"


def _apply_runtime_filters_to_cases(cases: list[dict], filters: CaseloadFilters) -> list[dict]:
    return _filter_cases(cases, filters, None)


async def _load_entity_rows(db, tenant_id: str, entity_id: str, user: dict) -> list[dict]:
    case_manager_id = user["_id"] if user.get("role") == "case_manager" else None
    if entity_id == "client":
        rows = await db.clients.find({"tenant_id": tenant_id}).to_list(5000)
        if case_manager_id:
            cases = await db.cases.find({"tenant_id": tenant_id, "case_manager_id": case_manager_id}).to_list(5000)
            client_ids = {case["client_id"] for case in cases}
            rows = [row for row in rows if row["_id"] in client_ids]
        return rows
    if entity_id == "case":
        query: dict = {"tenant_id": tenant_id}
        if case_manager_id:
            query["case_manager_id"] = case_manager_id
        return await db.cases.find(query).to_list(5000)
    if entity_id == "serviceEnrollment":
        rows = await db.service_enrollments.find({"tenant_id": tenant_id}).to_list(5000)
        if case_manager_id:
            cases = await db.cases.find({"tenant_id": tenant_id, "case_manager_id": case_manager_id}).to_list(5000)
            case_ids = {case["_id"] for case in cases}
            rows = [row for row in rows if row.get("case_id") in case_ids]
        return rows
    if entity_id == "cboReferral":
        rows = await db.cbo_referrals.find({"tenant_id": tenant_id}).to_list(5000)
        if case_manager_id:
            cases = await db.cases.find({"tenant_id": tenant_id, "case_manager_id": case_manager_id}).to_list(5000)
            case_ids = {case["_id"] for case in cases}
            rows = [row for row in rows if row.get("case_id") in case_ids]
        return rows
    return []


async def _resolve_related(
    db,
    primary_entity: str,
    primary_row: dict,
    join_entity: str,
    join_aggregates: dict,
) -> dict | None:
    if join_entity == "client" and primary_entity != "client":
        client_id = primary_row.get("client_id")
        if not client_id:
            return None
        return await db.clients.find_one({"_id": client_id})

    if join_entity == "case" and primary_entity == "client":
        cases = await db.cases.find({"client_id": primary_row["_id"]}).sort("open_date", -1).to_list(20)
        active = next((case for case in cases if case.get("status") != "closed"), None)
        return active or (cases[0] if cases else None)

    if join_entity == "riskAssessment":
        client_id = primary_row.get("client_id") if primary_entity != "client" else primary_row["_id"]
        if not client_id:
            return None
        cases = await db.cases.find({"client_id": client_id}).to_list(20)
        for case in cases:
            risk = await load_latest_risk(db, case["_id"])
            if risk:
                return risk
        return None

    if join_entity == "serviceEnrollment" and primary_entity == "client":
        return await db.service_enrollments.find_one({"client_id": primary_row["_id"], "voided": {"$ne": True}})

    if join_entity == "cboReferral" and primary_entity == "client":
        return await db.cbo_referrals.find_one({"client_id": primary_row["_id"]})

    return None


async def _build_contexts(
    db,
    tenant_id: str,
    user: dict,
    config: dict,
    runtime_filters: CaseloadFilters,
) -> list[dict[str, dict]]:
    primary_entity = config.get("primaryEntity", "client")
    joins = config.get("joins") or []
    filters = config.get("filters") or []
    join_aggregates = config.get("joinAggregates") or {}

    primary_rows = await _load_entity_rows(db, tenant_id, primary_entity, user)

    if primary_entity == "client":
        primary_rows = [
            row
            for row in primary_rows
            if _date_in_range(row.get("registered_at"), runtime_filters.date_from, runtime_filters.date_to)
        ]
    if primary_entity == "case":
        primary_rows = _apply_runtime_filters_to_cases(primary_rows, runtime_filters)

    contexts: list[dict[str, dict]] = []
    for primary_row in primary_rows:
        context = {primary_entity: primary_row}
        for join_entity in joins:
            context[join_entity] = await _resolve_related(
                db, primary_entity, primary_row, join_entity, join_aggregates
            ) or {}

        passes = True
        for filter_row in filters:
            source = context.get(filter_row.get("entity", primary_entity), primary_row)
            if not _matches_filter(_read_field(source, filter_row.get("field", "")), filter_row):
                passes = False
                break
        if not passes:
            continue

        if primary_entity == "client" and runtime_filters.program_id:
            case = context.get("case", {})
            if case.get("program_id") != runtime_filters.program_id:
                continue

        if primary_entity == "serviceEnrollment" and runtime_filters.event_id:
            if primary_row.get("service_or_event_id") != runtime_filters.event_id:
                continue
            if not _date_in_range(primary_row.get("date_enrolled"), runtime_filters.date_from, runtime_filters.date_to):
                continue

        contexts.append(context)
    return contexts


async def run_report_config(
    db,
    tenant_id: str,
    user: dict,
    config: dict,
    runtime_filters: CaseloadFilters,
) -> dict[str, Any]:
    report_type = config.get("reportType", "table")
    if report_type == "chart":
        return await _run_chart_config(db, tenant_id, user, config, runtime_filters)
    return await _run_table_config(db, tenant_id, user, config, runtime_filters)


async def _run_table_config(
    db,
    tenant_id: str,
    user: dict,
    config: dict,
    runtime_filters: CaseloadFilters,
) -> dict[str, Any]:
    primary_entity = config.get("primaryEntity", "client")
    columns = config.get("columns") or []
    sort_by = config.get("sortBy") or {}

    if not columns:
        columns = [
            {"entity": primary_entity, "field": "name" if primary_entity == "client" else "id", "label": "Name"},
        ]

    output_columns = [
        {
            "key": _column_key(col["entity"], col["field"]),
            "label": col.get("label") or col["field"],
        }
        for col in columns
    ]

    contexts = await _build_contexts(db, tenant_id, user, config, runtime_filters)
    rows: list[dict[str, str]] = []
    for context in contexts:
        row: dict[str, str] = {}
        for col, out_col in zip(columns, output_columns, strict=False):
            source = context.get(col["entity"], context.get(primary_entity, {}))
            raw = _read_field(source, col["field"])
            row[out_col["key"]] = _format_value(col["entity"], col["field"], raw)
        rows.append(row)

    sort_entity = sort_by.get("entity")
    sort_field = sort_by.get("field")
    if sort_field:
        sort_key = _column_key(sort_entity or primary_entity, sort_field)
        reverse = sort_by.get("dir") == "desc"
        rows.sort(key=lambda item: item.get(sort_key, ""), reverse=reverse)

    grain = ENTITY_LABELS.get(primary_entity, primary_entity.title())
    return {
        "reportType": "table",
        "meta": f"{len(rows)} {grain} rows",
        "columns": output_columns,
        "rows": rows,
    }


async def _run_chart_config(
    db,
    tenant_id: str,
    user: dict,
    config: dict,
    runtime_filters: CaseloadFilters,
) -> dict[str, Any]:
    chart = config.get("chart") or {}
    x_axis = chart.get("xAxis") or chart.get("x_axis")
    y_axis = chart.get("yAxis") or chart.get("y_axis") or {"aggregate": "count"}
    if not x_axis:
        return {
            "reportType": "chart",
            "error": "missing_x",
            "meta": "Add a category field to the X axis to preview this chart.",
            "points": [],
        }

    contexts = await _build_contexts(db, tenant_id, user, config, runtime_filters)
    aggregate = y_axis.get("aggregate", "count")
    buckets: dict[str, dict] = defaultdict(lambda: {"count": 0, "sum": 0.0, "n": 0})

    for context in contexts:
        x_source = context.get(x_axis.get("entity", config.get("primaryEntity", "case")), {})
        x_raw = _read_field(x_source, x_axis.get("field", "programId"))
        label = _format_value(x_axis.get("entity", ""), x_axis.get("field", ""), x_raw) or "(blank)"
        bucket = buckets[label]
        bucket["n"] += 1
        if aggregate == "count":
            bucket["count"] += 1
        elif y_axis.get("field"):
            y_source = context.get(y_axis.get("entity", ""), {})
            raw = _read_field(y_source, y_axis.get("field"))
            try:
                num = float(raw)
            except (TypeError, ValueError):
                num = 0
            bucket["sum"] += num
            bucket["count"] += 1

    points = []
    for index, (label, bucket) in enumerate(sorted(buckets.items(), key=lambda item: item[0])):
        if aggregate == "avg":
            value = round(bucket["sum"] / bucket["count"], 1) if bucket["count"] else 0
        elif aggregate in {"sum"}:
            value = int(bucket["sum"])
        else:
            value = bucket["n"]
        color = _program_chart_color(label, index) if x_axis.get("field") == "programId" else None
        if not color or color == _program_chart_color("", index):
            colors = ["#2563eb", "#059669", "#7c3aed", "#db2777", "#d97706", "#0891b2"]
            color = colors[index % len(colors)]
        points.append({"label": label, "value": value, "color": color})

    primary_entity = config.get("primaryEntity", "case")
    grain = ENTITY_LABELS.get(primary_entity, primary_entity.title())
    x_label = "Program" if x_axis.get("field") == "programId" else x_axis.get("field", "Category")
    y_label = "Count" if aggregate == "count" else aggregate.title()

    return {
        "reportType": "chart",
        "meta": f"{len(points)} groups · {len(contexts)} {grain} records",
        "chartType": chart.get("chartType") or chart.get("chart_type") or "bar",
        "xLabel": x_label,
        "yLabel": y_label,
        "points": points,
        "rowCount": len(contexts),
    }


def report_doc_to_config(doc: dict) -> dict:
    chart = doc.get("chart") or {}
    if chart and "x_axis" in chart:
        chart = {
            "xAxis": chart.get("x_axis"),
            "yAxis": chart.get("y_axis") or {"aggregate": "count"},
            "chartType": chart.get("chart_type", "bar"),
            "xGrouping": chart.get("x_grouping", "none"),
        }
    return {
        "id": doc["_id"],
        "name": doc.get("name", ""),
        "reportType": doc.get("report_type", "table"),
        "primaryEntity": doc.get("primary_entity", "client"),
        "joins": doc.get("joins") or [],
        "columns": doc.get("columns") or [],
        "filters": doc.get("filters") or [],
        "sortBy": doc.get("sort_by"),
        "joinAggregates": doc.get("join_aggregates") or {"riskAssessment": "latest"},
        "chart": chart or {"xAxis": None, "yAxis": {"aggregate": "count"}, "chartType": "bar", "xGrouping": "none"},
        "updatedAt": doc.get("updated_at"),
    }


def config_to_report_doc(config: dict, tenant_id: str, owner_id: str) -> dict:
    chart = config.get("chart") or {}
    chart_doc = None
    if config.get("reportType") == "chart":
        chart_doc = {
            "x_axis": chart.get("xAxis"),
            "y_axis": chart.get("yAxis") or {"aggregate": "count"},
            "chart_type": chart.get("chartType", "bar"),
            "x_grouping": chart.get("xGrouping", "none"),
        }
    return {
        "_id": config.get("id") or f"cr-{int(datetime.utcnow().timestamp() * 1000)}",
        "tenant_id": tenant_id,
        "name": config.get("name", "Untitled report"),
        "report_type": config.get("reportType", "table"),
        "owner_id": owner_id,
        "shared": True,
        "primary_entity": config.get("primaryEntity", "client"),
        "joins": config.get("joins") or [],
        "columns": config.get("columns") or [],
        "filters": config.get("filters") or [],
        "sort_by": config.get("sortBy"),
        "join_aggregates": config.get("joinAggregates") or {"riskAssessment": "latest"},
        "chart": chart_doc,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }

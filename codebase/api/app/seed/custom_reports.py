"""Seed demo custom reports matching Docs/ui/js/seed/seedData.js."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.custom_report import CustomReport

SEED_CUSTOM_REPORTS = [
    {
        "id": "cr-seed-caseload",
        "tenant_id": settings.default_tenant_id,
        "name": "Active client caseload",
        "report_type": "table",
        "owner_id": "usr-supervisor",
        "shared": True,
        "primary_entity": "client",
        "joins": ["case", "riskAssessment"],
        "columns": [
            {"entity": "client", "field": "name", "label": "Client"},
            {"entity": "client", "field": "phone", "label": "Phone"},
            {"entity": "case", "field": "programId", "label": "Program"},
            {"entity": "case", "field": "status", "label": "Status"},
            {"entity": "riskAssessment", "field": "overallRisk", "label": "Risk Level"},
        ],
        "filters": [{"entity": "case", "field": "status", "op": "eq", "value": "active"}],
        "sort_by": {"entity": "client", "field": "name", "dir": "asc"},
        "join_aggregates": {"riskAssessment": "latest"},
        "updated_at": datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
    },
    {
        "id": "cr-seed-by-program",
        "tenant_id": settings.default_tenant_id,
        "name": "Cases by program (chart)",
        "report_type": "chart",
        "owner_id": "usr-supervisor",
        "shared": True,
        "primary_entity": "case",
        "joins": [],
        "columns": [],
        "filters": [{"entity": "case", "field": "status", "op": "eq", "value": "active"}],
        "chart": {
            "x_axis": {"entity": "case", "field": "programId"},
            "y_axis": {"aggregate": "count"},
            "chart_type": "bar",
        },
        "updated_at": datetime(2026, 8, 1, 12, 0, tzinfo=timezone.utc),
    },
]


async def seed_custom_reports_if_empty(session: AsyncSession) -> None:
    for seed in SEED_CUSTOM_REPORTS:
        result = await session.execute(select(CustomReport).where(CustomReport.id == seed["id"]))
        if result.scalar_one_or_none():
            continue
        session.add(CustomReport(**seed))
    await session.commit()

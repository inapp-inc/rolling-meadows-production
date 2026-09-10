"""In-memory report query adapter backed by PostgreSQL (legacy dict/cursor API for report services)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import (
    Case,
    CaseAuditEntry,
    CaseClosure,
    CaseIntake,
    CaseNote,
    CaseReferral,
    CboReferral,
    RiskAssessment,
    ServiceEnrollment,
)
from app.models.client import Client
from app.models.custom_report import CustomReport
from app.models.user import User
from app.services.case_store import _audit_to_dict, _cbo_to_dict, _enrollment_to_dict, _note_to_dict, _risk_to_dict
from app.services.clients import client_model_to_dict


def _case_to_dict(case: Case) -> dict:
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


def _user_to_dict(user: User) -> dict:
    return {
        "_id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "tenant_id": user.tenant_id,
        "program_id": user.program_id,
        "status": user.status,
    }


def _custom_report_to_dict(row: CustomReport) -> dict:
    chart = row.chart
    return {
        "_id": row.id,
        "tenant_id": row.tenant_id,
        "name": row.name,
        "report_type": row.report_type,
        "owner_id": row.owner_id,
        "shared": row.shared,
        "primary_entity": row.primary_entity,
        "joins": row.joins or [],
        "columns": row.columns or [],
        "filters": row.filters or [],
        "sort_by": row.sort_by,
        "join_aggregates": row.join_aggregates or {},
        "chart": chart,
        "updated_at": row.updated_at.isoformat().replace("+00:00", "Z"),
    }


def _custom_report_from_doc(doc: dict) -> CustomReport:
    updated_raw = doc.get("updated_at")
    if isinstance(updated_raw, str):
        updated_at = datetime.fromisoformat(updated_raw.replace("Z", "+00:00"))
    else:
        updated_at = datetime.now(timezone.utc)
    return CustomReport(
        id=doc["_id"],
        tenant_id=doc["tenant_id"],
        name=doc.get("name", "Untitled report"),
        report_type=doc.get("report_type", "table"),
        owner_id=doc["owner_id"],
        shared=bool(doc.get("shared", True)),
        primary_entity=doc.get("primary_entity", "client"),
        joins=doc.get("joins") or [],
        columns=doc.get("columns") or [],
        filters=doc.get("filters") or [],
        sort_by=doc.get("sort_by"),
        join_aggregates=doc.get("join_aggregates") or {},
        chart=doc.get("chart"),
        updated_at=updated_at,
    )


def _matches(doc: dict, query: dict) -> bool:
    for key, expected in query.items():
        if key == "$or":
            if not any(_matches(doc, clause) for clause in expected):
                return False
            continue
        value = doc.get(key)
        if isinstance(expected, dict):
            if "$ne" in expected:
                ne_val = expected["$ne"]
                if value == ne_val:
                    return False
                continue
            if "$in" in expected:
                if value not in expected["$in"]:
                    return False
                continue
        elif value != expected:
            return False
    return True


class MongoCursor:
    def __init__(self, items: list[dict]):
        self._items = list(items)
        self._sort_key: tuple[str, int] | None = None

    def sort(
        self,
        spec: list[tuple[str, int]] | str,
        direction: int = 1,
    ) -> MongoCursor:
        if isinstance(spec, list):
            self._sort_key = spec[0]
        else:
            self._sort_key = (spec, direction)
        return self

    async def to_list(self, limit: int | None = None) -> list[dict]:
        items = self._items
        if self._sort_key:
            field, direction = self._sort_key
            items = sorted(items, key=lambda row: row.get(field) or "", reverse=direction < 0)
        if limit is not None:
            items = items[:limit]
        return items


class MongoCollection:
    def __init__(self, items: list[dict], *, session: AsyncSession | None = None, persist: bool = False):
        self._items = items
        self._session = session
        self._persist = persist

    def find(self, query: dict | None = None) -> MongoCursor:
        query = query or {}
        matched = [doc for doc in self._items if _matches(doc, query)]
        return MongoCursor(matched)

    async def find_one(
        self,
        query: dict,
        sort: list[tuple[str, int]] | None = None,
    ) -> dict | None:
        cursor = self.find(query)
        if sort:
            cursor._sort_key = sort[0]
        rows = await cursor.to_list(1)
        return rows[0] if rows else None

    async def count_documents(self, query: dict) -> int:
        return len([doc for doc in self._items if _matches(doc, query)])

    async def insert_one(self, doc: dict) -> None:
        self._items.append(doc)
        if self._persist and self._session is not None:
            self._session.add(_custom_report_from_doc(doc))

    async def update_one(self, query: dict, update: dict, upsert: bool = False) -> None:
        doc_set = update.get("$set", {})
        matched = next((doc for doc in self._items if _matches(doc, query)), None)
        if matched:
            matched.update(doc_set)
            if self._persist and self._session is not None:
                row = await self._session.get(CustomReport, matched["_id"])
                if row:
                    refreshed = _custom_report_from_doc(matched)
                    row.name = refreshed.name
                    row.report_type = refreshed.report_type
                    row.owner_id = refreshed.owner_id
                    row.shared = refreshed.shared
                    row.primary_entity = refreshed.primary_entity
                    row.joins = refreshed.joins
                    row.columns = refreshed.columns
                    row.filters = refreshed.filters
                    row.sort_by = refreshed.sort_by
                    row.join_aggregates = refreshed.join_aggregates
                    row.chart = refreshed.chart
                    row.updated_at = refreshed.updated_at
            return
        if upsert:
            doc = dict(doc_set)
            if "_id" not in doc:
                doc["_id"] = query.get("_id")
            await self.insert_one(doc)


class PostgresReportDb:
    def __init__(
        self,
        *,
        cases: MongoCollection,
        clients: MongoCollection,
        users: MongoCollection,
        service_enrollments: MongoCollection,
        case_notes: MongoCollection,
        cbo_referrals: MongoCollection,
        intakes: MongoCollection,
        referrals: MongoCollection,
        risk_assessments: MongoCollection,
        case_closures: MongoCollection,
        audit_log: MongoCollection,
        custom_reports: MongoCollection,
    ):
        self.cases = cases
        self.clients = clients
        self.users = users
        self.service_enrollments = service_enrollments
        self.case_notes = case_notes
        self.cbo_referrals = cbo_referrals
        self.intakes = intakes
        self.referrals = referrals
        self.risk_assessments = risk_assessments
        self.case_closures = case_closures
        self.audit_log = audit_log
        self.custom_reports = custom_reports


async def build_report_db(session: AsyncSession, tenant_id: str) -> PostgresReportDb:
    case_rows = (await session.execute(select(Case).where(Case.tenant_id == tenant_id))).scalars().all()
    client_rows = (await session.execute(select(Client).where(Client.tenant_id == tenant_id))).scalars().all()
    user_rows = (await session.execute(select(User).where(User.tenant_id == tenant_id))).scalars().all()

    case_ids = [case.id for case in case_rows]
    intake_rows = []
    referral_rows = []
    risk_rows = []
    note_rows = []
    enroll_rows = []
    cbo_rows = []
    closure_rows = []
    audit_rows = []
    custom_rows = []

    if case_ids:
        intake_rows = (
            await session.execute(select(CaseIntake).where(CaseIntake.tenant_id == tenant_id))
        ).scalars().all()
        referral_rows = (
            await session.execute(select(CaseReferral).where(CaseReferral.tenant_id == tenant_id))
        ).scalars().all()
        risk_rows = (
            await session.execute(select(RiskAssessment).where(RiskAssessment.tenant_id == tenant_id))
        ).scalars().all()
        note_rows = (
            await session.execute(select(CaseNote).where(CaseNote.tenant_id == tenant_id))
        ).scalars().all()
        enroll_rows = (
            await session.execute(select(ServiceEnrollment).where(ServiceEnrollment.tenant_id == tenant_id))
        ).scalars().all()
        cbo_rows = (
            await session.execute(select(CboReferral).where(CboReferral.tenant_id == tenant_id))
        ).scalars().all()
        closure_rows = (
            await session.execute(select(CaseClosure).where(CaseClosure.tenant_id == tenant_id))
        ).scalars().all()

    audit_rows = (
        await session.execute(select(CaseAuditEntry).where(CaseAuditEntry.tenant_id == tenant_id))
    ).scalars().all()
    custom_rows = (
        await session.execute(select(CustomReport).where(CustomReport.tenant_id == tenant_id))
    ).scalars().all()

    custom_docs = [_custom_report_to_dict(row) for row in custom_rows]

    return PostgresReportDb(
        cases=MongoCollection([_case_to_dict(row) for row in case_rows]),
        clients=MongoCollection([client_model_to_dict(row) for row in client_rows]),
        users=MongoCollection([_user_to_dict(row) for row in user_rows]),
        service_enrollments=MongoCollection([_enrollment_to_dict(row) for row in enroll_rows]),
        case_notes=MongoCollection([_note_to_dict(row) for row in note_rows]),
        cbo_referrals=MongoCollection([_cbo_to_dict(row) for row in cbo_rows]),
        intakes=MongoCollection([_intake_to_dict(row) for row in intake_rows]),
        referrals=MongoCollection(
            [
                {
                    "case_id": row.case_id,
                    "client_id": row.client_id,
                    "tenant_id": row.tenant_id,
                    "source": row.source,
                    "reason": row.reason,
                    "referrer_name": row.referrer_name,
                    "date_received": row.date_received.isoformat() if row.date_received else None,
                }
                for row in referral_rows
            ]
        ),
        risk_assessments=MongoCollection([_risk_to_dict(row) for row in risk_rows]),
        case_closures=MongoCollection([_closure_to_dict(row) for row in closure_rows]),
        audit_log=MongoCollection([_audit_to_dict(row) for row in audit_rows]),
        custom_reports=MongoCollection(custom_docs, session=session, persist=True),
    )

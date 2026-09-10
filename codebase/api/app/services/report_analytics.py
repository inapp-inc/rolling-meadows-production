"""Analytics tier computations mirroring Docs/ui/js/services/reportEngine.js."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any

from app.catalog.events import EVENT_BY_ID
from app.catalog.risk_domains import PROGRAM_LABELS
from app.services.case_evidence import load_latest_risk
from app.services.deduplication import pairs_among

SUBDIVISION_MAP: dict[str, str] = {
    "prog-senior-services": "senior",
    "prog-community-services": "community",
    "prog-parenting-support": "parenting",
    "prog-mental-health": "mental_health",
}

SUBDIVISION_LABELS: dict[str, str] = {
    "senior": "Senior Social Services",
    "community": "Community Services",
    "parenting": "Parenting Support",
    "mental_health": "Mental Health",
}

SUBDIVISION_COLORS: dict[str, str] = {
    "senior": "#2563eb",
    "community": "#059669",
    "parenting": "#7c3aed",
    "mental_health": "#db2777",
}

SUBDIVISION_ORDER = ["senior", "community", "parenting", "mental_health"]

AGE_BANDS = [
    {"id": "0-17", "min": 0, "max": 17, "label": "0–17"},
    {"id": "18-59", "min": 18, "max": 59, "label": "18–59"},
    {"id": "60-74", "min": 60, "max": 74, "label": "60–74"},
    {"id": "75+", "min": 75, "max": 200, "label": "75+"},
]

SERVICE_UTIL_LABELS: dict[str, str] = {
    "food_pantry": "Food Pantry",
    "therapy": "Therapy",
    "court_advocacy": "Court Advocacy",
    "crisis_counseling": "Crisis Counseling",
}

EVENT_TO_UTIL_CATEGORY: dict[str, str] = {
    "evt-food-pantry": "food_pantry",
    "evt-therapy": "therapy",
    "evt-court-advocacy": "court_advocacy",
    "evt-crisis-counseling": "crisis_counseling",
    "evt-meals": "food_pantry",
    "evt-holiday": "food_pantry",
    "evt-safety": "crisis_counseling",
    "evt-flu-awareness": "therapy",
}

ROLE_LABELS = {
    "case_manager": "Case Manager",
    "supervisor": "Supervisor / Dept Admin",
    "tenant_admin": "Tenant Admin",
}


def _zip_from_address(address: str | None) -> str:
    match = re.search(r"\b(\d{5})(?:-\d{4})?\b", address or "")
    return match.group(1) if match else "Unknown"


def _age_from_dob(dob: str | None) -> int | None:
    if not dob:
        return None
    try:
        born = date.fromisoformat(dob[:10])
    except ValueError:
        return None
    today = date.today()
    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    return age


def _days_between(start: str | None, end: str | None) -> int | None:
    if not start or not end:
        return None
    try:
        s = date.fromisoformat(str(start)[:10])
        e = date.fromisoformat(str(end)[:10])
    except ValueError:
        return None
    return (e - s).days


def _scoped_cases(cases: list[dict], case_manager_id: str | None) -> list[dict]:
    active = [c for c in cases if c.get("status") == "active"]
    if case_manager_id:
        active = [c for c in active if c.get("case_manager_id") == case_manager_id]
    return active


def _client_ids_for_cases(cases: list[dict]) -> set[str]:
    return {c["client_id"] for c in cases}


async def build_executive_tier(db, tenant_id: str, case_manager_id: str | None) -> dict[str, Any]:
    cases = await db.cases.find({"tenant_id": tenant_id}).to_list(5000)
    clients = await db.clients.find({"tenant_id": tenant_id}).to_list(5000)
    scoped_cases = _scoped_cases(cases, case_manager_id)
    client_ids = _client_ids_for_cases(scoped_cases)
    scoped_clients = [c for c in clients if c["_id"] in client_ids] if case_manager_id else clients

    open_case_client_ids = {c["client_id"] for c in cases if c.get("status") == "active"}
    registration_only = sum(
        1
        for c in clients
        if (not case_manager_id or c["_id"] in client_ids)
        and c["_id"] not in open_case_client_ids
    )

    enrollments = await db.service_enrollments.find({"tenant_id": tenant_id, "voided": {"$ne": True}}).to_list(5000)
    services_delivered = sum(
        1 for e in enrollments if not case_manager_id or e.get("client_id") in client_ids
    )

    zip_counts: dict[str, int] = {}
    age_counts: dict[str, int] = {b["id"]: 0 for b in AGE_BANDS}
    for client in scoped_clients:
        zip_code = _zip_from_address(client.get("address"))
        zip_counts[zip_code] = zip_counts.get(zip_code, 0) + 1
        age = _age_from_dob(client.get("dob"))
        if age is not None:
            for band in AGE_BANDS:
                if band["min"] <= age <= band["max"]:
                    age_counts[band["id"]] += 1
                    break

    zip_distribution = sorted(
        [{"zip": z, "count": n} for z, n in zip_counts.items()],
        key=lambda r: r["count"],
        reverse=True,
    )[:8]
    age_distribution = [
        {"ageBand": b["id"], "ageBandLabel": b["label"], "count": age_counts[b["id"]]}
        for b in AGE_BANDS
        if age_counts[b["id"]] > 0
    ]

    # KPIs
    referral_total = len(scoped_cases)
    referral_complete = sum(1 for c in scoped_cases if not c.get("incomplete_intake"))
    intake_within_7 = 0
    intake_eligible = 0
    time_to_service: list[int] = []

    for case in scoped_cases:
        open_date = case.get("open_date")
        if open_date:
            intake_eligible += 1
            intake = await db.intakes.find_one({"case_id": case["_id"]})
            if intake and not case.get("incomplete_intake"):
                intake_date = intake.get("updated_at") or intake.get("date_completed") or open_date
                days = _days_between(open_date, intake_date)
                if days is not None and days <= 7:
                    intake_within_7 += 1

        client_enrollments = [
            e for e in enrollments if e.get("case_id") == case["_id"] and not e.get("voided")
        ]
        if client_enrollments and open_date:
            first = min(client_enrollments, key=lambda e: e.get("date_enrolled") or "")
            tts = _days_between(open_date, first.get("date_enrolled"))
            if tts is not None:
                time_to_service.append(tts)

    now = date.today()
    prior_cutoff = now - timedelta(days=30)
    prior_start = now - timedelta(days=60)
    recent_enrollments = 0
    prior_enrollments = 0
    for e in enrollments:
        if e.get("voided") or case_manager_id and e.get("client_id") not in client_ids:
            continue
        enrolled = e.get("date_enrolled")
        if not enrolled:
            continue
        try:
            d = date.fromisoformat(str(enrolled)[:10])
        except ValueError:
            continue
        if d >= prior_cutoff:
            recent_enrollments += 1
        elif prior_start <= d < prior_cutoff:
            prior_enrollments += 1

    enrollment_trend = (
        round(((recent_enrollments - prior_enrollments) / prior_enrollments) * 100)
        if prior_enrollments
        else (100 if recent_enrollments else 0)
    )

    # Initiatives derived from event catalog (demo stand-in)
    initiatives = []
    for event_id, event in EVENT_BY_ID.items():
        count = sum(1 for e in enrollments if e.get("service_or_event_id") == event_id)
        if count == 0 and case_manager_id:
            continue
        initiatives.append(
            {
                "id": event_id,
                "name": event.get("label", event_id),
                "startDate": str(now.replace(day=1) - timedelta(days=90)),
                "endDate": str(now.replace(day=1) + timedelta(days=90)),
                "status": "active",
                "targetOutreach": max(count * 2, 10),
                "referralsGenerated": count,
                "enrollments": count,
                "completions": max(count - 1, 0),
                "outreachPct": min(100, round((count / max(count * 2, 1)) * 100)),
                "completionPct": min(100, round((max(count - 1, 0) / max(count, 1)) * 100)) if count else 0,
            }
        )

    return {
        "impact": {
            "totalClients": len(scoped_clients),
            "activeCases": len(scoped_cases),
            "registrationOnly": registration_only,
            "servicesDelivered": services_delivered,
            "zipDistribution": zip_distribution,
            "ageDistribution": age_distribution,
        },
        "kpis": {
            "referralCompletionRate": round((referral_complete / referral_total) * 100) if referral_total else None,
            "avgTimeToServiceDays": round(sum(time_to_service) / len(time_to_service)) if time_to_service else None,
            "intakeWithin7DayPct": round((intake_within_7 / intake_eligible) * 100) if intake_eligible else None,
            "enrollmentTrendPct": enrollment_trend,
        },
        "initiatives": sorted(initiatives, key=lambda x: x["name"]),
    }


async def build_operational_tier(db, tenant_id: str, case_manager_id: str | None) -> dict[str, Any]:
    cases = await db.cases.find({"tenant_id": tenant_id}).to_list(5000)
    scoped_cases = _scoped_cases(cases, case_manager_id)
    client_ids = _client_ids_for_cases(scoped_cases)

    by_sub: dict[str, dict] = {
        sid: {"openCases": 0, "clients": set(), "highRisk": 0, "incompleteIntake": 0} for sid in SUBDIVISION_ORDER
    }
    for case in scoped_cases:
        subdivision = SUBDIVISION_MAP.get(case.get("program_id", ""), "community")
        bucket = by_sub.setdefault(
            subdivision, {"openCases": 0, "clients": set(), "highRisk": 0, "incompleteIntake": 0}
        )
        bucket["openCases"] += 1
        bucket["clients"].add(case["client_id"])
        if case.get("incomplete_intake"):
            bucket["incompleteIntake"] += 1
        risk = await load_latest_risk(db, case["_id"])
        if risk and risk.get("overall_risk") == "High":
            bucket["highRisk"] += 1

    subdivision = [
        {
            "subdivisionId": sid,
            "subdivisionLabel": SUBDIVISION_LABELS.get(sid, sid),
            "openCases": by_sub[sid]["openCases"],
            "uniqueClients": len(by_sub[sid]["clients"]),
            "highRisk": by_sub[sid]["highRisk"],
            "incompleteIntake": by_sub[sid]["incompleteIntake"],
            "color": SUBDIVISION_COLORS.get(sid, "#2563eb"),
        }
        for sid in SUBDIVISION_ORDER
        if by_sub[sid]["openCases"] > 0 or by_sub[sid]["clients"]
    ]

    enrollments = await db.service_enrollments.find({"tenant_id": tenant_id, "voided": {"$ne": True}}).to_list(5000)
    month_units: dict[str, dict[str, int]] = {}
    for enr in enrollments:
        if case_manager_id and enr.get("client_id") not in client_ids:
            continue
        event_id = enr.get("service_or_event_id", "")
        category = EVENT_TO_UTIL_CATEGORY.get(event_id)
        if not category:
            continue
        month = str(enr.get("date_enrolled", ""))[:7] or date.today().strftime("%Y-%m")
        month_units.setdefault(month, {})
        month_units[month][category] = month_units[month].get(category, 0) + 1

    months = sorted(month_units.keys())[-6:]
    utilization_series = []
    for category in SERVICE_UTIL_LABELS:
        points = [{"month": m, "units": month_units.get(m, {}).get(category, 0)} for m in months]
        latest = points[-1]["units"] if points else 0
        utilization_series.append(
            {
                "category": category,
                "categoryLabel": SERVICE_UTIL_LABELS[category],
                "latestUnits": latest,
                "points": points,
            }
        )

    users = await db.users.find({"tenant_id": tenant_id, "role": {"$in": ["case_manager", "supervisor"]}}).to_list(100)
    if case_manager_id:
        users = [u for u in users if u["_id"] == case_manager_id]

    staff: list[dict] = []
    for user in users:
        user_cases = [c for c in scoped_cases if c.get("case_manager_id") == user["_id"]]
        u_client_ids = {c["client_id"] for c in user_cases}
        notes = await db.case_notes.count_documents(
            {"case_id": {"$in": [c["_id"] for c in user_cases]}, "voided": {"$ne": True}}
        )
        user_enrollments = sum(1 for e in enrollments if e.get("client_id") in u_client_ids)
        closures = await db.case_closures.count_documents({"case_id": {"$in": [c["_id"] for c in user_cases]}})
        caseload = len(user_cases)
        staff.append(
            {
                "staffId": user["_id"],
                "staffName": user.get("name", user.get("email", "Staff")),
                "role": ROLE_LABELS.get(user.get("role", ""), user.get("role", "")),
                "caseload": caseload,
                "notesLogged": notes,
                "enrollments": user_enrollments,
                "closures": closures,
                "estimatedDirectHours": round(notes * 0.5 + user_enrollments * 0.25 + caseload * 1.5),
            }
        )
    staff.sort(key=lambda s: s["caseload"], reverse=True)

    return {"subdivision": subdivision, "utilization": {"months": months, "series": utilization_series}, "staff": staff}


async def build_integrity_tier(db, tenant_id: str, case_manager_id: str | None) -> dict[str, Any]:
    clients = await db.clients.find({"tenant_id": tenant_id}).to_list(5000)
    cases = await db.cases.find({"tenant_id": tenant_id, "status": "active"}).to_list(5000)

    if case_manager_id:
        managed_ids = {c["client_id"] for c in cases if c.get("case_manager_id") == case_manager_id}
        clients = [c for c in clients if c["_id"] in managed_ids]
        cases = [c for c in cases if c.get("case_manager_id") == case_manager_id]

    pairs = pairs_among(clients)
    open_by_client: dict[str, list] = {}
    for case in cases:
        open_by_client.setdefault(case["client_id"], []).append(case)

    incomplete_clients = {c["client_id"] for c in cases if c.get("incomplete_intake")}
    registration_only = [c for c in clients if c["_id"] not in open_by_client]
    missing_cm = [
        c
        for c in clients
        if any(not case.get("case_manager_id") for case in open_by_client.get(c["_id"], []))
    ]

    issues: list[dict] = []
    for pair in pairs:
        a, b = pair["client_a"], pair["client_b"]
        issues.append(
            {
                "clientId": a["_id"],
                "issueType": "Possible duplicate",
                "clientName": a.get("name"),
                "detail": f"Possible duplicate of {b.get('name')}",
                "severity": "high",
            }
        )
    for cid in incomplete_clients:
        client = next((c for c in clients if c["_id"] == cid), None)
        if client:
            issues.append(
                {
                    "clientId": cid,
                    "issueType": "Incomplete intake",
                    "clientName": client.get("name"),
                    "detail": client.get("phone", ""),
                    "severity": "medium",
                }
            )
    for client in registration_only:
        issues.append(
            {
                "clientId": client["_id"],
                "issueType": "Registration only",
                "clientName": client.get("name"),
                "detail": client.get("registered_at", ""),
                "severity": "low",
            }
        )
    for client in missing_cm:
        issues.append(
            {
                "clientId": client["_id"],
                "issueType": "Missing case manager",
                "clientName": client.get("name"),
                "detail": client.get("phone", ""),
                "severity": "high",
            }
        )
    issues.sort(key=lambda r: r.get("clientName") or "")

    audit_entries = await db.audit_log.find({"tenant_id": tenant_id}).sort("timestamp", -1).to_list(25)
    users = await db.users.find({"tenant_id": tenant_id}).to_list(200)
    users_by_id = {u["_id"]: u for u in users}
    audit_log = []
    for entry in audit_entries:
        actor = users_by_id.get(entry.get("actor_id"), {})
        audit_log.append(
            {
                "timestamp": entry.get("timestamp") or entry.get("created_at", ""),
                "actor": actor.get("name") or entry.get("actor_id", "System"),
                "action": entry.get("action", ""),
                "entityRef": entry.get("entity_id", ""),
                "reason": entry.get("reason", ""),
            }
        )

    return {
        "summary": {
            "duplicatePairs": len(pairs),
            "incompleteIntakes": len(incomplete_clients),
            "registrationOnly": len(registration_only),
            "missingCaseManager": len(missing_cm),
            "totalIssues": len(issues),
        },
        "issues": issues,
        "auditLog": audit_log,
    }


async def build_tier(db, tier: str, tenant_id: str, user: dict) -> dict[str, Any]:
    case_manager_id = user["_id"] if user.get("role") == "case_manager" else None
    if tier == "executive":
        return {"tier": tier, **await build_executive_tier(db, tenant_id, case_manager_id)}
    if tier == "operational":
        return {"tier": tier, **await build_operational_tier(db, tenant_id, case_manager_id)}
    if tier == "integrity":
        return {"tier": tier, **await build_integrity_tier(db, tenant_id, case_manager_id)}
    raise ValueError(f"Unknown tier: {tier}")

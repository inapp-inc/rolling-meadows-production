from datetime import date


async def load_referral(db, case_id: str) -> dict | None:
    return await db.referrals.find_one({"case_id": case_id})


async def load_intake(db, case_id: str) -> dict | None:
    return await db.intakes.find_one({"case_id": case_id})


async def load_latest_risk(db, case_id: str) -> dict | None:
    return await db.risk_assessments.find_one({"case_id": case_id}, sort=[("date", -1)])


async def load_care_plan_items(db, case_id: str) -> list[dict]:
    items = await db.care_plan_items.find({"case_id": case_id, "voided": {"$ne": True}}).to_list(500)
    return sorted(items, key=lambda x: x.get("created_at", ""))


async def load_enrollments(db, case_id: str) -> list[dict]:
    items = await db.service_enrollments.find({"case_id": case_id, "voided": {"$ne": True}}).to_list(500)
    return sorted(items, key=lambda x: x.get("date_enrolled", ""), reverse=True)


async def load_cbo_referrals(db, case_id: str) -> list[dict]:
    items = await db.cbo_referrals.find({"case_id": case_id}).to_list(500)
    return sorted(items, key=lambda x: x.get("date", ""), reverse=True)


async def load_notes(db, case_id: str) -> list[dict]:
    items = await db.case_notes.find({"case_id": case_id, "voided": {"$ne": True}}).to_list(500)
    return sorted(items, key=lambda x: x.get("date", ""), reverse=True)


async def load_reassessments(db, case_id: str) -> list[dict]:
    items = await db.reassessments.find({"case_id": case_id}).to_list(500)
    return sorted(items, key=lambda x: x.get("date", ""), reverse=True)


async def load_closure(db, case_id: str) -> dict | None:
    return await db.case_closures.find_one({"case_id": case_id})


async def load_documents(db, case_id: str) -> list[dict]:
    items = await db.documents.find({"case_id": case_id}).to_list(500)
    return sorted(items, key=lambda x: x.get("uploaded_at", ""), reverse=True)


async def load_assignment_history(db, case_id: str) -> list[dict]:
    items = await db.assignment_history.find({"case_id": case_id}).to_list(500)
    return sorted(items, key=lambda x: x.get("assigned_at", ""), reverse=True)


async def load_activity(db, case_id: str, limit: int = 50) -> list[dict]:
    items = await db.audit_log.find({"entity_id": case_id}).sort("timestamp", -1).to_list(limit)
    return items


async def load_all_evidence(db, case_id: str) -> dict:
    return {
        "referral": await load_referral(db, case_id),
        "intake": await load_intake(db, case_id),
        "risk": await load_latest_risk(db, case_id),
        "care_plan_items": await load_care_plan_items(db, case_id),
        "enrollments": await load_enrollments(db, case_id),
        "cbo_referrals": await load_cbo_referrals(db, case_id),
        "notes": await load_notes(db, case_id),
        "reassessments": await load_reassessments(db, case_id),
        "closure": await load_closure(db, case_id),
        "documents": await load_documents(db, case_id),
        "assignment_history": await load_assignment_history(db, case_id),
        "activity": await load_activity(db, case_id),
    }

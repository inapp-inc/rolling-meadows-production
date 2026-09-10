import uuid
from datetime import date

from app.catalog.events import EVENT_BY_ID
from app.catalog.risk_domains import DOMAIN_LABELS, PROGRAM_LABELS, domains_for_subcategory
from app.catalog.workflows import workflow_for_subcategory
from app.services.clients import client_to_summary
from app.services.follow_up import follow_up_status
from app.services.workflow import compute_stage_statuses, current_stage_number


def next_case_number(existing_numbers: list[str]) -> str:
    year = date.today().year
    prefix = f"C-{year}-"
    max_n = 0
    for num in existing_numbers:
        if not str(num).startswith(prefix):
            continue
        try:
            max_n = max(max_n, int(str(num)[len(prefix) :]))
        except ValueError:
            continue
    return f"{prefix}{max_n + 1:03d}"


def new_case_id() -> str:
    return f"case-{uuid.uuid4().hex[:12]}"


def case_to_summary(doc: dict, client: dict | None = None) -> dict:
    return {
        "id": doc["_id"],
        "caseNumber": doc.get("case_number"),
        "clientId": doc.get("client_id"),
        "clientName": client.get("name") if client else None,
        "programId": doc.get("program_id"),
        "caseCategoryId": doc.get("case_category_id"),
        "caseSubcategoryId": doc.get("case_subcategory_id"),
        "caseManagerId": doc.get("case_manager_id"),
        "status": doc.get("status", "active"),
        "incompleteIntake": bool(doc.get("incomplete_intake")),
        "currentStage": doc.get("current_stage", 1),
        "openDate": doc.get("open_date"),
    }


def validate_case_create(category_id: str, subcategory_id: str, client_id: str) -> tuple[str, str]:
    from app.catalog.categories import SUB_BY_ID

    if subcategory_id not in SUB_BY_ID:
        raise ValueError("Invalid subcategory")
    cat = SUB_BY_ID[subcategory_id]["category"]
    if category_id and category_id != cat["id"]:
        raise ValueError("Category and subcategory mismatch")
    if not client_id:
        raise ValueError("clientId is required")
    return cat["id"], subcategory_id


def _referral_payload(referral: dict | None) -> dict | None:
    if not referral:
        return None
    return {
        "source": referral.get("source"),
        "reason": referral.get("reason"),
        "referrerName": referral.get("referrer_name"),
        "dateReceived": referral.get("date_received"),
    }


def _intake_payload(intake: dict | None) -> dict | None:
    if not intake:
        return None
    return {
        "consentOnFile": bool(intake.get("consent_on_file")),
        "livingArrangement": intake.get("living_arrangement"),
        "medicalHistory": intake.get("medical_history"),
        "comprehensiveAssessmentNotes": intake.get("comprehensive_assessment_notes"),
        "completeness": intake.get("completeness", "incomplete"),
    }


def _risk_payload(risk: dict | None, subcategory_id: str) -> dict | None:
    if not risk:
        return None
    domains = domains_for_subcategory(subcategory_id)
    return {
        "id": risk.get("_id"),
        "date": risk.get("date"),
        "ratings": risk.get("ratings") or {},
        "compositeScore": risk.get("composite_score"),
        "overallRisk": risk.get("overall_risk"),
        "overrideNote": risk.get("override_note"),
        "domains": [{"key": d, "label": DOMAIN_LABELS.get(d, d)} for d in domains],
    }


def _care_plan_payload(items: list[dict]) -> list[dict]:
    return [
        {
            "id": i["_id"],
            "issue": i.get("issue"),
            "goal": i.get("goal"),
            "service": i.get("service"),
            "status": i.get("status", "Not Started"),
        }
        for i in items
    ]


def _enrollment_payload(items: list[dict]) -> list[dict]:
    result = []
    for i in items:
        event = EVENT_BY_ID.get(i.get("service_or_event_id", ""), {})
        result.append(
            {
                "id": i["_id"],
                "serviceOrEventId": i.get("service_or_event_id"),
                "serviceLabel": event.get("label", i.get("service_or_event_id")),
                "dateEnrolled": i.get("date_enrolled"),
                "status": i.get("status", "active"),
            }
        )
    return result


def _cbo_payload(items: list[dict]) -> list[dict]:
    return [
        {
            "id": i["_id"],
            "cboName": i.get("cbo_name"),
            "status": i.get("status", "Pending"),
            "date": i.get("date"),
        }
        for i in items
    ]


def _note_payload(items: list[dict]) -> list[dict]:
    return [
        {
            "id": i["_id"],
            "date": i.get("date"),
            "type": i.get("type"),
            "text": i.get("text"),
            "authorId": i.get("author_id"),
        }
        for i in items
    ]


def _reassessment_payload(items: list[dict]) -> list[dict]:
    return [
        {
            "id": i["_id"],
            "date": i.get("date"),
            "trigger": i.get("trigger"),
            "previousRatings": i.get("previous_ratings"),
            "newRatings": i.get("new_ratings"),
        }
        for i in items
    ]


def _closure_payload(closure: dict | None) -> dict | None:
    if not closure:
        return None
    return {
        "date": closure.get("date"),
        "reason": closure.get("reason"),
        "outcomesSummary": closure.get("outcomes_summary"),
    }


def _document_payload(items: list[dict]) -> list[dict]:
    return [
        {
            "id": i["_id"],
            "filename": i.get("filename"),
            "sourceType": i.get("source_type"),
            "mimeType": i.get("mime_type"),
            "size": i.get("size"),
            "externalUrl": i.get("external_url"),
            "uploadedAt": i.get("uploaded_at"),
            "stageContext": i.get("stage_context"),
        }
        for i in items
    ]


def _assignment_payload(items: list[dict], users_by_id: dict) -> list[dict]:
    result = []
    for i in items:
        assignee = users_by_id.get(i.get("case_manager_id", ""), {})
        actor = users_by_id.get(i.get("assigned_by", ""), {})
        result.append(
            {
                "id": i.get("_id"),
                "caseManagerId": i.get("case_manager_id"),
                "caseManagerName": assignee.get("name", i.get("case_manager_id")),
                "assignedBy": i.get("assigned_by"),
                "assignedByName": actor.get("name", i.get("assigned_by")),
                "reason": i.get("reason"),
                "assignedAt": i.get("assigned_at"),
            }
        )
    return result


def _activity_payload(items: list[dict], users_by_id: dict) -> list[dict]:
    result = []
    for i in items:
        actor = users_by_id.get(i.get("actor_id", ""), {})
        result.append(
            {
                "action": i.get("action"),
                "actorId": i.get("actor_id"),
                "actorName": actor.get("name", i.get("actor_id")),
                "timestamp": i.get("timestamp"),
                "meta": i.get("meta"),
            }
        )
    return result


def build_workspace(
    case: dict,
    client: dict,
    evidence: dict,
    users_by_id: dict | None = None,
) -> dict:
    users_by_id = users_by_id or {}
    subcategory_id = case.get("case_subcategory_id", "")
    workflow = workflow_for_subcategory(subcategory_id)
    stage_statuses = compute_stage_statuses(case, client, evidence)
    current = current_stage_number(stage_statuses)

    risk = evidence.get("risk")
    notes = evidence.get("notes") or []
    last_note_date = notes[0].get("date") if notes else None
    risk_level = risk.get("overall_risk") if risk else None
    follow_up = follow_up_status(risk_level, last_note_date or case.get("open_date"))

    read_only = case.get("status") == "closed" or bool(evidence.get("closure"))

    return {
        "case": case_to_summary(case, client),
        "client": client_to_summary(client),
        "workflow": workflow,
        "stageStatuses": stage_statuses,
        "currentStage": current,
        "referral": _referral_payload(evidence.get("referral")),
        "intake": _intake_payload(evidence.get("intake")),
        "riskAssessment": _risk_payload(risk, subcategory_id),
        "carePlanItems": _care_plan_payload(evidence.get("care_plan_items") or []),
        "enrollments": _enrollment_payload(evidence.get("enrollments") or []),
        "cboReferrals": _cbo_payload(evidence.get("cbo_referrals") or []),
        "notes": _note_payload(notes),
        "reassessments": _reassessment_payload(evidence.get("reassessments") or []),
        "closure": _closure_payload(evidence.get("closure")),
        "documents": _document_payload(evidence.get("documents") or []),
        "assignmentHistory": _assignment_payload(evidence.get("assignment_history") or [], users_by_id),
        "activity": _activity_payload(evidence.get("activity") or [], users_by_id),
        "followUpCadence": follow_up,
        "riskDomains": [{"key": d, "label": DOMAIN_LABELS.get(d, d)} for d in domains_for_subcategory(subcategory_id)],
        "readOnly": read_only,
    }


def program_label(program_id: str) -> str:
    return PROGRAM_LABELS.get(program_id, program_id)

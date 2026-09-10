from app.catalog.workflows import workflow_for_subcategory


def compute_stage_statuses(case: dict, client: dict, evidence: dict) -> list[dict]:
    """Derive stage completion from evidence (BRD §6.2)."""
    workflow = workflow_for_subcategory(case.get("case_subcategory_id", ""))
    stages = workflow["stages"]

    referral = evidence.get("referral")
    intake = evidence.get("intake")
    risk = evidence.get("risk")
    care_plan_items = evidence.get("care_plan_items") or []
    enrollments = evidence.get("enrollments") or []
    notes = evidence.get("notes") or []
    reassessments = evidence.get("reassessments") or []
    closure = evidence.get("closure")

    intake_complete = bool(
        referral
        and referral.get("source")
        and referral.get("reason")
        and intake
        and intake.get("consent_on_file")
        and client.get("dob")
    )
    assessment_complete = bool(intake and (intake.get("comprehensive_assessment_notes") or "").strip())

    stage_evidence = {
        "intake": intake_complete,
        "assessment": assessment_complete,
        "risk": bool(risk and risk.get("ratings")),
        "careplan": len(care_plan_items) > 0,
        "services": len(enrollments) > 0,
        "followup": len(notes) > 0,
        "reassessment": len(reassessments) > 0,
        "closure": bool(closure) or case.get("status") == "closed",
    }

    result = []
    first_incomplete = None
    for s in stages:
        tab_id = s["tabId"]
        complete = stage_evidence.get(tab_id, False)
        if not complete and first_incomplete is None:
            status = "in_progress"
            first_incomplete = tab_id
        elif complete:
            status = "complete"
        else:
            status = "pending"
        result.append(
            {
                "tabId": tab_id,
                "stage": s["stage"],
                "label": s["label"],
                "deliverable": s.get("deliverable", ""),
                "status": status,
            }
        )

    support_tabs = [
        {"tabId": "documents", "stage": None, "label": "Documents", "deliverable": "", "status": "available"},
        {"tabId": "activity", "stage": None, "label": "Activity", "deliverable": "", "status": "available"},
    ]
    return result + support_tabs


def current_stage_number(stage_statuses: list[dict]) -> int:
    for s in stage_statuses:
        if s.get("status") == "in_progress" and s.get("stage"):
            return s["stage"]
    for s in reversed(stage_statuses):
        if s.get("status") == "complete" and s.get("stage"):
            return s["stage"]
    return 1

"""Workflow catalogue — mirrors Docs/ui/js/services/caseWorkflowService.js (English labels)."""

TAB_IDS = [
    "intake",
    "assessment",
    "risk",
    "careplan",
    "services",
    "followup",
    "reassessment",
    "closure",
]


def _stage(tab_id: str, label: str, deliverable: str = "") -> dict:
    return {"tabId": tab_id, "label": label, "deliverable": deliverable}


def _workflow(wid: str, name: str, description: str, example: str, stages: list[dict], focus: list[str]) -> dict:
    return {
        "id": wid,
        "name": name,
        "description": description,
        "exampleProgram": example,
        "focusAreas": focus,
        "stages": [{**s, "stage": i + 1} for i, s in enumerate(stages)],
    }


SENIOR_STAGES = [
    _stage("intake", "Referral & Intake", "Referral record and consent on file"),
    _stage("assessment", "Comprehensive Assessment", "Holistic assessment summary"),
    _stage("risk", "Risk Identification & Prioritization", "Prioritized risk profile"),
    _stage("careplan", "Care / Service Plan Development", "Individualized care plan"),
    _stage("services", "Service Coordination", "Service enrollments and CBO referrals"),
    _stage("followup", "Ongoing Monitoring & Follow-Up", "Contact notes and follow-up cadence"),
    _stage("reassessment", "Reassessment", "Updated risk ratings and plan adjustments"),
    _stage("closure", "Case Resolution / Closure", "Closure summary and outcomes"),
]

PARENT_STAGES = [
    _stage("intake", "Referral & Intake", "Referral record received and assigned"),
    _stage("assessment", "Intake & Enrollment", "Family profile and eligibility verified"),
    _stage("risk", "Needs Assessment", "Needs assessment summary"),
    _stage("careplan", "Goal Setting & Service Planning", "Individualized family support plan"),
    _stage("services", "Service Coordination & Referrals", "Referral tracking and activated services"),
    _stage("followup", "Ongoing Support & Monitoring", "Case notes and updated action items"),
    _stage("reassessment", "Progress Review", "Updated support plan and progress report"),
    _stage("closure", "Case Resolution / Closure", "Outcome summary and exit documentation"),
]

WORKFLOWS_BY_SUBCATEGORY: dict[str, dict] = {
    "sub-seniors-at-risk": _workflow(
        "wf-senior-at-risk",
        "Seniors at Risk Case Management",
        "Identify safety and wellbeing risks for older adults and coordinate protective services.",
        "Hospital or community referral for falls, isolation, or self-neglect concerns",
        SENIOR_STAGES,
        ["Fall prevention", "Medication safety", "Social isolation", "Abuse or neglect screening"],
    ),
    "sub-in-home-support": _workflow(
        "wf-in-home-support",
        "In-Home Support Workflow",
        "Support aging adults to remain safely at home through coordinated in-home services.",
        "Physician referral for ADL support and home safety",
        SENIOR_STAGES,
        ["Activities of daily living", "Caregiver support", "Home modifications"],
    ),
    "sub-nutrition-programs": _workflow(
        "wf-nutrition-programs",
        "Nutrition Program Workflow",
        "Connect seniors to meal programs and monitor nutritional wellbeing.",
        "Community referral for food insecurity or malnutrition risk",
        SENIOR_STAGES,
        ["Food access", "Meal delivery", "Dietary restrictions"],
    ),
    "sub-youth-empowerment": _workflow(
        "wf-youth-empowerment",
        "School Attendance Support Workflow",
        "Support families when school attendance or youth engagement is at risk.",
        "School referral for chronic absenteeism",
        PARENT_STAGES,
        ["School attendance", "Transportation barriers"],
    ),
    "sub-family-resource": _workflow(
        "wf-family-resource-center",
        "Family Resource Center Workflow",
        "Connect families to community resources through a family resource center model.",
        "Self-referral or agency referral to a family resource center",
        PARENT_STAGES,
        ["Parenting support", "Community resources"],
    ),
    "sub-parent-education": _workflow(
        "wf-parenting-skills",
        "Parenting Skills Program Workflow",
        "Build parenting confidence through coaching, groups, and counseling referrals.",
        "Referral for child behavior challenges",
        PARENT_STAGES,
        ["Behavior management", "Parental stress"],
    ),
    "sub-crisis-response": _workflow(
        "wf-crisis-response",
        "Crisis Response Workflow",
        "Rapid response for mental health crises with safety planning and stabilization.",
        "Crisis hotline or ER referral requiring immediate triage",
        PARENT_STAGES,
        ["Suicide/homicide risk", "Safety planning"],
    ),
    "sub-outpatient-counseling": _workflow(
        "wf-outpatient-counseling",
        "Outpatient Counseling Workflow",
        "Outpatient mental health case management from intake through treatment planning.",
        "Healthcare or self-referral for outpatient counseling",
        PARENT_STAGES,
        ["Clinical assessment", "Treatment planning"],
    ),
    "sub-peer-support": _workflow(
        "wf-peer-support",
        "Peer Support Workflow",
        "Peer-led recovery support with goal setting and community connection.",
        "Referral to certified peer support specialist program",
        PARENT_STAGES,
        ["Recovery goals", "Peer mentoring"],
    ),
    "sub-housing-assistance": _workflow(
        "wf-family-stability",
        "Family Stability Program Workflow",
        "Stabilize housing and basic needs for families facing financial hardship.",
        "Family request for assistance due to financial hardship",
        PARENT_STAGES,
        ["Housing stability", "Employment"],
    ),
    "sub-employment-support": _workflow(
        "wf-employment-support",
        "Employment Support Workflow",
        "Help clients secure and maintain employment through workforce development services.",
        "Community agency referral for job search and retention support",
        PARENT_STAGES,
        ["Job readiness", "Skills training"],
    ),
    "sub-general-intake": _workflow(
        "wf-general-intake",
        "Community Intake Workflow",
        "General community social services intake connecting clients to appropriate programs.",
        "Walk-in or partner agency referral for undetermined service needs",
        PARENT_STAGES,
        ["Eligibility screening", "Program routing"],
    ),
}

DEFAULT_WORKFLOW = _workflow(
    "wf-default",
    "Case Management Workflow",
    "Standard eight-stage case management process.",
    "Generic case management",
    SENIOR_STAGES,
    [],
)


def workflow_for_subcategory(subcategory_id: str) -> dict:
    return WORKFLOWS_BY_SUBCATEGORY.get(subcategory_id, DEFAULT_WORKFLOW)

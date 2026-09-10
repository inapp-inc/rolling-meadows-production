"""Risk assessment domains per subcategory family (mirrors caseFormService.js)."""

FAMILY_BY_SUBCATEGORY: dict[str, str] = {
    "sub-seniors-at-risk": "senior",
    "sub-in-home-support": "in_home",
    "sub-nutrition-programs": "nutrition",
    "sub-youth-empowerment": "parenting",
    "sub-family-resource": "parenting",
    "sub-parent-education": "parenting",
    "sub-housing-assistance": "parenting",
    "sub-crisis-response": "mental_health",
    "sub-outpatient-counseling": "mental_health",
    "sub-peer-support": "mental_health",
    "sub-employment-support": "employment",
    "sub-general-intake": "general",
}

DOMAINS_BY_FAMILY: dict[str, list[str]] = {
    "senior": ["falls", "nutrition", "isolation", "housing", "abuseRisk"],
    "in_home": ["adlSupport", "homeSafety", "caregiverSupport", "mobility", "medicationManagement"],
    "nutrition": ["foodAccess", "mealDelivery", "dietaryNeeds", "weightMonitoring", "socialDining"],
    "parenting": ["attendance", "transportation", "childcare", "familyStress", "schoolEngagement"],
    "mental_health": ["suicideRisk", "selfHarm", "substanceUse", "safetyPlan", "supportSystem"],
    "employment": ["jobReadiness", "skillsGap", "transportation", "childcare", "incomeStability"],
    "general": ["basicNeeds", "housing", "employment", "health", "supportNetwork"],
}

DOMAIN_LABELS: dict[str, str] = {
    "falls": "Fall risk",
    "nutrition": "Nutrition",
    "isolation": "Social isolation",
    "housing": "Housing stability",
    "abuseRisk": "Abuse / neglect risk",
    "adlSupport": "ADL support",
    "homeSafety": "Home safety",
    "caregiverSupport": "Caregiver support",
    "mobility": "Mobility",
    "medicationManagement": "Medication management",
    "foodAccess": "Food access",
    "mealDelivery": "Meal delivery",
    "dietaryNeeds": "Dietary needs",
    "weightMonitoring": "Weight monitoring",
    "socialDining": "Social dining",
    "attendance": "Attendance",
    "transportation": "Transportation",
    "childcare": "Childcare",
    "familyStress": "Family stress",
    "schoolEngagement": "School engagement",
    "suicideRisk": "Suicide risk",
    "selfHarm": "Self-harm",
    "substanceUse": "Substance use",
    "safetyPlan": "Safety plan",
    "supportSystem": "Support system",
    "jobReadiness": "Job readiness",
    "skillsGap": "Skills gap",
    "incomeStability": "Income stability",
    "basicNeeds": "Basic needs",
    "health": "Health",
    "supportNetwork": "Support network",
    "employment": "Employment",
}

PROGRAM_LABELS: dict[str, str] = {
    "prog-senior-services": "Senior Social Services",
    "prog-parenting-support": "Parenting Support Programs",
    "prog-mental-health": "Mental Health Services",
    "prog-community-services": "Community Social Services",
}


def family_for_subcategory(subcategory_id: str) -> str:
    return FAMILY_BY_SUBCATEGORY.get(subcategory_id, "general")


def domains_for_subcategory(subcategory_id: str) -> list[str]:
    family = family_for_subcategory(subcategory_id)
    return DOMAINS_BY_FAMILY.get(family, DOMAINS_BY_FAMILY["senior"])

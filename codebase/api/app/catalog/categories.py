"""Case category catalogue — mirrors Docs/ui/js/services/caseCategoryService.js"""

CATEGORIES = [
    {
        "id": "cat-senior-services",
        "label": "Senior Social Services",
        "programId": "prog-senior-services",
        "subcategories": [
            {"id": "sub-seniors-at-risk", "label": "Seniors at Risk"},
            {"id": "sub-in-home-support", "label": "In-Home Support"},
            {"id": "sub-nutrition-programs", "label": "Nutrition Programs"},
        ],
    },
    {
        "id": "cat-parenting-support",
        "label": "Parenting Support Programs",
        "programId": "prog-parenting-support",
        "subcategories": [
            {"id": "sub-youth-empowerment", "label": "Youth Empowerment Groups"},
            {"id": "sub-family-resource", "label": "Family Resource Center"},
            {"id": "sub-parent-education", "label": "Parent Education"},
        ],
    },
    {
        "id": "cat-mental-health",
        "label": "Mental Health Services",
        "programId": "prog-mental-health",
        "subcategories": [
            {"id": "sub-crisis-response", "label": "Crisis Response"},
            {"id": "sub-outpatient-counseling", "label": "Outpatient Counseling"},
            {"id": "sub-peer-support", "label": "Peer Support"},
        ],
    },
    {
        "id": "cat-community-services",
        "label": "Community Social Services",
        "programId": "prog-community-services",
        "subcategories": [
            {"id": "sub-housing-assistance", "label": "Housing Assistance"},
            {"id": "sub-employment-support", "label": "Employment Support"},
            {"id": "sub-general-intake", "label": "General Intake"},
        ],
    },
]

SUB_BY_ID: dict[str, dict] = {}
CAT_BY_ID: dict[str, dict] = {}

for cat in CATEGORIES:
    CAT_BY_ID[cat["id"]] = cat
    for sub in cat["subcategories"]:
        SUB_BY_ID[sub["id"]] = {"category": cat, "subcategory": sub}


def program_for_subcategory(subcategory_id: str) -> str:
    entry = SUB_BY_ID.get(subcategory_id)
    return entry["category"]["programId"] if entry else "prog-senior-services"

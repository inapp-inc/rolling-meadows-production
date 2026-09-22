from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.case import AssignmentHistory, Case

DEMO_CASE_MANAGER_ID = "usr-case-manager"
PROGRAM_ID = "prog-senior-services"
CASE_CATEGORY_ID = "cat-senior-services"
SUBCATEGORIES = ["sub-seniors-at-risk", "sub-in-home-support", "sub-nutrition-programs"]

# Mary Smith + senior caseload from Docs/ui/js/seed/seedData.js
DEMO_CASES = [
    {
        "id": "case-mary-smith-senior",
        "client_id": "cli-mary-smith",
        "case_subcategory_id": "sub-seniors-at-risk",
        "incomplete_intake": True,
        "current_stage": 1,
    },
    {"id": "case-john-davis", "client_id": "cli-john-davis"},
    {"id": "case-elena-rodriguez", "client_id": "cli-elena-rodriguez"},
    {"id": "case-robert-kim", "client_id": "cli-robert-kim"},
    {"id": "case-dorothy-williams", "client_id": "cli-dorothy-williams"},
    {"id": "case-frank-miller", "client_id": "cli-frank-miller"},
    {"id": "case-helen-chen", "client_id": "cli-helen-chen"},
    {"id": "case-george-patel", "client_id": "cli-george-patel"},
    {"id": "case-ruth-anderson", "client_id": "cli-ruth-anderson"},
    {"id": "case-james-wilson", "client_id": "cli-james-wilson"},
    {"id": "case-margaret-lee", "client_id": "cli-margaret-lee"},
    {"id": "case-william-brown", "client_id": "cli-william-brown"},
    {"id": "case-betty-taylor", "client_id": "cli-betty-taylor"},
]


async def seed_cases_if_empty(session: AsyncSession) -> None:
    year = date.today().year
    for index, seed in enumerate(DEMO_CASES):
        result = await session.execute(select(Case).where(Case.id == seed["id"]))
        if result.scalar_one_or_none():
            continue
        subcategory = seed.get("case_subcategory_id") or SUBCATEGORIES[index % len(SUBCATEGORIES)]
        incomplete = seed.get("incomplete_intake", False)
        stage = seed.get("current_stage", 3 + (index % 4))
        case_id = seed["id"]
        session.add(
            Case(
                id=case_id,
                tenant_id=settings.default_tenant_id,
                client_id=seed["client_id"],
                case_number=f"C-{year}-{index + 1:03d}",
                program_id=PROGRAM_ID,
                case_category_id=CASE_CATEGORY_ID,
                case_subcategory_id=subcategory,
                case_manager_id=DEMO_CASE_MANAGER_ID,
                status="active",
                incomplete_intake=incomplete,
                current_stage=stage,
                open_date=date.today(),
                created_by=DEMO_CASE_MANAGER_ID,
            )
        )
        await session.flush()
        session.add(
            AssignmentHistory(
                id=f"asg-{case_id}-initial",
                case_id=case_id,
                tenant_id=settings.default_tenant_id,
                case_manager_id=DEMO_CASE_MANAGER_ID,
                assigned_by=DEMO_CASE_MANAGER_ID,
                reason="Initial case assignment",
                assigned_at=datetime.now(timezone.utc),
                previous_case_manager_id=None,
            )
        )
    await session.commit()

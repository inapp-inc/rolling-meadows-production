from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.case import AssignmentHistory, Case


DEMO_CASE_ID = "case-mary-smith-senior"
DEMO_CASE_MANAGER_ID = "usr-case-manager"


async def seed_cases_if_empty(session: AsyncSession) -> None:
    result = await session.execute(select(Case).where(Case.id == DEMO_CASE_ID))
    if result.scalar_one_or_none():
        return

    session.add(
        Case(
            id=DEMO_CASE_ID,
            tenant_id=settings.default_tenant_id,
            client_id="cli-mary-smith",
            case_number=f"C-{date.today().year}-001",
            program_id="prog-senior-services",
            case_category_id="cat-senior-services",
            case_subcategory_id="sub-seniors-at-risk",
            case_manager_id=DEMO_CASE_MANAGER_ID,
            status="active",
            incomplete_intake=True,
            current_stage=1,
            open_date=date.today(),
            created_by=DEMO_CASE_MANAGER_ID,
        )
    )
    await session.flush()
    session.add(
        AssignmentHistory(
            id="asg-mary-smith-initial",
            case_id=DEMO_CASE_ID,
            tenant_id=settings.default_tenant_id,
            case_manager_id=DEMO_CASE_MANAGER_ID,
            assigned_by=DEMO_CASE_MANAGER_ID,
            reason="Initial case assignment",
            assigned_at=datetime.now(timezone.utc),
            previous_case_manager_id=None,
        )
    )
    await session.commit()

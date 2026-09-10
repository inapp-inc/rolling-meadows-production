from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog.categories import CATEGORIES
from app.catalog.events import EVENTS
from app.catalog.workflows import WORKFLOWS_BY_SUBCATEGORY
from app.models.catalog import (
    CaseCategory,
    CaseSubcategory,
    CatalogEvent,
    WorkflowDefinition,
    WorkflowStage,
)


async def seed_catalog_if_empty(session: AsyncSession) -> None:
    result = await session.execute(select(CaseCategory).limit(1))
    if result.scalar_one_or_none():
        return

    for cat_index, category in enumerate(CATEGORIES):
        session.add(
            CaseCategory(
                id=category["id"],
                label=category["label"],
                program_id=category["programId"],
                sort_order=cat_index,
            )
        )
        for sub_index, subcategory in enumerate(category["subcategories"]):
            session.add(
                CaseSubcategory(
                    id=subcategory["id"],
                    category_id=category["id"],
                    label=subcategory["label"],
                    sort_order=sub_index,
                )
            )

    for subcategory_id, workflow in WORKFLOWS_BY_SUBCATEGORY.items():
        session.add(
            WorkflowDefinition(
                id=workflow["id"],
                subcategory_id=subcategory_id,
                name=workflow["name"],
                description=workflow["description"],
                example_program=workflow["exampleProgram"],
                focus_areas=workflow.get("focusAreas", []),
            )
        )
        for stage in workflow["stages"]:
            session.add(
                WorkflowStage(
                    id=f"{workflow['id']}-stage-{stage['stage']}",
                    workflow_id=workflow["id"],
                    tab_id=stage["tabId"],
                    label=stage["label"],
                    deliverable=stage.get("deliverable", ""),
                    stage_number=stage["stage"],
                )
            )

    for event_index, event in enumerate(EVENTS):
        session.add(
            CatalogEvent(
                id=event["id"],
                label=event["label"],
                sort_order=event_index,
            )
        )

    await session.commit()

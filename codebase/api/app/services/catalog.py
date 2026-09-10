from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.catalog.workflows import DEFAULT_WORKFLOW
from app.models.catalog import CaseCategory, CatalogEvent, WorkflowDefinition


def workflow_to_response(workflow: dict) -> dict:
    return {
        "id": workflow["id"],
        "name": workflow["name"],
        "description": workflow["description"],
        "exampleProgram": workflow["exampleProgram"],
        "focusAreas": workflow.get("focusAreas", []),
        "stages": [
            {
                "tabId": stage["tabId"],
                "stage": stage["stage"],
                "label": stage["label"],
                "deliverable": stage.get("deliverable", ""),
            }
            for stage in workflow["stages"]
        ],
    }


def workflow_model_to_response(workflow: WorkflowDefinition) -> dict:
    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "exampleProgram": workflow.example_program,
        "focusAreas": workflow.focus_areas or [],
        "stages": [
            {
                "tabId": stage.tab_id,
                "stage": stage.stage_number,
                "label": stage.label,
                "deliverable": stage.deliverable or "",
            }
            for stage in workflow.stages
        ],
    }


async def list_case_categories(session: AsyncSession) -> list[dict]:
    result = await session.execute(
        select(CaseCategory).options(selectinload(CaseCategory.subcategories)).order_by(CaseCategory.sort_order)
    )
    categories = result.scalars().all()
    return [
        {
            "id": category.id,
            "label": category.label,
            "programId": category.program_id,
            "subcategories": [{"id": sub.id, "label": sub.label} for sub in category.subcategories],
        }
        for category in categories
    ]


async def get_workflow_for_subcategory(session: AsyncSession, subcategory_id: str) -> dict:
    result = await session.execute(
        select(WorkflowDefinition)
        .where(WorkflowDefinition.subcategory_id == subcategory_id)
        .options(selectinload(WorkflowDefinition.stages))
    )
    workflow = result.scalar_one_or_none()
    if workflow is None:
        return workflow_to_response(DEFAULT_WORKFLOW)
    return workflow_model_to_response(workflow)


async def list_catalog_events(session: AsyncSession) -> list[dict]:
    result = await session.execute(select(CatalogEvent).order_by(CatalogEvent.sort_order))
    return [{"id": event.id, "label": event.label} for event in result.scalars().all()]

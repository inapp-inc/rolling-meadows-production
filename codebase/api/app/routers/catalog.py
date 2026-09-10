from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services.catalog import get_workflow_for_subcategory, list_case_categories, list_catalog_events

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/case-categories", operation_id="listCaseCategories")
async def list_case_categories_route(session: Annotated[AsyncSession, Depends(get_session)]):
    categories = await list_case_categories(session)
    return {"categories": categories}


@router.get("/workflows/{subcategory_id}", operation_id="getWorkflowForSubcategory")
async def get_workflow_route(
    subcategory_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
):
    return await get_workflow_for_subcategory(session, subcategory_id)


@router.get("/events", operation_id="listEvents")
async def list_events_route(session: Annotated[AsyncSession, Depends(get_session)]):
    items = await list_catalog_events(session)
    return {"items": items}

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_doc
from app.db.session import get_session
from app.services.notifications import build_notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", operation_id="listNotifications")
async def list_notifications(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    items = await build_notifications(session, user)
    return {"items": items}

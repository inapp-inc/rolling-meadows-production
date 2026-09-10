from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_correlation_id
from app.db.session import get_session

router = APIRouter(tags=["health"])


@router.get("/health", operation_id="getHealth")
async def health(
    session: Annotated[AsyncSession, Depends(get_session)],
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
):
    database_ok = False
    try:
        await session.execute(text("SELECT 1"))
        database_ok = True
    except Exception:
        database_ok = False

    body = {
        "ok": database_ok,
        "service": "rolling-meadows-api",
        "database": "postgres",
        "databaseOk": database_ok,
        "modules": sorted(settings.enabled_modules),
    }
    if correlation_id:
        body["correlationId"] = correlation_id
    return body

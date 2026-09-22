from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_correlation_id, get_current_user_doc
from app.db.session import get_session
from app.services.phi_access import record_phi_access

router = APIRouter(prefix="/compliance", tags=["compliance"])


class PhiExportEventRequest(BaseModel):
    resourceType: Literal["report", "custom_report", "dashboard", "document", "caseload"]
    resourceId: str | None = Field(default=None, max_length=128)
    exportFormat: Literal["csv", "xlsx", "png", "pdf", "file", "link"]


@router.post("/phi-export", operation_id="recordPhiExport", status_code=204)
async def record_phi_export_event(
    body: PhiExportEventRequest,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    request: Request,
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
):
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        return None
    await record_phi_access(
        session,
        tenant_id=tenant_id,
        actor_id=user["_id"],
        action="export",
        resource_type=body.resourceType,
        resource_id=body.resourceId,
        detail={"exportFormat": body.exportFormat},
        request=request,
        correlation_id=correlation_id,
    )
    await session.commit()
    return None

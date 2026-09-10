import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_doc
from app.db.session import get_session
from app.models.case import ServiceEnrollment
from app.models.catalog import CatalogEvent
from app.services.case_access import assert_case_access
from app.services.case_store import audit, get_case

router = APIRouter(tags=["enrollments"])


class BulkEnrollPayload(BaseModel):
    caseIds: list[str] = Field(min_length=1)
    serviceOrEventId: str


@router.post("/enrollments/bulk", operation_id="bulkEnroll", status_code=status.HTTP_201_CREATED)
async def bulk_enroll(
    body: BulkEnrollPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)

    event_result = await session.execute(
        select(CatalogEvent).where(CatalogEvent.id == body.serviceOrEventId)
    )
    if not event_result.scalar_one_or_none():
        raise HTTPException(
            status_code=422,
            detail={"error": "validation", "message": "Unknown service or event"},
        )

    created = 0
    skipped = 0

    for case_id in body.caseIds:
        case = await get_case(session, case_id, user["tenant_id"])
        if user.get("role") == "case_manager" and case.get("case_manager_id") != user["_id"]:
            skipped += 1
            continue
        if case.get("status") == "closed":
            skipped += 1
            continue

        existing = await session.execute(
            select(ServiceEnrollment).where(
                ServiceEnrollment.case_id == case_id,
                ServiceEnrollment.service_or_event_id == body.serviceOrEventId,
                ServiceEnrollment.voided.is_(False),
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        session.add(
            ServiceEnrollment(
                id=f"enr-{uuid.uuid4().hex[:10]}",
                case_id=case_id,
                client_id=case["client_id"],
                tenant_id=user["tenant_id"],
                service_or_event_id=body.serviceOrEventId,
                date_enrolled=date.today(),
                status="active",
                enrolled_by=user["_id"],
            )
        )
        created += 1

    if created:
        await audit(
            session,
            user["tenant_id"],
            user["_id"],
            "bulk_enroll",
            body.serviceOrEventId,
            {"created": created, "skipped": skipped},
        )

    await session.commit()
    return {"created": created, "skipped": skipped}

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform import AdminAuditEntry


def _serialize_entry(entry: AdminAuditEntry) -> dict[str, Any]:
    return {
        "action": entry.action,
        "actorId": entry.actor_id,
        "timestamp": entry.timestamp.isoformat(),
        "resourceType": entry.resource_type,
        "resourceId": entry.resource_id,
        "detail": entry.detail or {},
    }


async def write_admin_audit(
    session: AsyncSession,
    *,
    action: str,
    actor_id: str,
    resource_type: str,
    resource_id: str | None = None,
    tenant_id: str | None = None,
    detail: dict | None = None,
) -> None:
    session.add(
        AdminAuditEntry(
            id=f"aud-{uuid.uuid4().hex[:12]}",
            tenant_id=tenant_id,
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail or {},
            timestamp=datetime.now(timezone.utc),
        )
    )


async def list_admin_audit(
    session: AsyncSession,
    *,
    tenant_id: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    query = select(AdminAuditEntry).order_by(AdminAuditEntry.timestamp.desc()).limit(limit)
    if tenant_id is not None:
        query = query.where(AdminAuditEntry.tenant_id == tenant_id)
    else:
        query = query.where(AdminAuditEntry.tenant_id.is_(None))
    result = await session.execute(query)
    return [_serialize_entry(entry) for entry in result.scalars().all()]

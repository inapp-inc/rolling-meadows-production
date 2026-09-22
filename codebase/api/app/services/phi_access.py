import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.phi_access import PhiAccessLogEntry


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    if request.client:
        return request.client.host[:64]
    return None


def _user_agent(request: Request | None) -> str | None:
    if request is None:
        return None
    ua = request.headers.get("user-agent")
    return ua[:512] if ua else None


async def record_phi_access(
    session: AsyncSession,
    *,
    tenant_id: str,
    actor_id: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    detail: dict | None = None,
    request: Request | None = None,
    correlation_id: str | None = None,
) -> None:
    """Record read/list/export of PHI-bearing resources (no PHI in detail payload)."""
    safe_detail: dict[str, Any] = {}
    if detail:
        for key, value in detail.items():
            if key in {"count", "hasQuery", "exportFormat", "tier", "caseCount"}:
                safe_detail[key] = value

    session.add(
        PhiAccessLogEntry(
            id=f"phi-{uuid.uuid4().hex[:16]}",
            tenant_id=tenant_id,
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=safe_detail,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
            correlation_id=correlation_id,
            timestamp=datetime.now(timezone.utc),
        )
    )


async def list_phi_access(
    session: AsyncSession,
    *,
    tenant_id: str,
    limit: int = 100,
) -> list[dict[str, Any]]:
    query = (
        select(PhiAccessLogEntry)
        .where(PhiAccessLogEntry.tenant_id == tenant_id)
        .order_by(PhiAccessLogEntry.timestamp.desc())
        .limit(min(limit, 500))
    )
    result = await session.execute(query)
    return [
        {
            "action": row.action,
            "actorId": row.actor_id,
            "timestamp": row.timestamp.isoformat(),
            "resourceType": row.resource_type,
            "resourceId": row.resource_id,
            "detail": row.detail or {},
            "ipAddress": row.ip_address,
            "correlationId": row.correlation_id,
        }
        for row in result.scalars().all()
    ]

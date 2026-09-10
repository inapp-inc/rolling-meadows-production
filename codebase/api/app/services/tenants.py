from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import Case
from app.models.tenant import Tenant
from app.models.user import User


def serialize_tenant(tenant: Tenant, metrics: dict[str, int] | None = None) -> dict[str, Any]:
    item = {
        "id": tenant.id,
        "legalName": tenant.legal_name,
        "shortCode": tenant.short_code,
        "status": tenant.status,
        "timezone": tenant.timezone,
        "defaultLocale": tenant.default_locale,
        "enabledLocales": tenant.enabled_locales or ["en", "es"],
        "branding": tenant.branding or {},
        "config": tenant.config or {},
        "provisionedAt": tenant.provisioned_at.isoformat() if tenant.provisioned_at else None,
        "activatedAt": tenant.activated_at.isoformat() if tenant.activated_at else None,
    }
    if metrics:
        item.update(metrics)
    return item


def serialize_tenant_config(tenant: Tenant) -> dict[str, Any]:
    return {
        "legalName": tenant.legal_name,
        "shortCode": tenant.short_code,
        "status": tenant.status,
        "timezone": tenant.timezone,
        "defaultLocale": tenant.default_locale,
        "enabledLocales": tenant.enabled_locales or ["en", "es"],
        "branding": tenant.branding or {},
        "config": tenant.config or {},
    }


async def tenant_metrics(session: AsyncSession, tenant_id: str) -> dict[str, int]:
    user_count = await session.execute(
        select(func.count()).select_from(User).where(User.tenant_id == tenant_id)
    )
    case_count = await session.execute(
        select(func.count()).select_from(Case).where(Case.tenant_id == tenant_id, Case.status == "active")
    )
    return {
        "userCount": user_count.scalar_one(),
        "activeCaseCount": case_count.scalar_one(),
    }


def tenant_id_from_short_code(short_code: str) -> str:
    slug = short_code.strip().lower().replace(" ", "-")
    return f"tenant-{slug}"

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.roles import ORGANIZATION_ADMIN, PLATFORM_ADMIN, TENANT_ADMIN
from app.models.tenant import Tenant
from app.models.user import User


async def load_tenant_summary(session: AsyncSession, tenant_id: str | None) -> dict | None:
    if not tenant_id:
        return None

    result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        return None

    branding = tenant.branding or {}
    return {
        "id": tenant.id,
        "legalName": tenant.legal_name,
        "shortCode": tenant.short_code,
        "status": tenant.status,
        "defaultLocale": tenant.default_locale,
        "enabledLocales": tenant.enabled_locales or ["en", "es"],
        "displayName": branding.get("display_name") or tenant.legal_name,
    }


async def resolve_user_for_login(
    session: AsyncSession,
    email: str,
    organization_code: str | None,
) -> User | None:
    email_lower = email.lower()
    result = await session.execute(
        select(User)
        .options(selectinload(User.tenant))
        .where(User.email == email_lower, User.status == "Active")
    )
    matches = list(result.scalars().all())
    if not matches:
        return None
    if len(matches) == 1:
        return matches[0]

    if not organization_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "organization_code_required",
                "message": "Organization code is required for this email",
            },
        )

    code = organization_code.strip().upper()
    for user in matches:
        if user.tenant and user.tenant.short_code.upper() == code:
            return user
    return None


async def assert_tenant_login_allowed(session: AsyncSession, user: User) -> None:
    if not user.tenant_id:
        return

    result = await session.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "tenant_not_found", "message": "Organization not found"},
        )

    if tenant.status == "Suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "tenant_suspended",
                "message": "This organization has been suspended. Contact your administrator.",
            },
        )
    if tenant.status == "Offboarded":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "tenant_offboarded", "message": "This organization is no longer active."},
        )
    if tenant.status == "Draft" and user.role not in {PLATFORM_ADMIN, TENANT_ADMIN, ORGANIZATION_ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "tenant_draft",
                "message": "This organization is not yet active. Contact your administrator.",
            },
        )


async def record_login(session: AsyncSession, user: User) -> None:
    user.last_login_at = datetime.now(UTC)
    session.add(user)
    await session.commit()


async def update_user_password(session: AsyncSession, user_id: str, password_hash: str) -> None:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return
    user.password_hash = password_hash
    session.add(user)
    await session.commit()

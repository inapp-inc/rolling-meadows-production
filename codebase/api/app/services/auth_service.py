from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.roles import ORGANIZATION_ADMIN, PLATFORM_ADMIN, TENANT_ADMIN
from app.models.tenant import Tenant
from app.models.user import User
from app.services.admin_audit import write_admin_audit
from app.services.branding import serialize_branding
from app.services.session_policy import get_max_failed_logins

PRODUCT_NAME = "Case Management Platform"

LOCKOUT_MINUTES = 30


async def load_tenant_summary(session: AsyncSession, tenant_id: str | None) -> dict | None:
    if not tenant_id:
        return None

    result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        return None

    branding = serialize_branding(tenant.branding, legal_name=tenant.legal_name)
    return {
        "id": tenant.id,
        "legalName": tenant.legal_name,
        "shortCode": tenant.short_code,
        "status": tenant.status,
        "defaultLocale": tenant.default_locale,
        "enabledLocales": tenant.enabled_locales or ["en", "es"],
        "displayName": branding["displayName"],
        "branding": branding,
    }


async def load_branding_by_email(session: AsyncSession, email: str) -> dict | None:
    """Public tenant branding when email maps to exactly one active organization user."""
    email_lower = email.strip().lower()
    if not email_lower or "@" not in email_lower:
        return None

    result = await session.execute(
        select(User).where(User.email == email_lower, User.status == "Active")
    )
    users = list(result.scalars().all())
    if len(users) != 1:
        return None

    user = users[0]
    if not user.tenant_id:
        return None

    tenant_result = await session.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant or tenant.status in {"Suspended", "Offboarded"}:
        return None

    branding = serialize_branding(tenant.branding, legal_name=tenant.legal_name)
    return {
        "legalName": tenant.legal_name,
        "shortCode": tenant.short_code,
        "status": tenant.status,
        "branding": branding,
    }


async def load_login_preview(session: AsyncSession, email: str) -> dict:
    """Login screen scope: platform product vs tenant organization branding."""
    email_lower = email.strip().lower()
    if not email_lower or "@" not in email_lower:
        return {"scope": "product", "productName": PRODUCT_NAME}

    result = await session.execute(
        select(User).where(User.email == email_lower, User.status == "Active")
    )
    users = list(result.scalars().all())
    if len(users) == 1 and users[0].role == PLATFORM_ADMIN and not users[0].tenant_id:
        return {"scope": "platform", "productName": PRODUCT_NAME}

    tenant_payload = await load_branding_by_email(session, email_lower)
    if tenant_payload:
        return {"scope": "tenant", **tenant_payload}

    return {"scope": "product", "productName": PRODUCT_NAME}


async def load_public_branding(session: AsyncSession, organization_code: str) -> dict | None:
    code = organization_code.strip().upper()
    if not code:
        return None

    result = await session.execute(select(Tenant).where(Tenant.short_code == code))
    tenant = result.scalar_one_or_none()
    if not tenant:
        return None

    branding = serialize_branding(tenant.branding, legal_name=tenant.legal_name)
    return {
        "organizationCode": tenant.short_code,
        "legalName": tenant.legal_name,
        "status": tenant.status,
        "branding": branding,
    }


async def find_active_users_by_email(session: AsyncSession, email: str) -> list[User]:
    email_lower = email.lower()
    result = await session.execute(
        select(User)
        .options(selectinload(User.tenant))
        .where(User.email == email_lower, User.status == "Active")
    )
    return list(result.scalars().all())


def assert_account_not_locked(user: User) -> None:
    if user.locked_until and user.locked_until > datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "account_locked",
                "message": "Account is temporarily locked after too many failed sign-in attempts. Try again later or contact your administrator.",
            },
        )


async def resolve_user_for_login(
    session: AsyncSession,
    email: str,
    password: str,
    *,
    verify_password_fn,
) -> User | None:
    """Resolve the user (and their organization) from email + password."""
    matches = await find_active_users_by_email(session, email)
    if not matches:
        return None

    for user in matches:
        assert_account_not_locked(user)

    verified = [user for user in matches if verify_password_fn(password, user.password_hash)]
    if not verified:
        return None
    if len(verified) == 1:
        return verified[0]

    # Same email/password in multiple organizations — refuse ambiguous login.
    return None


async def record_failed_login_attempt(
    session: AsyncSession,
    email: str,
    *,
    correlation_id: str | None = None,
) -> None:
    matches = await find_active_users_by_email(session, email)
    max_failed = await get_max_failed_logins(session)
    now = datetime.now(UTC)

    if matches:
        for user in matches:
            user.failed_login_count = (user.failed_login_count or 0) + 1
            if user.failed_login_count >= max_failed:
                user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            session.add(user)
            await write_admin_audit(
                session,
                action="login_failed",
                actor_id=user.id,
                resource_type="user",
                resource_id=user.id,
                tenant_id=user.tenant_id,
                detail={"reason": "invalid_password", "correlationId": correlation_id},
            )
    else:
        await write_admin_audit(
            session,
            action="login_failed",
            actor_id="anonymous",
            resource_type="user",
            resource_id=email.lower(),
            tenant_id=None,
            detail={"reason": "unknown_email", "correlationId": correlation_id},
        )
    await session.commit()


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


async def record_login(
    session: AsyncSession,
    user: User,
    *,
    correlation_id: str | None = None,
) -> None:
    user.last_login_at = datetime.now(UTC)
    user.failed_login_count = 0
    user.locked_until = None
    session.add(user)
    await write_admin_audit(
        session,
        action="login_success",
        actor_id=user.id,
        resource_type="user",
        resource_id=user.id,
        tenant_id=user.tenant_id,
        detail={"correlationId": correlation_id},
    )
    await session.commit()


async def update_user_password(
    session: AsyncSession,
    user_id: str,
    password_hash: str,
    *,
    plain_password: str,
) -> None:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return
    from app.services.password_rotation import apply_password_update

    await apply_password_update(session, user, password_hash, plain_password=plain_password)
    await session.commit()

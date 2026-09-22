from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.user import User
from app.services.session_policy import get_password_min_length

DEFAULT_PASSWORD_MAX_AGE_DAYS = 90
PASSWORD_HISTORY_LIMIT = 5


async def get_password_max_age_days(session: AsyncSession, tenant_id: str | None) -> int:
    from sqlalchemy import select
    from app.models.tenant import Tenant

    days = DEFAULT_PASSWORD_MAX_AGE_DAYS
    if tenant_id:
        result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if tenant and isinstance(tenant.config, dict):
            raw = tenant.config.get("password_max_age_days")
            if isinstance(raw, int) and 30 <= raw <= 365:
                days = raw
    return days


def password_rotation_status(user: User, max_age_days: int) -> dict[str, Any]:
    changed_at = user.password_changed_at or user.last_login_at
    must_change = False
    expires_at: datetime | None = None
    days_remaining: int | None = None

    if changed_at is None:
        must_change = True
    else:
        expires_at = changed_at + timedelta(days=max_age_days)
        now = datetime.now(UTC)
        if expires_at <= now:
            must_change = True
            days_remaining = 0
        else:
            days_remaining = max(0, (expires_at - now).days)

    return {
        "mustChange": must_change,
        "passwordChangedAt": changed_at.isoformat() if changed_at else None,
        "passwordExpiresAt": expires_at.isoformat() if expires_at else None,
        "daysRemaining": days_remaining,
        "maxAgeDays": max_age_days,
    }


def assert_password_not_reused(user: User, new_password_hash: str, plain_password: str) -> None:
    if verify_password(plain_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "password_reused", "message": "New password must differ from the current password."},
        )
    history = list(user.password_history or [])
    for old_hash in history:
        if verify_password(plain_password, old_hash):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": "password_reused",
                    "message": "New password cannot match a recently used password.",
                },
            )


def append_password_history(user: User, previous_hash: str) -> None:
    history = list(user.password_history or [])
    history.insert(0, previous_hash)
    user.password_history = history[:PASSWORD_HISTORY_LIMIT]


async def apply_password_update(
    session: AsyncSession,
    user: User,
    new_password_hash: str,
    *,
    plain_password: str,
) -> None:
    min_len = await get_password_min_length(session, user.tenant_id)
    from app.services.password_policy import validate_password

    validate_password(plain_password, min_length=min_len)
    assert_password_not_reused(user, new_password_hash, plain_password)
    append_password_history(user, user.password_hash)
    user.password_hash = new_password_hash
    user.password_changed_at = datetime.now(UTC)
    user.failed_login_count = 0
    user.locked_until = None
    session.add(user)

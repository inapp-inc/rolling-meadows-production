from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform import PlatformSettings
from app.models.tenant import Tenant

DEFAULT_SESSION_MINUTES = 30
DEFAULT_IDLE_MINUTES = 15
DEFAULT_PASSWORD_MIN_LENGTH = 12


async def _platform_settings(session: AsyncSession) -> PlatformSettings:
    result = await session.execute(select(PlatformSettings).where(PlatformSettings.id == "default"))
    row = result.scalar_one_or_none()
    if row:
        return row
    return PlatformSettings(id="default")


async def get_password_min_length(session: AsyncSession, tenant_id: str | None) -> int:
    platform = await _platform_settings(session)
    min_len = platform.default_password_min_length or DEFAULT_PASSWORD_MIN_LENGTH
    if tenant_id:
        result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if tenant and isinstance(tenant.config, dict):
            tenant_min = tenant.config.get("password_min_length")
            if isinstance(tenant_min, int) and tenant_min >= 8:
                min_len = max(min_len, tenant_min)
    return max(min_len, 12)


async def get_session_policy(session: AsyncSession, tenant_id: str | None) -> dict[str, int]:
    platform = await _platform_settings(session)
    absolute = platform.default_session_timeout_minutes or DEFAULT_SESSION_MINUTES
    idle = DEFAULT_IDLE_MINUTES

    if tenant_id:
        result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        if tenant and isinstance(tenant.config, dict):
            tenant_session = tenant.config.get("session_timeout_minutes")
            tenant_idle = tenant.config.get("idle_timeout_minutes")
            if isinstance(tenant_session, int) and 5 <= tenant_session <= 720:
                absolute = tenant_session
            if isinstance(tenant_idle, int) and 5 <= tenant_idle <= absolute:
                idle = tenant_idle

    absolute = max(5, min(absolute, 720))
    idle = max(5, min(idle, absolute))
    return {
        "absoluteTimeoutMinutes": absolute,
        "idleTimeoutMinutes": idle,
    }


async def get_max_failed_logins(session: AsyncSession) -> int:
    platform = await _platform_settings(session)
    value = platform.max_failed_logins or 5
    return max(3, min(int(value), 20))

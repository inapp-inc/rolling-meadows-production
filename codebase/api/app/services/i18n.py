"""Shared i18n helpers for auth (public) and platform (admin) routes."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.i18n import TranslationLocale
from app.models.tenant import Tenant
from app.services.translations import get_translation_bundle

DEFAULT_LOCALES = [
    {"code": "en", "name": "English", "rtl": False, "active": True},
    {"code": "es", "name": "Español", "rtl": False, "active": True},
]


async def list_active_locales(organization_code: str | None = None) -> dict:
    async with async_session_factory() as session:
        result = await session.execute(
            select(TranslationLocale)
            .where(TranslationLocale.active.is_(True))
            .order_by(TranslationLocale.code)
        )
        platform_locales = result.scalars().all()
        if not platform_locales:
            items = [
                {"code": loc["code"], "name": loc["name"], "rtl": loc["rtl"]}
                for loc in DEFAULT_LOCALES
            ]
            default_locale = "en"
        else:
            items = [
                {"code": loc.code, "name": loc.name, "rtl": loc.rtl}
                for loc in platform_locales
            ]
            default_locale = "en"

        if organization_code:
            code = organization_code.strip().upper()
            tenant_result = await session.execute(
                select(Tenant).where(func.upper(Tenant.short_code) == code)
            )
            tenant = tenant_result.scalar_one_or_none()
            if tenant:
                enabled = set(tenant.enabled_locales or ["en", "es"])
                default_locale = tenant.default_locale
                items = [item for item in items if item["code"] in enabled]

        return {"defaultLocale": default_locale, "items": items}


async def get_platform_translation_bundle(locale: str) -> dict:
    locale = locale.strip().lower()
    async with async_session_factory() as session:
        entries = await get_translation_bundle(session, locale, tenant_id=None)
        return {"locale": locale, "entries": entries}

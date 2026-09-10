import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import require_roles
from app.core.roles import PLATFORM_ADMIN, TENANT_ADMIN
from app.core.security import hash_password
from app.db.session import get_session
from app.models.platform import PlatformSettings
from app.models.tenant import Tenant
from app.models.user import User
from app.services.admin_audit import list_admin_audit, write_admin_audit
from app.services.i18n import get_platform_translation_bundle
from app.services.tenants import (
    serialize_tenant,
    tenant_id_from_short_code,
    tenant_metrics,
)
from app.services.translations import (
    delete_locale,
    export_translations_xlsx,
    import_translations_xlsx,
    list_all_locales,
    list_translation_items,
    register_locale,
    update_locale,
    upsert_translation,
)
router = APIRouter(prefix="/platform", tags=["platform"])


class TenantCreateRequest(BaseModel):
    legalName: str = Field(min_length=2, max_length=200)
    shortCode: str = Field(min_length=2, max_length=16)
    timezone: str = "America/Chicago"
    defaultLocale: str = "en"
    adminEmail: EmailStr
    adminName: str = Field(min_length=2, max_length=120)


class TenantUpdateRequest(BaseModel):
    legalName: str | None = None
    timezone: str | None = None
    defaultLocale: str | None = None
    enabledLocales: list[str] | None = None


class PlatformSettingsUpdate(BaseModel):
    defaultPasswordMinLength: int | None = None
    defaultSessionTimeoutMinutes: int | None = None
    maxFailedLogins: int | None = None


class LocaleCreateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=8)
    name: str = Field(min_length=2, max_length=80)
    rtl: bool = False


class LocaleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    rtl: bool | None = None
    active: bool | None = None


class TranslationPatchRequest(BaseModel):
    locale: str
    key: str
    value: str
    namespace: str | None = None


async def _get_tenant_row(session: AsyncSession, tenant_id: str) -> Tenant:
    result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Tenant not found"})
    return tenant


async def _get_platform_settings_row(session: AsyncSession) -> PlatformSettings:
    result = await session.execute(select(PlatformSettings).where(PlatformSettings.id == "default"))
    row = result.scalar_one_or_none()
    if not row:
        row = PlatformSettings(id="default")
        session.add(row)
        await session.flush()
    return row


@router.get("/tenants", operation_id="listTenants")
async def list_tenants(
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    result = await session.execute(select(Tenant).order_by(Tenant.legal_name))
    tenants = result.scalars().all()
    items = []
    for tenant in tenants:
        metrics = await tenant_metrics(session, tenant.id)
        items.append(serialize_tenant(tenant, metrics))
    return {"items": items}


@router.post("/tenants", operation_id="createTenant", status_code=201)
async def create_tenant(
    body: TenantCreateRequest,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    short_code = body.shortCode.strip().upper()
    tenant_id = tenant_id_from_short_code(short_code)

    existing = await session.execute(
        select(Tenant).where((Tenant.id == tenant_id) | (Tenant.short_code == short_code))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={"error": "tenant_exists", "message": "A tenant with this code already exists"},
        )

    now = datetime.now(timezone.utc)
    tenant = Tenant(
        id=tenant_id,
        legal_name=body.legalName.strip(),
        short_code=short_code,
        status="Draft",
        timezone=body.timezone,
        default_locale=body.defaultLocale,
        enabled_locales=list(dict.fromkeys([body.defaultLocale, "en", "es"])),
        branding={"display_name": body.legalName.strip()},
        config={
            "duplicate_threshold": 25,
            "follow_up_cadence": {"High": 14, "Medium": 30, "Low": 90},
            "retention_years": 7,
            "support_access_policy": "per_session",
        },
        provisioned_at=now,
    )
    session.add(tenant)

    admin_id = f"usr-{uuid.uuid4().hex[:12]}"
    session.add(
        User(
            id=admin_id,
            email=body.adminEmail.lower(),
            name=body.adminName.strip(),
            role=TENANT_ADMIN,
            tenant_id=tenant_id,
            program_id=None,
            status="Active",
            password_hash=hash_password(settings.seed_user_password),
        )
    )

    await write_admin_audit(
        session,
        action="tenant.create",
        actor_id=user["_id"],
        tenant_id=None,
        resource_type="tenant",
        resource_id=tenant_id,
        detail={"legalName": body.legalName, "shortCode": short_code},
    )
    await session.commit()
    await session.refresh(tenant)
    metrics = await tenant_metrics(session, tenant.id)
    return serialize_tenant(tenant, metrics)


@router.get("/tenants/{tenant_id}", operation_id="getTenant")
async def get_tenant(
    tenant_id: str,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant = await _get_tenant_row(session, tenant_id)
    metrics = await tenant_metrics(session, tenant_id)
    return serialize_tenant(tenant, metrics)


@router.patch("/tenants/{tenant_id}", operation_id="updateTenant")
async def update_tenant(
    tenant_id: str,
    body: TenantUpdateRequest,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant = await _get_tenant_row(session, tenant_id)
    updates: dict[str, Any] = {}

    if body.legalName is not None:
        tenant.legal_name = body.legalName.strip()
        updates["legal_name"] = tenant.legal_name
    if body.timezone is not None:
        tenant.timezone = body.timezone
        updates["timezone"] = tenant.timezone
    if body.defaultLocale is not None:
        tenant.default_locale = body.defaultLocale
        updates["default_locale"] = tenant.default_locale
    if body.enabledLocales is not None:
        tenant.enabled_locales = body.enabledLocales
        updates["enabled_locales"] = tenant.enabled_locales

    if updates:
        await write_admin_audit(
            session,
            action="tenant.update",
            actor_id=user["_id"],
            tenant_id=None,
            resource_type="tenant",
            resource_id=tenant_id,
            detail=updates,
        )
        await session.commit()
        await session.refresh(tenant)

    metrics = await tenant_metrics(session, tenant_id)
    return serialize_tenant(tenant, metrics)


@router.get("/tenants/{tenant_id}/readiness", operation_id="tenantReadiness")
async def tenant_readiness(
    tenant_id: str,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant = await _get_tenant_row(session, tenant_id)
    admin_count = await session.execute(
        select(func.count())
        .select_from(User)
        .where(User.tenant_id == tenant_id, User.role == TENANT_ADMIN, User.status == "Active")
    )
    checks = [
        {
            "id": "tenant_admin",
            "label": "Tenant administrator assigned",
            "passed": admin_count.scalar_one() >= 1,
        },
        {"id": "legal_name", "label": "Legal name configured", "passed": bool(tenant.legal_name)},
        {"id": "short_code", "label": "Organization code configured", "passed": bool(tenant.short_code)},
    ]
    return {"ready": all(check["passed"] for check in checks), "checks": checks}


@router.post("/tenants/{tenant_id}/activate", operation_id="activateTenant")
async def activate_tenant(
    tenant_id: str,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    readiness = await tenant_readiness(tenant_id, user, session)
    if not readiness["ready"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "not_ready",
                "message": "Tenant readiness checks failed",
                "checks": readiness["checks"],
            },
        )

    tenant = await _get_tenant_row(session, tenant_id)
    tenant.status = "Active"
    tenant.activated_at = datetime.now(timezone.utc)
    await write_admin_audit(
        session,
        action="tenant.activate",
        actor_id=user["_id"],
        tenant_id=None,
        resource_type="tenant",
        resource_id=tenant_id,
    )
    await session.commit()
    await session.refresh(tenant)
    metrics = await tenant_metrics(session, tenant_id)
    return serialize_tenant(tenant, metrics)


@router.post("/tenants/{tenant_id}/suspend", operation_id="suspendTenant")
async def suspend_tenant(
    tenant_id: str,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant = await _get_tenant_row(session, tenant_id)
    tenant.status = "Suspended"
    await write_admin_audit(
        session,
        action="tenant.suspend",
        actor_id=user["_id"],
        tenant_id=None,
        resource_type="tenant",
        resource_id=tenant_id,
    )
    await session.commit()
    await session.refresh(tenant)
    metrics = await tenant_metrics(session, tenant_id)
    return serialize_tenant(tenant, metrics)


@router.get("/settings", operation_id="getPlatformSettings")
async def get_platform_settings(
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    row = await _get_platform_settings_row(session)
    return {
        "defaultPasswordMinLength": row.default_password_min_length,
        "defaultSessionTimeoutMinutes": row.default_session_timeout_minutes,
        "maxFailedLogins": row.max_failed_logins,
    }


@router.patch("/settings", operation_id="updatePlatformSettings")
async def update_platform_settings(
    body: PlatformSettingsUpdate,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    row = await _get_platform_settings_row(session)
    updates: dict[str, Any] = {}
    if body.defaultPasswordMinLength is not None:
        row.default_password_min_length = body.defaultPasswordMinLength
        updates["default_password_min_length"] = body.defaultPasswordMinLength
    if body.defaultSessionTimeoutMinutes is not None:
        row.default_session_timeout_minutes = body.defaultSessionTimeoutMinutes
        updates["default_session_timeout_minutes"] = body.defaultSessionTimeoutMinutes
    if body.maxFailedLogins is not None:
        row.max_failed_logins = body.maxFailedLogins
        updates["max_failed_logins"] = body.maxFailedLogins

    if updates:
        await write_admin_audit(
            session,
            action="platform.settings.update",
            actor_id=user["_id"],
            tenant_id=None,
            resource_type="platform_settings",
            resource_id="default",
            detail=updates,
        )
        await session.commit()

    return await get_platform_settings(user, session)


@router.get("/locales", operation_id="listLocales")
async def list_locales(
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    locales = await list_all_locales(session)
    return {
        "items": [
            {"code": loc.code, "name": loc.name, "rtl": loc.rtl, "active": loc.active}
            for loc in locales
        ]
    }


@router.post("/locales", operation_id="createLocale", status_code=201)
async def create_locale(
    body: LocaleCreateRequest,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    locale = await register_locale(session, code=body.code, name=body.name, rtl=body.rtl)
    await write_admin_audit(
        session,
        action="locale.create",
        actor_id=user["_id"],
        tenant_id=None,
        resource_type="locale",
        resource_id=locale.code,
    )
    await session.commit()
    return {"code": locale.code, "name": locale.name, "rtl": locale.rtl, "active": True}


@router.patch("/locales/{code}", operation_id="updateLocale")
async def update_platform_locale(
    code: str,
    body: LocaleUpdateRequest,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    locale = await update_locale(
        session,
        code=code,
        name=body.name,
        rtl=body.rtl,
        active=body.active,
    )
    await write_admin_audit(
        session,
        action="locale.update",
        actor_id=user["_id"],
        tenant_id=None,
        resource_type="locale",
        resource_id=locale.code,
    )
    await session.commit()
    return {"code": locale.code, "name": locale.name, "rtl": locale.rtl, "active": locale.active}


@router.delete("/locales/{code}", operation_id="deleteLocale", status_code=204)
async def delete_platform_locale(
    code: str,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    await delete_locale(session, code)
    await write_admin_audit(
        session,
        action="locale.delete",
        actor_id=user["_id"],
        tenant_id=None,
        resource_type="locale",
        resource_id=code.strip().lower(),
    )
    await session.commit()
    return None


@router.get("/translations", operation_id="listTranslations")
async def list_translations(
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
    locale: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    return await list_translation_items(
        session, tenant_id=None, locale=locale, q=q, limit=limit, offset=offset
    )


@router.patch("/translations", operation_id="patchTranslation")
async def patch_translation(
    body: TranslationPatchRequest,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    await upsert_translation(
        session,
        tenant_id=None,
        locale=body.locale,
        key=body.key,
        value=body.value,
        namespace=body.namespace,
        actor_id=user["_id"],
    )
    await write_admin_audit(
        session,
        action="translation.update",
        actor_id=user["_id"],
        tenant_id=None,
        resource_type="translation",
        resource_id=f"{body.locale}:{body.key}",
    )
    await session.commit()
    return {"ok": True}


@router.get("/translations/export", operation_id="exportTranslations")
async def export_translations(
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    return await export_translations_xlsx(
        session,
        tenant_id=None,
        filename="translations-export.xlsx",
    )


@router.post("/translations/import", operation_id="importTranslations")
async def import_translations(
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: UploadFile = File(...),
):
    content = await file.read()
    imported = await import_translations_xlsx(
        session,
        tenant_id=None,
        content=content,
        actor_id=user["_id"],
    )
    await write_admin_audit(
        session,
        action="translation.import",
        actor_id=user["_id"],
        tenant_id=None,
        resource_type="translation",
        resource_id="bulk",
        detail={"imported": imported},
    )
    await session.commit()
    return {"imported": imported}


@router.get("/translations/bundle/{locale}", operation_id="getTranslationBundle")
async def get_translation_bundle(locale: str):
    return await get_platform_translation_bundle(locale)

import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_doc, require_roles
from app.core.roles import (
    ORGANIZATION_ADMIN,
    PLATFORM_ADMIN,
    TENANT_ADMIN,
    TENANT_ADMIN_ROLES,
    assignable_roles_for,
    can_manage_user,
    OPERATIONAL_ROLES,
)
from app.core.security import hash_password
from app.services.password_policy import validate_password
from app.services.phi_access import list_phi_access
from app.services.session_policy import get_password_min_length
from app.db.session import get_session
from app.models.case import Case
from app.models.tenant import Tenant
from app.models.user import User
from app.core.config import settings
from app.services.admin_audit import list_admin_audit, write_admin_audit
from app.services.branding import merge_branding, save_tenant_logo
from app.services.tenants import serialize_tenant_config
from app.services.translations import (
    delete_locale,
    export_translations_xlsx,
    get_translation_bundle,
    import_translations_xlsx,
    list_all_locales,
    list_override_items,
    list_translation_items,
    register_locale,
    update_locale,
    upsert_translation,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class UserCreateRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=120)
    role: str
    password: str = Field(min_length=8, max_length=128)
    programId: str | None = None


class UserUpdateRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    programId: str | None = None
    status: str | None = None


class TenantConfigUpdateRequest(BaseModel):
    branding: dict[str, str] | None = None
    defaultLocale: str | None = None
    enabledLocales: list[str] | None = None
    duplicateThreshold: int | None = None
    followUpCadence: dict[str, int] | None = None
    retentionYears: int | None = None
    supportAccessPolicy: str | None = None
    sessionTimeoutMinutes: int | None = None
    idleTimeoutMinutes: int | None = None
    passwordMinLength: int | None = None
    passwordMaxAgeDays: int | None = None


class TranslationOverridePatchRequest(BaseModel):
    locale: str
    key: str
    value: str


class TranslationPatchRequest(BaseModel):
    locale: str
    key: str
    value: str
    namespace: str | None = None


class LocaleCreateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=8)
    name: str = Field(min_length=2, max_length=80)
    rtl: bool = False


class LocaleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    rtl: bool | None = None
    active: bool | None = None


def _serialize_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "tenantId": user.tenant_id,
        "programId": user.program_id,
        "status": user.status,
        "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
    }


async def _get_tenant_for_admin(session: AsyncSession, tenant_id: str) -> Tenant:
    result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Tenant not found"})
    return tenant


@router.get("/dashboard", operation_id="adminDashboard")
async def admin_dashboard(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant_id = user["tenant_id"]
    user_count = await session.execute(
        select(func.count()).select_from(User).where(User.tenant_id == tenant_id)
    )
    open_case_count = await session.execute(
        select(func.count()).select_from(Case).where(Case.tenant_id == tenant_id, Case.status == "active")
    )
    recent_audit = await list_admin_audit(session, tenant_id=tenant_id, limit=10)
    return {
        "userCount": user_count.scalar_one(),
        "openCaseCount": open_case_count.scalar_one(),
        "recentAudit": recent_audit,
    }


@router.get("/users", operation_id="listAdminUsers")
async def list_users(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden", "message": "Organization context is required"},
        )
    filters = [User.tenant_id == tenant_id, User.role != PLATFORM_ADMIN]
    if user["role"] == ORGANIZATION_ADMIN:
        filters.extend(
            [
                User.created_by == user["_id"],
                User.role.in_(tuple(OPERATIONAL_ROLES)),
            ]
        )
    elif user["role"] == TENANT_ADMIN:
        filters.append(User.role != TENANT_ADMIN)
    result = await session.execute(select(User).where(*filters).order_by(User.name))
    users = result.scalars().all()
    return {"items": [_serialize_user(u) for u in users]}


@router.post("/users", operation_id="createAdminUser", status_code=201)
async def create_user(
    body: UserCreateRequest,
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    allowed_roles = assignable_roles_for(user["role"])
    if body.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_role", "message": "Role is not assignable by your administrator role"},
        )

    tenant_id = user["tenant_id"]
    if not tenant_id:
        raise HTTPException(
            status_code=403,
            detail={"error": "forbidden", "message": "Organization context is required"},
        )
    email = body.email.lower()
    existing = await session.execute(
        select(User).where(User.email == email, User.tenant_id == tenant_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"error": "user_exists", "message": "User already exists"})

    cross_tenant = await session.execute(
        select(User).where(
            User.email == email,
            User.tenant_id.isnot(None),
            User.tenant_id != tenant_id,
        )
    )
    if cross_tenant.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={
                "error": "email_in_use",
                "message": "This email is already registered to another organization",
            },
        )

    min_len = await get_password_min_length(session, tenant_id)
    validate_password(body.password, min_length=min_len)

    user_id = f"usr-{uuid.uuid4().hex[:12]}"
    new_user = User(
        id=user_id,
        email=email,
        name=body.name.strip(),
        role=body.role,
        tenant_id=tenant_id,
        program_id=body.programId,
        status="Active",
        password_hash=hash_password(body.password),
        created_by=user["_id"],
        password_changed_at=datetime.now(timezone.utc),
    )
    session.add(new_user)
    await write_admin_audit(
        session,
        action="user.create",
        actor_id=user["_id"],
        tenant_id=tenant_id,
        resource_type="user",
        resource_id=user_id,
        detail={"email": email, "role": body.role},
    )
    await session.commit()
    await session.refresh(new_user)
    return _serialize_user(new_user)


@router.patch("/users/{user_id}", operation_id="updateAdminUser")
async def update_user(
    user_id: str,
    body: UserUpdateRequest,
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant_id = user["tenant_id"]
    result = await session.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "User not found"})

    if not can_manage_user(user["role"], target.role):
        raise HTTPException(
            status_code=403,
            detail={"error": "protected_role", "message": "You cannot modify this user"},
        )

    allowed_roles = assignable_roles_for(user["role"])
    if body.role is not None and body.role not in allowed_roles:
        raise HTTPException(status_code=400, detail={"error": "invalid_role", "message": "Invalid role"})

    if body.status == "Inactive":
        open_cases = await session.execute(
            select(func.count()).select_from(Case).where(
                Case.tenant_id == tenant_id,
                Case.case_manager_id == user_id,
                Case.status == "active",
            )
        )
        if open_cases.scalar_one() > 0:
            raise HTTPException(
                status_code=400,
                detail={"error": "open_cases", "message": "User has open owned cases"},
            )

    if body.name is not None:
        target.name = body.name.strip()
    if body.role is not None:
        target.role = body.role
    if body.programId is not None:
        target.program_id = body.programId
    if body.status is not None:
        target.status = body.status

    await write_admin_audit(
        session,
        action="user.update",
        actor_id=user["_id"],
        tenant_id=tenant_id,
        resource_type="user",
        resource_id=user_id,
    )
    await session.commit()
    await session.refresh(target)
    return _serialize_user(target)


@router.delete("/users/{user_id}", operation_id="deleteAdminUser", status_code=204)
async def delete_user(
    user_id: str,
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user_id == user["_id"]:
        raise HTTPException(
            status_code=400,
            detail={"error": "self_delete", "message": "You cannot delete your own account"},
        )

    tenant_id = user["tenant_id"]
    result = await session.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "User not found"})

    if not can_manage_user(user["role"], target.role):
        raise HTTPException(
            status_code=403,
            detail={"error": "protected_role", "message": "You cannot delete this user"},
        )

    await write_admin_audit(
        session,
        action="user.delete",
        actor_id=user["_id"],
        tenant_id=tenant_id,
        resource_type="user",
        resource_id=user_id,
    )
    await session.delete(target)
    await session.commit()
    return None


@router.post("/branding/logo", operation_id="uploadTenantBrandingLogo")
async def upload_tenant_branding_logo(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: UploadFile = File(...),
):
    tenant = await _get_tenant_for_admin(session, user["tenant_id"])
    logo_url = await save_tenant_logo(settings.branding_dir, tenant.id, file)
    tenant.branding = merge_branding(tenant.branding, {"logo_url": logo_url}, legal_name=tenant.legal_name)
    session.add(tenant)
    await write_admin_audit(
        session,
        action="tenant.branding.logo",
        actor_id=user["_id"],
        tenant_id=tenant.id,
        resource_type="tenant",
        resource_id=tenant.id,
    )
    await session.commit()
    return {"logoUrl": logo_url}


@router.get("/config", operation_id="getTenantConfig")
async def get_tenant_config(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant = await _get_tenant_for_admin(session, user["tenant_id"])
    return serialize_tenant_config(tenant)


@router.patch("/config", operation_id="updateTenantConfig")
async def update_tenant_config(
    body: TenantConfigUpdateRequest,
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    tenant = await _get_tenant_for_admin(session, user["tenant_id"])
    detail: dict[str, Any] = {}

    if body.branding is not None:
        tenant.branding = merge_branding(tenant.branding, body.branding, legal_name=tenant.legal_name)
        detail["branding"] = body.branding
    if body.defaultLocale is not None:
        tenant.default_locale = body.defaultLocale
        detail["defaultLocale"] = body.defaultLocale
    if body.enabledLocales is not None:
        tenant.enabled_locales = body.enabledLocales
        detail["enabledLocales"] = body.enabledLocales

    config = dict(tenant.config or {})
    if body.duplicateThreshold is not None:
        config["duplicate_threshold"] = body.duplicateThreshold
        detail["duplicateThreshold"] = body.duplicateThreshold
    if body.followUpCadence is not None:
        config["follow_up_cadence"] = body.followUpCadence
        detail["followUpCadence"] = body.followUpCadence
    if body.retentionYears is not None:
        config["retention_years"] = body.retentionYears
        detail["retentionYears"] = body.retentionYears
    if body.supportAccessPolicy is not None:
        config["support_access_policy"] = body.supportAccessPolicy
        detail["supportAccessPolicy"] = body.supportAccessPolicy
    if body.sessionTimeoutMinutes is not None:
        config["session_timeout_minutes"] = body.sessionTimeoutMinutes
        detail["sessionTimeoutMinutes"] = body.sessionTimeoutMinutes
    if body.idleTimeoutMinutes is not None:
        config["idle_timeout_minutes"] = body.idleTimeoutMinutes
        detail["idleTimeoutMinutes"] = body.idleTimeoutMinutes
    if body.passwordMinLength is not None:
        config["password_min_length"] = body.passwordMinLength
        detail["passwordMinLength"] = body.passwordMinLength
    if body.passwordMaxAgeDays is not None:
        config["password_max_age_days"] = body.passwordMaxAgeDays
        detail["passwordMaxAgeDays"] = body.passwordMaxAgeDays
    tenant.config = config

    await write_admin_audit(
        session,
        action="tenant.config.update",
        actor_id=user["_id"],
        tenant_id=tenant.id,
        resource_type="tenant",
        resource_id=tenant.id,
        detail=detail,
    )
    await session.commit()
    await session.refresh(tenant)
    return serialize_tenant_config(tenant)


@router.get("/translations", operation_id="listAdminTranslations")
async def list_admin_translations(
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
    locale: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    return await list_translation_items(
        session,
        tenant_id=None,
        locale=locale,
        q=q,
        limit=limit,
        offset=offset,
    )


@router.get("/locales", operation_id="listAdminLocales")
async def list_admin_locales(
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


@router.post("/locales", operation_id="createAdminLocale", status_code=201)
async def create_admin_locale(
    body: LocaleCreateRequest,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    locale = await register_locale(session, code=body.code, name=body.name, rtl=body.rtl)
    await write_admin_audit(
        session,
        action="locale.create",
        actor_id=user["_id"],
        tenant_id=user["tenant_id"],
        resource_type="locale",
        resource_id=locale.code,
    )
    await session.commit()
    return {"code": locale.code, "name": locale.name, "rtl": locale.rtl, "active": True}


@router.patch("/locales/{code}", operation_id="updateAdminLocale")
async def update_admin_locale(
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
        tenant_id=user["tenant_id"],
        resource_type="locale",
        resource_id=locale.code,
    )
    await session.commit()
    return {"code": locale.code, "name": locale.name, "rtl": locale.rtl, "active": locale.active}


@router.delete("/locales/{code}", operation_id="deleteAdminLocale", status_code=204)
async def delete_admin_locale(
    code: str,
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    await delete_locale(session, code)
    await write_admin_audit(
        session,
        action="locale.delete",
        actor_id=user["_id"],
        tenant_id=user["tenant_id"],
        resource_type="locale",
        resource_id=code.strip().lower(),
    )
    await session.commit()
    return None


@router.patch("/translations", operation_id="patchAdminTranslation")
async def patch_admin_translation(
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
        tenant_id=user["tenant_id"],
        resource_type="translation",
        resource_id=f"{body.locale}:{body.key}",
    )
    await session.commit()
    return {"ok": True}


@router.get("/translations/export", operation_id="exportAdminTranslations")
async def export_admin_translations(
    user: Annotated[dict, Depends(require_roles(PLATFORM_ADMIN))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    return await export_translations_xlsx(
        session,
        tenant_id=None,
        filename="labels-export.xlsx",
    )


@router.post("/translations/import", operation_id="importAdminTranslations")
async def import_admin_translations(
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
        tenant_id=user["tenant_id"],
        resource_type="translation",
        resource_id="bulk",
        detail={"imported": imported},
    )
    await session.commit()
    return {"imported": imported}


@router.get("/translations/overrides", operation_id="listTranslationOverrides")
async def list_translation_overrides(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
    locale: str | None = None,
):
    return await list_override_items(session, user["tenant_id"], locale)


@router.patch("/translations/overrides", operation_id="patchTranslationOverride")
async def patch_translation_override(
    body: TranslationOverridePatchRequest,
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    await upsert_translation(
        session,
        tenant_id=user["tenant_id"],
        locale=body.locale,
        key=body.key,
        value=body.value,
        actor_id=user["_id"],
    )
    await write_admin_audit(
        session,
        action="translation.override.update",
        actor_id=user["_id"],
        tenant_id=user["tenant_id"],
        resource_type="translation",
        resource_id=f"{body.locale}:{body.key}",
    )
    await session.commit()
    return {"ok": True}


@router.get("/translations/overrides/export", operation_id="exportTranslationOverrides")
async def export_translation_overrides(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    return await export_translations_xlsx(
        session,
        tenant_id=user["tenant_id"],
        filename="tenant-labels-export.xlsx",
    )


@router.post("/translations/overrides/import", operation_id="importTranslationOverrides")
async def import_translation_overrides(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: UploadFile = File(...),
):
    content = await file.read()
    imported = await import_translations_xlsx(
        session,
        tenant_id=user["tenant_id"],
        content=content,
        actor_id=user["_id"],
    )
    await write_admin_audit(
        session,
        action="translation.override.import",
        actor_id=user["_id"],
        tenant_id=user["tenant_id"],
        resource_type="translation",
        resource_id="bulk",
        detail={"imported": imported},
    )
    await session.commit()
    return {"imported": imported}


@router.get("/translations/bundle/{locale}", operation_id="getTenantTranslationBundle")
async def get_tenant_translation_bundle(
    locale: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if not user.get("tenant_id"):
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Tenant context required"})
    entries = await get_translation_bundle(session, locale, tenant_id=user["tenant_id"])
    return {"locale": locale.strip().lower(), "entries": entries}


@router.get("/audit-log", operation_id="getAdminAuditLog")
async def get_admin_audit_log(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: int = 50,
):
    items = await list_admin_audit(session, tenant_id=user["tenant_id"], limit=limit)
    return {"items": items}


@router.get("/phi-access-log", operation_id="getPhiAccessLog")
async def get_phi_access_log(
    user: Annotated[dict, Depends(require_roles(*TENANT_ADMIN_ROLES))],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: int = 100,
):
    items = await list_phi_access(session, tenant_id=user["tenant_id"], limit=limit)
    return {"items": items}

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import ROLE_LANDING_PATHS, hash_password
from app.models.i18n import TranslationEntry, TranslationLocale
from app.models.platform import PlatformSettings
from app.models.tenant import Tenant
from app.models.user import User

SEED_USERS = [
    {
        "id": "usr-platform-admin",
        "email": "platform.admin@demo.rmhs.app",
        "name": "Platform Administrator",
        "role": "platform_admin",
        "program_id": None,
        "tenant_id": None,
    },
    {
        "id": "usr-org-admin",
        "email": "org.admin@demo.rmhs.app",
        "name": "Organization Administrator",
        "role": "organization_admin",
        "program_id": None,
        "created_by": "usr-platform-admin",
    },
    {
        "id": "usr-case-manager",
        "email": "case.manager@demo.rmhs.app",
        "name": "Case Manager",
        "role": "case_manager",
        "program_id": "prog-senior-services",
        "created_by": "usr-org-admin",
    },
    {
        "id": "usr-supervisor",
        "email": "supervisor@demo.rmhs.app",
        "name": "Supervisor / Dept Admin",
        "role": "supervisor",
        "program_id": "prog-senior-services",
        "created_by": "usr-org-admin",
    },
    {
        "id": "usr-liaison",
        "email": "liaison@demo.rmhs.app",
        "name": "Cross-Program Liaison",
        "role": "cross_program_liaison",
        "program_id": None,
        "created_by": "usr-org-admin",
    },
    {
        "id": "usr-auditor",
        "email": "auditor@demo.rmhs.app",
        "name": "Auditor",
        "role": "auditor",
        "program_id": None,
        "created_by": "usr-org-admin",
    },
]

SEED_EN_JSON = Path(__file__).resolve().parents[2] / "seed-data" / "en.json"
FALLBACK_LOCALES_DIR = Path(__file__).resolve().parents[3] / "web" / "src" / "i18n" / "locales"


def user_model_to_dict(user: User) -> dict[str, Any]:
    return {
        "_id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "tenant_id": user.tenant_id,
        "program_id": user.program_id,
        "status": user.status,
        "password_hash": user.password_hash,
    }


def user_to_profile(user: dict[str, Any] | User) -> dict[str, Any]:
    if isinstance(user, User):
        user = user_model_to_dict(user)

    role = user["role"]
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user["name"],
        "role": role,
        "tenantId": user.get("tenant_id"),
        "programId": user.get("program_id"),
        "status": user.get("status", "Active"),
        "landingPath": ROLE_LANDING_PATHS.get(role, "/"),
    }


def _flatten_json(obj: dict[str, Any], prefix: str = "") -> dict[str, str]:
    entries: dict[str, str] = {}
    for key, value in obj.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            entries.update(_flatten_json(value, full_key))
        else:
            entries[full_key] = str(value)
    return entries


async def _backfill_created_by(session: AsyncSession) -> None:
    """Align demo data with CR-2026-002 creator scoping for existing databases."""
    backfill = {
        "usr-org-admin": "usr-platform-admin",
        "usr-case-manager": "usr-org-admin",
        "usr-supervisor": "usr-org-admin",
        "usr-liaison": "usr-org-admin",
        "usr-auditor": "usr-org-admin",
    }
    for user_id, creator_id in backfill.items():
        result = await session.execute(select(User).where(User.id == user_id))
        row = result.scalar_one_or_none()
        if row and not row.created_by:
            row.created_by = creator_id
            session.add(row)
    tenant_admin = await session.execute(select(User).where(User.id == "usr-tenant-admin"))
    legacy = tenant_admin.scalar_one_or_none()
    if legacy:
        legacy.status = "Inactive"
        session.add(legacy)
    await session.commit()


async def seed_auth_data_if_empty(session: AsyncSession) -> None:
    tenant_result = await session.execute(
        select(Tenant).where(Tenant.id == settings.default_tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    if tenant:
        branding = dict(tenant.branding or {})
        if not branding.get("logo_url"):
            branding["logo_url"] = "/assets/logo.svg"
            tenant.branding = branding
            session.add(tenant)
            await session.commit()
    if not tenant:
        session.add(
            Tenant(
                id=settings.default_tenant_id,
                legal_name="Rolling Meadows Human Services",
                short_code="RMHS",
                status="Active",
                default_locale="en",
                enabled_locales=["en", "es"],
                timezone="America/Chicago",
                branding={
                    "display_name": "Rolling Meadows Human Services",
                    "primary_color": "#1a5f4a",
                    "secondary_color": "#0f2340",
                    "accent_color": "#43a047",
                    "footer_text": "© Rolling Meadows Human Services",
                    "logo_url": "/assets/logo.svg",
                    "login_tagline": "Human services case management for the City of Rolling Meadows.",
                },
                config={
                    "duplicate_threshold": 25,
                    "follow_up_cadence": {"High": 14, "Medium": 30, "Low": 90},
                    "retention_years": 7,
                    "support_access_policy": "per_session",
                },
                provisioned_at=datetime.now(timezone.utc),
                activated_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()

    password_hash = hash_password(settings.seed_user_password)
    for seed_user in SEED_USERS:
        result = await session.execute(select(User).where(User.id == seed_user["id"]))
        if result.scalar_one_or_none():
            continue

        tenant_id = seed_user.get("tenant_id")
        if tenant_id is None and seed_user["role"] != "platform_admin":
            tenant_id = settings.default_tenant_id

        session.add(
            User(
                id=seed_user["id"],
                email=seed_user["email"].lower(),
                name=seed_user["name"],
                role=seed_user["role"],
                tenant_id=tenant_id,
                program_id=seed_user.get("program_id"),
                status="Active",
                password_hash=password_hash,
                created_by=seed_user.get("created_by"),
            )
        )
    await session.commit()

    await _backfill_created_by(session)

    for loc in DEFAULT_LOCALE_SEED:
        result = await session.execute(
            select(TranslationLocale).where(TranslationLocale.code == loc["code"])
        )
        if not result.scalar_one_or_none():
            session.add(TranslationLocale(**loc))
    await session.commit()

    for locale_code in ("en", "es"):
        count_result = await session.execute(
            select(func.count())
            .select_from(TranslationEntry)
            .where(TranslationEntry.tenant_id.is_(None), TranslationEntry.locale == locale_code)
        )
        if count_result.scalar_one() > 0:
            continue

        catalogue_path = SEED_EN_JSON if locale_code == "en" and SEED_EN_JSON.is_file() else FALLBACK_LOCALES_DIR / f"{locale_code}.json"
        if not catalogue_path.is_file():
            continue
        with catalogue_path.open(encoding="utf-8") as handle:
            catalogue = json.load(handle)
        for key, value in _flatten_json(catalogue).items():
            session.add(
                TranslationEntry(
                    id=f"tr-{locale_code}-{uuid.uuid4().hex[:12]}",
                    tenant_id=None,
                    locale=locale_code,
                    key=key,
                    namespace=key.split(".")[0] if "." in key else "",
                    value=value,
                )
            )
        await session.commit()

    settings_result = await session.execute(
        select(PlatformSettings).where(PlatformSettings.id == "default")
    )
    if not settings_result.scalar_one_or_none():
        session.add(PlatformSettings(id="default"))
        await session.commit()


DEFAULT_LOCALE_SEED = [
    {"code": "en", "name": "English", "rtl": False, "active": True},
    {"code": "es", "name": "Español", "rtl": False, "active": True},
]

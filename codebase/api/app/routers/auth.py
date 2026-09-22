from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_correlation_id, get_current_user_doc
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_session
from app.seed.users import user_model_to_dict, user_to_profile
from app.services.auth_service import (
    assert_tenant_login_allowed,
    load_branding_by_email,
    load_login_preview,
    load_public_branding,
    load_tenant_summary,
    record_login,
    resolve_user_for_login,
    update_user_password,
)
from app.services.i18n import get_platform_translation_bundle, list_active_locales

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    organizationCode: str | None = Field(default=None, max_length=32)


class ChangePasswordRequest(BaseModel):
    currentPassword: str = Field(min_length=8)
    newPassword: str = Field(min_length=8)


class LoginResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    expiresIn: int
    user: dict


@router.get("/branding", operation_id="getPublicBranding")
async def get_public_branding(
    session: Annotated[AsyncSession, Depends(get_session)],
    organizationCode: str = "",
):
    """Public tenant branding for the login screen (by organization code)."""
    payload = await load_public_branding(session, organizationCode)
    if not payload:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "message": "Organization not found"},
        )
    return payload


@router.get("/login-preview", operation_id="getLoginPreview")
async def get_login_preview(
    session: Annotated[AsyncSession, Depends(get_session)],
    email: EmailStr = "",
):
    """Login hero scope: CommunityOne for super admin, tenant branding for org users."""
    return await load_login_preview(session, str(email))


@router.get("/branding/by-email", operation_id="getBrandingByEmail")
async def get_branding_by_email(
    session: Annotated[AsyncSession, Depends(get_session)],
    email: EmailStr = "",
):
    """Public tenant branding when email uniquely identifies one organization."""
    payload = await load_branding_by_email(session, str(email))
    if not payload:
        raise HTTPException(
            status_code=404,
            detail={"error": "not_found", "message": "Organization branding not available for this email"},
        )
    return payload


@router.get("/locales", operation_id="listAuthLocales")
async def list_auth_locales(organizationCode: str | None = None):
    """Public locale list for login and unauthenticated pages."""
    return await list_active_locales(organizationCode)


@router.get("/translations/bundle/{locale}", operation_id="getAuthTranslationBundle")
async def get_auth_translation_bundle(locale: str):
    """Public platform translation bundle for login / pre-auth UI."""
    return await get_platform_translation_bundle(locale)


@router.post("/login", operation_id="login")
async def login(
    body: LoginRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
):
    user = await resolve_user_for_login(
        session,
        body.email,
        body.password,
        verify_password_fn=verify_password,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_credentials", "message": "Invalid email or password"},
        )

    await assert_tenant_login_allowed(session, user)
    await record_login(session, user)

    token = create_access_token(
        user.id,
        {"tenant_id": user.tenant_id, "role": user.role},
    )
    profile = user_to_profile(user_model_to_dict(user))
    profile["tenant"] = await load_tenant_summary(session, user.tenant_id)
    if correlation_id:
        profile["correlationId"] = correlation_id

    return LoginResponse(
        accessToken=token,
        expiresIn=settings.jwt_expires_minutes * 60,
        user=profile,
    )


@router.get("/me", operation_id="getCurrentUser")
async def get_me(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
):
    profile = user_to_profile(user)
    profile["tenant"] = await load_tenant_summary(session, user.get("tenant_id"))
    if correlation_id:
        profile["correlationId"] = correlation_id
    return profile


@router.post("/change-password", operation_id="changePassword")
async def change_password(
    body: ChangePasswordRequest,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if not verify_password(body.currentPassword, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_password", "message": "Current password is incorrect"},
        )
    await update_user_password(session, user["_id"], hash_password(body.newPassword))
    return {"ok": True}


@router.post("/logout", operation_id="logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(_user: Annotated[dict, Depends(get_current_user_doc)]):
    return None

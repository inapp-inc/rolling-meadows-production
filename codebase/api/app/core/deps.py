from typing import Annotated, Any, Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_session
from app.models.user import User
from app.seed.users import user_model_to_dict
from app.services.password_rotation import get_password_max_age_days, password_rotation_status

security_scheme = HTTPBearer(auto_error=False)


async def get_correlation_id(request: Request) -> str | None:
    return request.headers.get("x-correlation-id")


def _password_change_allowed(path: str) -> bool:
    return (
        path.endswith("/change-password")
        or path.endswith("/logout")
        or path.endswith("/me")
        or path.endswith("/phi-export")
    )


async def get_current_user_doc(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Authentication required"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_token", "message": "Invalid or expired token"},
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_token", "message": "Invalid token subject"},
        )

    result = await session.execute(
        select(User).where(User.id == user_id, User.status == "Active")
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "user_not_found", "message": "User not found or inactive"},
        )

    token_tenant = payload.get("tenant_id")
    if token_tenant != user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "tenant_mismatch", "message": "Token tenant mismatch"},
        )

    if not _password_change_allowed(request.url.path):
        max_age = await get_password_max_age_days(session, user.tenant_id)
        rotation = password_rotation_status(user, max_age)
        if rotation["mustChange"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "password_change_required",
                    "message": "Password change required before continuing.",
                    "passwordExpiresAt": rotation.get("passwordExpiresAt"),
                },
            )

    return user_model_to_dict(user)


def require_roles(*roles: str) -> Callable:
    allowed = set(roles)

    async def _require(user: Annotated[dict, Depends(get_current_user_doc)]) -> dict:
        if user.get("role") not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "forbidden", "message": "Insufficient permissions"},
            )
        return user

    return _require

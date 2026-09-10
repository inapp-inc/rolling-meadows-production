import bcrypt
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt

from app.core.config import settings

ROLE_LANDING_PATHS: dict[str, str] = {
    "platform_admin": "/platform/tenants",
    "tenant_admin": "/admin",
    "organization_admin": "/dashboard",
    "supervisor": "/cases/new",
    "case_manager": "/cases/new",
    "cross_program_liaison": "/liaison",
    "auditor": "/reports",
}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(subject: str, claims: dict[str, Any]) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expires_minutes)
    payload = {**claims, "sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])

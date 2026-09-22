"""Tenant branding helpers — serialization, validation, logo storage."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile

ALLOWED_LOGO_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"}
MAX_LOGO_BYTES = 2 * 1024 * 1024
HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")

LOGO_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
}


def _clean_color(value: str | None, default: str) -> str:
    if value and HEX_COLOR.match(value.strip()):
        return value.strip()
    return default


def normalize_branding_input(data: dict[str, Any] | None, *, legal_name: str) -> dict[str, str]:
    raw = data or {}
    display_name = (raw.get("display_name") or raw.get("displayName") or legal_name).strip()
    return {
        "display_name": display_name or legal_name,
        "primary_color": _clean_color(raw.get("primary_color") or raw.get("primaryColor"), "#1a3560"),
        "secondary_color": _clean_color(raw.get("secondary_color") or raw.get("secondaryColor"), "#0f2340"),
        "accent_color": _clean_color(raw.get("accent_color") or raw.get("accentColor"), "#43a047"),
        "footer_text": (raw.get("footer_text") or raw.get("footerText") or f"© {display_name}").strip(),
        "logo_url": (raw.get("logo_url") or raw.get("logoUrl") or "").strip(),
        "login_tagline": (raw.get("login_tagline") or raw.get("loginTagline") or "").strip(),
    }


def serialize_branding(branding: dict[str, Any] | None, *, legal_name: str) -> dict[str, str]:
    normalized = normalize_branding_input(branding, legal_name=legal_name)
    return {
        "displayName": normalized["display_name"],
        "primaryColor": normalized["primary_color"],
        "secondaryColor": normalized["secondary_color"],
        "accentColor": normalized["accent_color"],
        "footerText": normalized["footer_text"],
        "logoUrl": normalized["logo_url"],
        "loginTagline": normalized["login_tagline"],
    }


def branding_storage_dir(branding_root: str | Path, tenant_id: str) -> Path:
    path = Path(branding_root) / tenant_id
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_tenant_logo(branding_root: str | Path, tenant_id: str, upload: UploadFile) -> str:
    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_LOGO_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_file", "message": "Logo must be PNG, JPG, SVG, or WebP"},
        )

    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail={"error": "empty_file", "message": "Logo file is empty"})
    if len(data) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=400, detail={"error": "file_too_large", "message": "Logo must be 2 MB or less"})

    ext = LOGO_EXTENSIONS[content_type]
    tenant_dir = branding_storage_dir(branding_root, tenant_id)

    for existing in tenant_dir.glob("logo.*"):
        existing.unlink(missing_ok=True)

    logo_path = tenant_dir / f"logo{ext}"
    logo_path.write_bytes(data)

    return f"/branding/{tenant_id}/logo{ext}"


def merge_branding(existing: dict[str, Any] | None, updates: dict[str, Any] | None, *, legal_name: str) -> dict[str, str]:
    merged = {**(existing or {}), **(updates or {})}
    return normalize_branding_input(merged, legal_name=legal_name)

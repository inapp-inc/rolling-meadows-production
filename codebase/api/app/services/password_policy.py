import re

from fastapi import HTTPException, status


def validate_password(password: str, *, min_length: int = 12) -> None:
    """HIPAA-aligned password composition (minimum length + character classes)."""
    if len(password) < min_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "weak_password",
                "message": f"Password must be at least {min_length} characters.",
            },
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "weak_password", "message": "Password must include a lowercase letter."},
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "weak_password", "message": "Password must include an uppercase letter."},
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "weak_password", "message": "Password must include a number."},
        )

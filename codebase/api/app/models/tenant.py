from typing import TYPE_CHECKING

from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    legal_name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="Active", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="America/Chicago", nullable=False)
    default_locale: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    enabled_locales: Mapped[list[str]] = mapped_column(ARRAY(String(8)), default=list)
    branding: Mapped[dict] = mapped_column(JSONB, default=dict)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    provisioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    users: Mapped[list["User"]] = relationship(back_populates="tenant")

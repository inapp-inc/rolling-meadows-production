from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    registered_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    registration_source: Mapped[str] = mapped_column(String(64), default="registration", nullable=False)
    contact_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    screening_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_trigger: Mapped[str | None] = mapped_column(String(256), nullable=True)
    service_need: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cross_program_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    merged_into: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

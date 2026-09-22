from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", "tenant_id", name="uq_users_email_tenant"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=True)
    program_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="Active", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant | None"] = relationship(back_populates="users")

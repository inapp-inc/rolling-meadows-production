from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CustomReport(Base):
    __tablename__ = "custom_reports"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    report_type: Mapped[str] = mapped_column(String(32), default="table", nullable=False)
    owner_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    shared: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    primary_entity: Mapped[str] = mapped_column(String(64), default="client", nullable=False)
    joins: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    columns: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    filters: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    sort_by: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    join_aggregates: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    chart: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

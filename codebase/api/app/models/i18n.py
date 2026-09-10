from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TranslationLocale(Base):
    __tablename__ = "translation_locales"

    code: Mapped[str] = mapped_column(String(8), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    rtl: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class TranslationEntry(Base):
    __tablename__ = "translation_entries"
    __table_args__ = (
        UniqueConstraint("tenant_id", "locale", "key", name="uq_translation_entries_scope"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    locale: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(512), nullable=False)
    namespace: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    value: Mapped[str] = mapped_column(Text, nullable=False)

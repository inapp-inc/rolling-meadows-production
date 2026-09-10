from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CaseCategory(Base):
    __tablename__ = "case_categories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    program_id: Mapped[str] = mapped_column(String(64), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    subcategories: Mapped[list["CaseSubcategory"]] = relationship(
        back_populates="category",
        order_by="CaseSubcategory.sort_order",
    )


class CaseSubcategory(Base):
    __tablename__ = "case_subcategories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    category_id: Mapped[str] = mapped_column(String(64), ForeignKey("case_categories.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    category: Mapped[CaseCategory] = relationship(back_populates="subcategories")
    workflow: Mapped["WorkflowDefinition | None"] = relationship(back_populates="subcategory", uselist=False)


class WorkflowDefinition(Base):
    __tablename__ = "workflow_definitions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    subcategory_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("case_subcategories.id"), nullable=False, unique=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    example_program: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    focus_areas: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    subcategory: Mapped[CaseSubcategory] = relationship(back_populates="workflow")
    stages: Mapped[list["WorkflowStage"]] = relationship(
        back_populates="workflow",
        order_by="WorkflowStage.stage_number",
    )


class WorkflowStage(Base):
    __tablename__ = "workflow_stages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(String(64), ForeignKey("workflow_definitions.id"), nullable=False)
    tab_id: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    deliverable: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    stage_number: Mapped[int] = mapped_column(Integer, nullable=False)

    workflow: Mapped[WorkflowDefinition] = relationship(back_populates="stages")


class CatalogEvent(Base):
    __tablename__ = "catalog_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

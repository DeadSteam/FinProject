import uuid
from typing import List

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase


class Metric(UUIDBase):
    """Модель метрики."""
    __tablename__ = "metrics"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="шт.")

    # Связи с другими таблицами
    category: Mapped["Category"] = relationship(back_populates="metrics")
    actual_values: Mapped[List["ActualValue"]] = relationship(back_populates="metric")
    plan_values: Mapped[List["PlanValue"]] = relationship(back_populates="metric")
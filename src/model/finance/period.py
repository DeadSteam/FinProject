import uuid
from typing import Optional, List

from sqlalchemy import Integer, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase


class Period(UUIDBase):
    """Модель временного периода."""
    __tablename__ = "periods"

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    quarter: Mapped[Optional[int]] = mapped_column(Integer)
    month: Mapped[Optional[int]] = mapped_column(Integer)

    __table_args__ = (
        CheckConstraint("quarter BETWEEN 1 AND 4", name="check_quarter_range"),
        CheckConstraint("month BETWEEN 1 AND 12", name="check_month_range"),
        UniqueConstraint("year", "quarter", "month", name="unique_period"),
    )

    # Связи с другими таблицами
    actual_values: Mapped[List["ActualValue"]] = relationship(back_populates="period")
    plan_values: Mapped[List["PlanValue"]] = relationship(back_populates="period")
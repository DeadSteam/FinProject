from typing import Optional, List

from sqlalchemy import String, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase


class Shop(UUIDBase):
    """Модель магазина."""
    __tablename__ = "shops"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    number_of_staff: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    address: Mapped[Optional[str]] = mapped_column(String(500))
    status: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Связи с другими таблицами
    actual_values: Mapped[List["ActualValue"]] = relationship(back_populates="shop")
    plan_values: Mapped[List["PlanValue"]] = relationship(back_populates="shop")
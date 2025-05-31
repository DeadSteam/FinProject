import uuid
from typing import Optional, List

from sqlalchemy import ForeignKey, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase


class Category(UUIDBase):
    """Модель категории расходов."""
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    image_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("images.id"))
    status: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Связи с другими таблицами
    image: Mapped[Optional["Image"]] = relationship(back_populates="categories")
    metrics: Mapped[List["Metric"]] = relationship(back_populates="category")
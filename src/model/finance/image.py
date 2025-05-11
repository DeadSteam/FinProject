from typing import Optional, List

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase


class Image(UUIDBase):
    """Модель для хранения SVG-изображений."""
    __tablename__ = "images"

    name: Mapped[Optional[str]] = mapped_column(String(255))
    svg_data: Mapped[str] = mapped_column(Text, nullable=False)

    # Связь с таблицей категорий
    categories: Mapped[List["Category"]] = relationship(back_populates="image")
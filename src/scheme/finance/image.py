from typing import Optional

from src.scheme.base import BaseSchema, UUIDSchema


class ImageBase(BaseSchema):
    """Базовая схема для изображения."""
    name: Optional[str] = None
    svg_data: str


class ImageCreate(ImageBase):
    """Схема для создания изображения."""
    pass


class ImageUpdate(BaseSchema):
    """Схема для обновления изображения."""
    name: Optional[str] = None
    svg_data: Optional[str] = None


class Image(ImageBase, UUIDSchema):
    """Схема изображения."""
    pass

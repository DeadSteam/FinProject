import uuid
from typing import Optional

from src.scheme.base import BaseSchema, UUIDSchema
from src.scheme.finance.image import Image


class CategoryBase(BaseSchema):
    """Базовая схема для категории."""
    name: str
    description: Optional[str] = None
    image_id: Optional[uuid.UUID] = None
    status: bool = True


class CategoryCreate(CategoryBase):
    """Схема для создания категории."""
    pass


class CategoryUpdate(BaseSchema):
    """Схема для обновления категории."""
    name: Optional[str] = None
    description: Optional[str] = None
    image_id: Optional[uuid.UUID] = None
    status: Optional[bool] = None


class Category(CategoryBase, UUIDSchema):
    """Схема категории без вложенных объектов."""
    pass


class CategoryWithRelations(Category):
    """Полная схема категории с отношениями."""
    image: Optional[Image] = None
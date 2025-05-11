from typing import Optional

from src.scheme.base import BaseSchema, UUIDSchema


class ShopBase(BaseSchema):
    """Базовая схема для магазина."""
    name: str
    number_of_staff: int
    description: Optional[str] = None
    address: Optional[str] = None
    status: bool = True


class ShopCreate(ShopBase):
    """Схема для создания магазина."""
    pass


class ShopUpdate(BaseSchema):
    """Схема для обновления магазина."""
    name: Optional[str] = None
    number_of_staff: Optional[int] = None
    description: Optional[str] = None
    address: Optional[str] = None
    status: Optional[bool] = None


class Shop(ShopBase, UUIDSchema):
    """Полная схема магазина."""
    pass
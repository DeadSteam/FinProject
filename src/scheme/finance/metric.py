import uuid
from typing import Optional

from src.scheme.base import BaseSchema, UUIDSchema
from src.scheme.finance.category import Category


class MetricBase(BaseSchema):
    """Базовая схема для метрики."""
    name: str
    category_id: uuid.UUID
    unit: str = "шт."


class MetricCreate(MetricBase):
    """Схема для создания метрики."""
    pass


class MetricUpdate(BaseSchema):
    """Схема для обновления метрики."""
    name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    unit: Optional[str] = None


class Metric(MetricBase, UUIDSchema):
    """Схема метрики без вложенных объектов."""
    pass


class MetricWithCategory(Metric):
    """Полная схема метрики с категорией."""
    category: Optional[Category] = None
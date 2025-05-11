import uuid
from typing import Optional
from decimal import Decimal

from src.scheme.base import BaseSchema, UUIDSchema
from src.scheme.finance.metric import Metric
from src.scheme.finance.shop import Shop
from src.scheme.finance.period import Period


class PlanValueBase(BaseSchema):
    """Базовая схема для планового значения."""
    metric_id: uuid.UUID
    shop_id: uuid.UUID
    value: Decimal
    period_id: uuid.UUID


class PlanValueCreate(PlanValueBase):
    """Схема для создания планового значения."""
    pass


class PlanValueUpdate(BaseSchema):
    """Схема для обновления планового значения."""
    value: Optional[Decimal] = None


class PlanValue(PlanValueBase, UUIDSchema):
    """Схема планового значения без вложенных объектов."""
    pass


class PlanValueWithRelations(PlanValue):
    """Полная схема планового значения с отношениями."""
    metric: Optional[Metric] = None
    shop: Optional[Shop] = None
    period: Optional[Period] = None 
import uuid
from typing import Optional
from decimal import Decimal

from src.scheme.base import BaseSchema, UUIDSchema
from src.scheme.finance.metric import Metric
from src.scheme.finance.shop import Shop
from src.scheme.finance.period import Period


class ActualValueBase(BaseSchema):
    """Базовая схема для фактического значения."""
    metric_id: uuid.UUID
    shop_id: uuid.UUID
    value: Decimal
    period_id: uuid.UUID


class ActualValueCreate(ActualValueBase):
    """Схема для создания фактического значения."""
    pass


class ActualValueUpdate(BaseSchema):
    """Схема для обновления фактического значения."""
    value: Optional[Decimal] = None


class ActualValue(ActualValueBase, UUIDSchema):
    """Схема фактического значения без вложенных объектов."""
    pass


class ActualValueWithRelations(ActualValue):
    """Полная схема фактического значения с отношениями."""
    metric: Optional[Metric] = None
    shop: Optional[Shop] = None
    period: Optional[Period] = None
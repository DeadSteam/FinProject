import uuid
from typing import Optional, List, Any, Dict, Union
from datetime import datetime, date
from decimal import Decimal

from pydantic import Field

from src.scheme.base import BaseSchema
from src.scheme.pagination import PaginationParams


class FilterOperator(BaseSchema):
    """Оператор для фильтрации."""
    eq: Optional[Any] = Field(default=None, description="Равно")
    ne: Optional[Any] = Field(default=None, description="Не равно")
    gt: Optional[Any] = Field(default=None, description="Больше")
    lt: Optional[Any] = Field(default=None, description="Меньше")
    gte: Optional[Any] = Field(default=None, description="Больше или равно")
    lte: Optional[Any] = Field(default=None, description="Меньше или равно")
    in_: Optional[List[Any]] = Field(default=None, alias="in", description="В списке")
    nin: Optional[List[Any]] = Field(default=None, description="Не в списке")
    like: Optional[str] = Field(default=None, description="Содержит подстроку")
    ilike: Optional[str] = Field(default=None, description="Содержит подстроку (без учета регистра)")
    between: Optional[List[Any]] = Field(default=None, description="Между значениями")
    is_null: Optional[bool] = Field(default=None, description="Является NULL")


class BaseFilterParams(PaginationParams):
    """Базовый класс для параметров фильтрации."""
    pass


# Фильтры для финансовых моделей

class PeriodFilterParams(BaseFilterParams):
    """Параметры фильтрации для периодов."""
    year: Optional[Union[int, FilterOperator]] = None
    quarter: Optional[Union[int, FilterOperator]] = None
    month: Optional[Union[int, FilterOperator]] = None


class CategoryFilterParams(BaseFilterParams):
    """Параметры фильтрации для категорий."""
    name: Optional[Union[str, FilterOperator]] = None
    image_id: Optional[Union[uuid.UUID, FilterOperator]] = None


class ShopFilterParams(BaseFilterParams):
    """Параметры фильтрации для магазинов."""
    name: Optional[Union[str, FilterOperator]] = None
    number_of_staff: Optional[Union[int, FilterOperator]] = None


class MetricFilterParams(BaseFilterParams):
    """Параметры фильтрации для метрик."""
    name: Optional[Union[str, FilterOperator]] = None
    category_id: Optional[Union[uuid.UUID, FilterOperator]] = None


class ValueFilterParams(BaseFilterParams):
    """Параметры фильтрации для значений (фактических и плановых)."""
    metric_id: Optional[Union[uuid.UUID, FilterOperator]] = None
    shop_id: Optional[Union[uuid.UUID, FilterOperator]] = None
    period_id: Optional[Union[uuid.UUID, FilterOperator]] = None
    value: Optional[Union[Decimal, FilterOperator]] = None


# Фильтры для пользовательских моделей

class UserFilterParams(BaseFilterParams):
    """Параметры фильтрации для пользователей."""
    username: Optional[Union[str, FilterOperator]] = None
    role_id: Optional[Union[uuid.UUID, FilterOperator]] = None


class RoleFilterParams(BaseFilterParams):
    """Параметры фильтрации для ролей."""
    name: Optional[Union[str, FilterOperator]] = None 
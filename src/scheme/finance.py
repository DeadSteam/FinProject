import uuid
from typing import Optional, List
from decimal import Decimal

from pydantic import Field, field_validator, model_validator

from src.scheme.base import BaseSchema, UUIDSchema, UUIDTimestampedSchema


# --- Period схемы ---

class PeriodBase(BaseSchema):
    """Базовая схема для периода."""
    year: int
    quarter: Optional[int] = None
    month: Optional[int] = None
    
    @field_validator('quarter')
    @classmethod
    def validate_quarter(cls, v: Optional[int], info) -> Optional[int]:
        if v is not None:
            if not (1 <= v <= 4):
                raise ValueError('Квартал должен быть между 1 и 4')
            if 'year' not in info.data:
                raise ValueError('Год должен быть указан для квартала')
        return v
    
    @field_validator('month')
    @classmethod
    def validate_month(cls, v: Optional[int], info) -> Optional[int]:
        if v is not None:
            if not (1 <= v <= 12):
                raise ValueError('Месяц должен быть между 1 и 12')
            if 'quarter' not in info.data or info.data['quarter'] is None:
                raise ValueError('Квартал должен быть указан для месяца')
        return v
    
    def is_year_only(self) -> bool:
        """Проверяет, является ли период только годом."""
        return self.quarter is None and self.month is None
    
    def is_quarter(self) -> bool:
        """Проверяет, является ли период кварталом."""
        return self.quarter is not None and self.month is None
    
    def is_month(self) -> bool:
        """Проверяет, является ли период месяцем."""
        return self.month is not None
    
    def get_period_type(self) -> str:
        """Возвращает тип периода."""
        if self.is_month():
            return "month"
        elif self.is_quarter():
            return "quarter"
        else:
            return "year"


class PeriodCreate(PeriodBase):
    """Схема для создания периода."""
    pass


class PeriodUpdate(BaseSchema):
    """Схема для обновления периода."""
    year: Optional[int] = None
    quarter: Optional[int] = None
    month: Optional[int] = None


class Period(PeriodBase, UUIDSchema):
    """Полная схема периода."""
    pass


# --- Image схемы ---

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


# --- Category схемы ---

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


# --- Shop схемы ---

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


# --- Metric схемы ---

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


# --- ActualValue схемы ---

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


# --- PlanValue схемы ---

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
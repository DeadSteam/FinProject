from typing import Optional

from pydantic import field_validator

from src.scheme.base import BaseSchema, UUIDSchema


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
from typing import Optional, List, TypeVar, Generic
from pydantic import Field

from src.scheme.base import BaseSchema

T = TypeVar('T')


class PaginationParams(BaseSchema):
    """Параметры пагинации для запросов."""
    page: int = Field(default=1, ge=1, description="Номер страницы")
    size: int = Field(default=10, ge=1, le=100, description="Количество элементов на странице")
    sort_by: Optional[str] = Field(default=None, description="Поле для сортировки")
    sort_desc: bool = Field(default=False, description="Сортировка по убыванию")


class PageInfo(BaseSchema):
    """Информация о пагинации для ответа."""
    page: int = Field(..., description="Текущая страница")
    size: int = Field(..., description="Размер страницы")
    total: int = Field(..., description="Общее количество элементов")
    pages: int = Field(..., description="Общее количество страниц")
    has_next: bool = Field(..., description="Есть ли следующая страница")
    has_prev: bool = Field(..., description="Есть ли предыдущая страница")


class Page(BaseSchema, Generic[T]):
    """Страница с данными и информацией о пагинации."""
    items: List[T] = Field(default_factory=list, description="Список элементов")
    page_info: PageInfo = Field(..., description="Информация о пагинации") 
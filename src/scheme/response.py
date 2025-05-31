from typing import Generic, TypeVar, Optional, List, Any, Dict
from pydantic import Field

from src.scheme.base import BaseSchema

T = TypeVar('T')


class BaseResponse(BaseSchema):
    """Базовый ответ API."""
    success: bool = True
    message: str = "Операция выполнена успешно"


class ItemResponse(BaseResponse, Generic[T]):
    """Ответ с одним элементом данных."""
    data: Optional[T] = None


class ListResponse(BaseResponse, Generic[T]):
    """Ответ со списком элементов данных."""
    data: List[T] = []
    total: int = 0
    page: int = 1
    size: int = 10


class ErrorResponse(BaseSchema):
    """Ответ с ошибкой."""
    success: bool = False
    error: str
    detail: Optional[str] = None
    code: Optional[int] = None


class ValidationErrorResponse(ErrorResponse):
    """Ответ с ошибкой валидации."""
    error: str = "Ошибка валидации"
    fields: Dict[str, List[str]] = Field(default_factory=dict) 
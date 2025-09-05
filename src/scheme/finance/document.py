from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    """Базовая схема для документа."""
    filename: str = Field(..., max_length=255)
    content_type: str = Field(..., max_length=100)
    file_size: int = Field(..., gt=0)


class DocumentCreate(DocumentBase):
    """Схема для создания документа."""
    actual_value_id: UUID
    file_data: bytes


class DocumentUpdate(BaseModel):
    """Схема для обновления документа."""
    filename: Optional[str] = Field(None, max_length=255)
    status: Optional[bool] = None


class DocumentResponse(DocumentBase):
    """Схема для ответа с информацией о документе."""
    id: UUID
    actual_value_id: UUID
    uploaded_at: datetime
    uploaded_by: Optional[UUID] = None
    status: bool
    file_url: Optional[str] = None  # Опциональная ссылка для скачивания/открытия файла

    class Config:
        from_attributes = True 
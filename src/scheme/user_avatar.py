from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class UserAvatarBase(BaseModel):
    """Базовая схема для аватара пользователя."""
    filename: str = Field(..., max_length=255)
    content_type: str = Field(..., max_length=100)
    file_size: int = Field(..., gt=0)


class UserAvatarCreate(UserAvatarBase):
    """Схема для создания аватара."""
    user_id: UUID
    file_data: bytes


class UserAvatarResponse(UserAvatarBase):
    """Схема для ответа с информацией об аватаре."""
    id: UUID
    user_id: UUID
    uploaded_at: datetime
    is_active: bool

    class Config:
        from_attributes = True 
 
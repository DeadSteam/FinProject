import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Integer, LargeBinary, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase
# Удаляем импорт, чтобы избежать циклического импорта
# from src.model.users import User


class UserAvatar(UUIDBase):
    """Модель аватара пользователя."""
    __tablename__ = "user_avatars"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Связи
    user: Mapped["User"] = relationship("User", back_populates="avatars") 
 
import uuid
from typing import Optional

from sqlalchemy import ForeignKey, String, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDTimestampedBase


class Role(UUIDTimestampedBase):
    """Модель роли пользователя."""
    __tablename__ = "roles"
    
    name: Mapped[str] = mapped_column(String(50), unique=True)
    
    # Связь с таблицей users (отношение один-ко-многим)
    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(UUIDTimestampedBase):
    """Модель пользователя."""
    __tablename__ = "users"
    
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    status: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Внешний ключ к таблице ролей
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("roles.id"))
    
    # Связь с таблицей roles (отношение многие-к-одному)
    role: Mapped[Optional["Role"]] = relationship(back_populates="users")

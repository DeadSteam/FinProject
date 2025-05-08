from datetime import datetime
import uuid
from typing import Any, Dict

from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Базовый класс для всех моделей SQLAlchemy."""
    pass


class TimestampedBase(Base):
    """Базовый класс с добавлением временных меток."""
    __abstract__ = True
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, 
        onupdate=datetime.utcnow
    )


class UUIDBase(Base):
    """Базовый класс с UUID в качестве первичного ключа."""
    __abstract__ = True
    
    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()")
    )


class UUIDTimestampedBase(UUIDBase, TimestampedBase):
    """Базовый класс с UUID и временными метками."""
    __abstract__ = True 
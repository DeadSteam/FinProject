from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    """Базовая схема Pydantic."""
    model_config = ConfigDict(from_attributes=True)


class UUIDSchema(BaseSchema):
    """Базовая схема с идентификатором UUID."""
    id: uuid.UUID


class TimestampedSchema(BaseSchema):
    """Базовая схема с временными метками."""
    created_at: datetime
    updated_at: Optional[datetime] = None


class UUIDTimestampedSchema(UUIDSchema, TimestampedSchema):
    """Базовая схема с UUID и временными метками."""
    pass 
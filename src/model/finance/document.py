import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Integer, LargeBinary, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase
# Удаляем импорт, чтобы избежать циклического импорта
# from src.model.finance.actual_value import ActualValue


class Document(UUIDBase):
    """Модель документа/чека для фактических значений."""
    __tablename__ = "documents"

    actual_value_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("actual_values.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    status: Mapped[bool] = mapped_column(Boolean, default=True)

    # Связи
    actual_value: Mapped["ActualValue"] = relationship("ActualValue", back_populates="documents") 
 
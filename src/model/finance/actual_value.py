import uuid
from decimal import Decimal
from datetime import datetime
from typing import List, Optional

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase


class ActualValue(UUIDBase):
    """Модель фактических значений расходов."""
    __tablename__ = "actual_values"

    metric_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("metrics.id"), nullable=False)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    period_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("periods.id"), nullable=False)
    
    # Новые поля
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reason_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Связи с другими таблицами
    # Используем строковые имена для предотвращения циклических импортов
    metric: Mapped["Metric"] = relationship("Metric", back_populates="actual_values")
    shop: Mapped["Shop"] = relationship("Shop", back_populates="actual_values")
    period: Mapped["Period"] = relationship("Period", back_populates="actual_values")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="actual_value")

    __table_args__ = (
        UniqueConstraint("metric_id", "shop_id", "period_id", name="unique_actual_metric_shop_period"),
    )

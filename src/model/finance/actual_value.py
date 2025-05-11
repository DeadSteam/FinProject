import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase


class ActualValue(UUIDBase):
    """Модель фактических значений расходов."""
    __tablename__ = "actual_values"

    metric_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("metrics.id"), nullable=False)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    period_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("periods.id"), nullable=False)

    # Связи с другими таблицами
    metric: Mapped["Metric"] = relationship(back_populates="actual_values")
    shop: Mapped["Shop"] = relationship(back_populates="actual_values")
    period: Mapped["Period"] = relationship(back_populates="actual_values")

    __table_args__ = (
        UniqueConstraint("metric_id", "shop_id", "period_id", name="unique_actual_metric_shop_period"),
    )

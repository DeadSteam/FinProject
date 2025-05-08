import uuid
from typing import Optional
from decimal import Decimal

from sqlalchemy import ForeignKey, String, Integer, Text, Numeric, CheckConstraint, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.model.base import UUIDBase


class Period(UUIDBase):
    """Модель временного периода."""
    __tablename__ = "periods"
    
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    quarter: Mapped[Optional[int]] = mapped_column(Integer)
    month: Mapped[Optional[int]] = mapped_column(Integer)
    
    __table_args__ = (
        CheckConstraint("quarter BETWEEN 1 AND 4", name="check_quarter_range"),
        CheckConstraint("month BETWEEN 1 AND 12", name="check_month_range"),
        UniqueConstraint("year", "quarter", "month", name="unique_period"),
    )
    
    # Связи с другими таблицами
    actual_values: Mapped[list["ActualValue"]] = relationship(back_populates="period")
    plan_values: Mapped[list["PlanValue"]] = relationship(back_populates="period")


class Image(UUIDBase):
    """Модель для хранения SVG-изображений."""
    __tablename__ = "images"
    
    name: Mapped[Optional[str]] = mapped_column(String(255))
    svg_data: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Связь с таблицей категорий
    categories: Mapped[list["Category"]] = relationship(back_populates="image")


class Category(UUIDBase):
    """Модель категории расходов."""
    __tablename__ = "categories"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    image_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("images.id"))
    status: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Связи с другими таблицами
    image: Mapped[Optional[Image]] = relationship(back_populates="categories")
    metrics: Mapped[list["Metric"]] = relationship(back_populates="category")


class Shop(UUIDBase):
    """Модель магазина."""
    __tablename__ = "shops"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    number_of_staff: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    address: Mapped[Optional[str]] = mapped_column(String(500))
    status: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Связи с другими таблицами
    actual_values: Mapped[list["ActualValue"]] = relationship(back_populates="shop")
    plan_values: Mapped[list["PlanValue"]] = relationship(back_populates="shop")


class Metric(UUIDBase):
    """Модель метрики."""
    __tablename__ = "metrics"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="шт.")
    
    # Связи с другими таблицами
    category: Mapped[Category] = relationship(back_populates="metrics")
    actual_values: Mapped[list["ActualValue"]] = relationship(back_populates="metric")
    plan_values: Mapped[list["PlanValue"]] = relationship(back_populates="metric")


class ActualValue(UUIDBase):
    """Модель фактических значений расходов."""
    __tablename__ = "actual_values"
    
    metric_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("metrics.id"), nullable=False)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    period_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("periods.id"), nullable=False)
    
    # Связи с другими таблицами
    metric: Mapped[Metric] = relationship(back_populates="actual_values")
    shop: Mapped[Shop] = relationship(back_populates="actual_values")
    period: Mapped[Period] = relationship(back_populates="actual_values")
    
    __table_args__ = (
        UniqueConstraint("metric_id", "shop_id", "period_id", name="unique_actual_metric_shop_period"),
    )


class PlanValue(UUIDBase):
    """Модель плановых значений расходов."""
    __tablename__ = "plan_values"
    
    metric_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("metrics.id"), nullable=False)
    shop_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shops.id"), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    period_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("periods.id"), nullable=False)
    
    # Связи с другими таблицами
    metric: Mapped[Metric] = relationship(back_populates="plan_values")
    shop: Mapped[Shop] = relationship(back_populates="plan_values")
    period: Mapped[Period] = relationship(back_populates="plan_values")
    
    __table_args__ = (
        UniqueConstraint("metric_id", "shop_id", "period_id", name="unique_plan_metric_shop_period"),
    ) 
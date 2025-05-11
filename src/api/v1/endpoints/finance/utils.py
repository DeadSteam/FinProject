from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.repository.db import finances_db
from src.service.finance import (
    CategoryService, ShopService, MetricService, 
    ActualValueService, PlanValueService, PeriodService,
    ImageService
)
from src.service.analytics import AnalyticsService

# Инициализация сервисов
category_service = CategoryService()
shop_service = ShopService()
metric_service = MetricService()
actual_value_service = ActualValueService()
plan_value_service = PlanValueService()
period_service = PeriodService()
image_service = ImageService()
analytics_service = AnalyticsService()

__all__ = [
    "finances_db",
    "category_service",
    "shop_service",
    "metric_service",
    "actual_value_service",
    "plan_value_service",
    "period_service",
    "image_service",
    "analytics_service"
] 
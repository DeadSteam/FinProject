from fastapi import APIRouter

from src.api.v1.endpoints.finance.images import router as images_router
from src.api.v1.endpoints.finance.categories import router as categories_router
from src.api.v1.endpoints.finance.shops import router as shops_router
from src.api.v1.endpoints.finance.metrics import router as metrics_router
from src.api.v1.endpoints.finance.periods import router as periods_router
from src.api.v1.endpoints.finance.actual_values import router as actual_values_router
from src.api.v1.endpoints.finance.plan_values import router as plan_values_router
from src.api.v1.endpoints.finance.analytics import router as analytics_router
from src.api.v1.endpoints.finance.years import router as years_router
from src.api.v1.endpoints.finance.yearly_plans import router as yearly_plans_router
from src.api.v1.endpoints.finance.documents import router as documents_router

router = APIRouter()

# Включаем все маршрутизаторы с соответствующими тегами
router.include_router(images_router, prefix="/images", tags=["Изображения"])
router.include_router(categories_router, prefix="/categories", tags=["Категории"])
router.include_router(shops_router, prefix="/shops", tags=["Магазины"])
router.include_router(metrics_router, prefix="/metrics", tags=["Метрики"])
router.include_router(periods_router, prefix="/periods", tags=["Периоды"])
router.include_router(actual_values_router, prefix="/actual-values", tags=["Фактические значения"])
router.include_router(plan_values_router, prefix="/plan-values", tags=["Плановые значения"])
router.include_router(analytics_router, prefix="/analytics", tags=["Аналитика"])
router.include_router(years_router, prefix="/years", tags=["Годы"])
router.include_router(yearly_plans_router, prefix="/yearly-plans", tags=["Годовые планы"])
router.include_router(documents_router, prefix="/documents", tags=["Документы"])

__all__ = ["router"] 
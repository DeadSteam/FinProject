from typing import Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import AggregatedData, DetailedCategoryMetrics
from src.api.v1.endpoints.finance.utils import finances_db, metric_service, analytics_service

router = APIRouter()

@router.get("/budget-statistics", response_model=Dict[str, Any])
async def get_budget_statistics(
    shop_id: Optional[UUID] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение статистики по бюджету.
    
    Args:
        shop_id: ID магазина для фильтрации (опционально)
        year: Год для фильтрации (опционально)
        month: Месяц для фильтрации (опционально)
    """
    # Проверяем валидность месяца, если указан
    if month is not None and (month < 1 or month > 12):
        raise HTTPException(
            status_code=400,
            detail="Месяц должен быть числом от 1 до 12"
        )
    
    return await metric_service.calculate_budget_statistics(
        session=session,
        shop_id=shop_id,
        year=year,
        month=month
    )

@router.get("/dashboard/aggregate", response_model=AggregatedData)
async def get_dashboard_aggregate_data(
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение агрегированных данных для дашборда.
    """
    return await analytics_service.get_aggregated_data(session=session)

@router.get("/metrics/details/{category_id}/{shop_id}/{year}", response_model=DetailedCategoryMetrics)
async def get_detailed_category_metrics(
    category_id: UUID,
    shop_id: UUID,
    year: int,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение детальной информации о метриках категории.
    
    Args:
        category_id: ID категории
        shop_id: ID магазина
        year: Год
    """
    return await analytics_service.get_detailed_category_metrics(
        category_id=category_id,
        shop_id=shop_id,
        year=year,
        session=session
    )

@router.get("/actual-vs-plan/{period_id}", response_model=Dict[str, Any])
async def get_actual_vs_plan(
    period_id: UUID,
    shop_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение сравнения фактических и плановых значений.
    
    Args:
        period_id: ID периода
        shop_id: Опционально, ID магазина для фильтрации
        category_id: Опционально, ID категории для фильтрации
    """
    return await analytics_service.get_actual_vs_plan(
        period_id=period_id,
        session=session,
        shop_id=shop_id,
        category_id=category_id
    )

@router.get("/total-metrics-by-shop/{period_id}", response_model=Dict[str, Any])
async def get_total_metrics_by_shop(
    period_id: UUID,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение итоговых метрик по магазинам.
    
    Args:
        period_id: ID периода
    """
    return await analytics_service.get_total_metrics_by_shop(
        period_id=period_id,
        session=session
    ) 

from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import PlanValue, PlanValueCreate, PlanValueUpdate, PlanValueWithRelations
from src.api.v1.endpoints.finance.utils import finances_db, plan_value_service

router = APIRouter()

@router.get("", response_model=List[PlanValue])
async def get_plan_values(
    metric_id: Optional[UUID] = None,
    shop_id: Optional[UUID] = None,
    period_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение списка плановых значений с фильтрацией.
    
    Args:
        metric_id: ID метрики для фильтрации
        shop_id: ID магазина для фильтрации
        period_id: ID периода для фильтрации
        skip: Смещение для пагинации
        limit: Ограничение для пагинации
    """
    if period_id:
        return await plan_value_service.get_by_period(period_id=period_id, session=session)
    elif shop_id:
        return await plan_value_service.get_by_shop(shop_id=shop_id, session=session)
    elif metric_id:
        return await plan_value_service.get_by_metric(metric_id=metric_id, session=session)
    else:
        return await plan_value_service.get_multi(session=session, skip=skip, limit=limit)

@router.post("", response_model=PlanValue)
async def create_plan_value(
    plan_value_in: PlanValueCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового планового значения."""
    return await plan_value_service.create(plan_value_in, session=session)

@router.get("/{plan_value_id}", response_model=PlanValueWithRelations)
async def get_plan_value(
    plan_value_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение данных планового значения по ID."""
    plan_value = await plan_value_service.get_with_relations(id=plan_value_id, session=session)
    if not plan_value:
        raise HTTPException(status_code=404, detail="Плановое значение не найдено")
    return plan_value

@router.put("/{plan_value_id}", response_model=PlanValue)
async def update_plan_value(
    plan_value_id: UUID, 
    plan_value_in: PlanValueUpdate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Обновление данных планового значения."""
    plan_value = await plan_value_service.get(id=plan_value_id, session=session)
    if not plan_value:
        raise HTTPException(status_code=404, detail="Плановое значение не найдено")
    return await plan_value_service.update(id=plan_value_id, obj_in=plan_value_in, session=session)

@router.delete("/{plan_value_id}", status_code=200)
async def delete_plan_value(
    plan_value_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Удаление планового значения."""
    plan_value = await plan_value_service.get(id=plan_value_id, session=session)
    if not plan_value:
        raise HTTPException(status_code=404, detail="Плановое значение не найдено")
    result = await plan_value_service.delete(id=plan_value_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении планового значения")
    return {"status": "success", "message": "Плановое значение успешно удалено"}

@router.post("/distribute-yearly", response_model=List[PlanValue])
async def distribute_yearly_plan(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    yearly_value: Decimal,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Распределение годового плана по месяцам и кварталам.
    
    Args:
        metric_id: ID метрики
        shop_id: ID магазина
        year: Год для распределения
        yearly_value: Годовое значение
    """
    return await plan_value_service.distribute_yearly_plan(
        metric_id=metric_id,
        shop_id=shop_id,
        year=year,
        yearly_value=yearly_value,
        session=session
    )

@router.post("/recalculate-with-actual", response_model=List[PlanValue])
async def recalculate_plan_with_actual(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    actual_month: int,
    actual_value: Decimal,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Пересчет плана с учетом фактического значения.
    
    Корректирует плановые значения на основе фактического значения
    за указанный месяц. Перераспределяет оставшуюся часть годового
    плана на будущие месяцы.
    
    Args:
        metric_id: ID метрики
        shop_id: ID магазина
        year: Год
        actual_month: Месяц с фактическим значением
        actual_value: Фактическое значение
    """
    # Проверяем валидность месяца
    if actual_month < 1 or actual_month > 12:
        raise HTTPException(
            status_code=400,
            detail="Месяц должен быть числом от 1 до 12"
        )
    
    return await plan_value_service.recalculate_plan_with_actual(
        metric_id=metric_id,
        shop_id=shop_id,
        year=year,
        actual_month=actual_month,
        actual_value=actual_value,
        session=session
    ) 

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import ActualValue, ActualValueCreate, ActualValueUpdate, ActualValueWithRelations
from src.api.v1.endpoints.finance.utils import finances_db, actual_value_service

router = APIRouter()

@router.get("", response_model=List[ActualValue])
async def get_actual_values(
    metric_id: Optional[UUID] = None,
    shop_id: Optional[UUID] = None,
    period_id: Optional[UUID] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение списка фактических значений с фильтрацией.
    
    Args:
        metric_id: ID метрики для фильтрации
        shop_id: ID магазина для фильтрации
        period_id: ID периода для фильтрации
        skip: Смещение для пагинации
        limit: Ограничение для пагинации
    """
    if period_id:
        return await actual_value_service.get_by_period(period_id=period_id, session=session)
    elif shop_id:
        return await actual_value_service.get_by_shop(shop_id=shop_id, session=session)
    elif metric_id:
        return await actual_value_service.get_by_metric(metric_id=metric_id, session=session)
    else:
        return await actual_value_service.get_multi(session=session, skip=skip, limit=limit)

@router.post("", response_model=ActualValue)
async def create_actual_value(
    actual_value_in: ActualValueCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового фактического значения."""
    return await actual_value_service.create(actual_value_in, session=session)

@router.get("/{actual_value_id}", response_model=ActualValueWithRelations)
async def get_actual_value(
    actual_value_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение данных фактического значения по ID."""
    actual_value = await actual_value_service.get_with_relations(id=actual_value_id, session=session)
    if not actual_value:
        raise HTTPException(status_code=404, detail="Фактическое значение не найдено")
    return actual_value

@router.put("/{actual_value_id}", response_model=ActualValue)
async def update_actual_value(
    actual_value_id: UUID, 
    actual_value_in: ActualValueUpdate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Обновление данных фактического значения."""
    actual_value = await actual_value_service.get(id=actual_value_id, session=session)
    if not actual_value:
        raise HTTPException(status_code=404, detail="Фактическое значение не найдено")
    return await actual_value_service.update(id=actual_value_id, obj_in=actual_value_in, session=session)

@router.delete("/{actual_value_id}", status_code=200)
async def delete_actual_value(
    actual_value_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Удаление фактического значения."""
    actual_value = await actual_value_service.get(id=actual_value_id, session=session)
    if not actual_value:
        raise HTTPException(status_code=404, detail="Фактическое значение не найдено")
    result = await actual_value_service.delete(id=actual_value_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении фактического значения")
    return {"status": "success", "message": "Фактическое значение успешно удалено"} 

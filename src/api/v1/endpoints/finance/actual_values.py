from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import ActualValue, ActualValueCreate, ActualValueUpdate, ActualValueWithRelations
from src.api.v1.endpoints.finance.utils import finances_db, actual_value_service, period_service

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

@router.get("/by-period", response_model=List[ActualValue])
async def get_actual_values_by_period(
    metric_id: UUID,
    year: int,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    shop_id: Optional[UUID] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение фактических значений по параметрам периода.
    
    Args:
        metric_id: ID метрики
        year: Год
        month: Месяц (опционально)
        quarter: Квартал (опционально)
        shop_id: ID магазина (опционально)
    """
    try:
        # Проверяем валидные значения для month и quarter
        if month is not None and (month < 1 or month > 12):
            raise HTTPException(
                status_code=400,
                detail="Месяц должен быть числом от 1 до 12"
            )
            
        if quarter is not None and (quarter < 1 or quarter > 4):
            raise HTTPException(
                status_code=400,
                detail="Квартал должен быть числом от 1 до 4"
            )
        
        # Если указаны и месяц, и квартал одновременно, используем только месяц
        if month is not None and quarter is not None:
            quarter = None
        
        # Находим период по параметрам
        periods = await period_service.get_by_params(
            year=year, 
            month=month, 
            quarter=quarter, 
            session=session
        )
        
        if not periods:
            return []
        
        # Получаем фактические значения для найденных периодов
        result = []
        for period in periods:
            values = await actual_value_service.get_by_params_list(
                metric_id=metric_id,
                period_id=period.id,
                shop_id=shop_id,
                session=session
            )
            result.extend(values)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении фактических значений: {str(e)}")

@router.post("", response_model=ActualValue)
async def create_actual_value(
    actual_value_in: ActualValueCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового фактического значения."""
    return await actual_value_service.create(actual_value_in, session=session)

@router.post("/with-period", response_model=ActualValue)
async def create_actual_value_with_period(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    value: float,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Создание нового фактического значения с указанием параметров периода напрямую.
    
    Args:
        metric_id: ID метрики
        shop_id: ID магазина
        year: Год
        value: Значение
        month: Месяц (опционально)
        quarter: Квартал (опционально)
    """
    # Проверяем, существует ли период
    period = await period_service.get_or_create_by_params(
        year=year,
        month=month,
        quarter=quarter,
        session=session
    )
    
    # Создаем фактическое значение
    actual_value_in = ActualValueCreate(
        metric_id=metric_id,
        shop_id=shop_id,
        period_id=period.id,
        value=value
    )
    
    return await actual_value_service.create(actual_value_in, session=session)

@router.put("/by-period", response_model=ActualValue)
async def update_actual_value_by_period(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    value: float,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Обновление фактического значения по параметрам периода.
    
    Args:
        metric_id: ID метрики
        shop_id: ID магазина
        year: Год
        value: Новое значение
        month: Месяц (опционально)
        quarter: Квартал (опционально)
    """
    try:
        # Находим период
        period = await period_service.get_by_params_first(
            year=year,
            month=month,
            quarter=quarter,
            session=session
        )
        
        if not period:
            # Если период не найден, создаем новый
            period = await period_service.get_or_create_by_params(
                year=year,
                month=month,
                quarter=quarter,
                session=session
            )
        
        # Ищем существующее значение
        actual_values = await actual_value_service.get_by_params_list(
            metric_id=metric_id,
            period_id=period.id,
            shop_id=shop_id,
            session=session
        )
        
        if actual_values and len(actual_values) > 0:
            # Обновляем существующее значение
            actual_value_id = actual_values[0].id
            actual_value_update = ActualValueUpdate(value=value)
            return await actual_value_service.update(id=actual_value_id, obj_in=actual_value_update, session=session)
        else:
            # Создаем новое значение
            actual_value_create = ActualValueCreate(
                metric_id=metric_id,
                shop_id=shop_id,
                period_id=period.id,
                value=value
            )
            return await actual_value_service.create(actual_value_create, session=session)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Ошибка при обновлении фактического значения: {str(e)}"
        )

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

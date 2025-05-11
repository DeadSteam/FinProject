from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import PlanValue, PlanValueCreate, PlanValueUpdate, PlanValueWithRelations
from src.api.v1.endpoints.finance.utils import finances_db, plan_value_service, period_service

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

@router.get("/by-period", response_model=List[PlanValue])
async def get_plan_values_by_period(
    metric_id: UUID,
    year: int,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    shop_id: Optional[UUID] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение плановых значений по параметрам периода.
    
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
        
        # Получаем плановые значения для найденных периодов
        result = []
        for period in periods:
            values = await plan_value_service.get_by_params_list(
                metric_id=metric_id,
                period_id=period.id,
                shop_id=shop_id,
                session=session
            )
            result.extend(values)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при получении плановых значений: {str(e)}")

@router.post("", response_model=PlanValue)
async def create_plan_value(
    plan_value_in: PlanValueCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового планового значения."""
    return await plan_value_service.create(plan_value_in, session=session)

@router.post("/with-period", response_model=PlanValue)
async def create_plan_value_with_period(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    value: float,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Создание нового планового значения с указанием параметров периода напрямую.
    
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
    
    # Создаем плановое значение
    plan_value_in = PlanValueCreate(
        metric_id=metric_id,
        shop_id=shop_id,
        period_id=period.id,
        value=value
    )
    
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

@router.put("/by-period", response_model=PlanValue)
async def update_plan_value_by_period(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    value: float,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Обновление планового значения по параметрам периода.
    
    Args:
        metric_id: ID метрики
        shop_id: ID магазина
        year: Год
        value: Новое значение
        month: Месяц (опционально)
        quarter: Квартал (опционально)
    """
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
    plan_values = await plan_value_service.get_by_params(
        metric_id=metric_id,
        shop_id=shop_id,
        period_id=period.id,
        session=session
    )
    
    if plan_values and len(plan_values) > 0:
        # Обновляем существующее значение
        plan_value_id = plan_values[0].id
        plan_value_update = PlanValueUpdate(value=value)
        return await plan_value_service.update(id=plan_value_id, obj_in=plan_value_update, session=session)
    else:
        # Создаем новое значение
        plan_value_create = PlanValueCreate(
            metric_id=metric_id,
            shop_id=shop_id,
            period_id=period.id,
            value=value
        )
        return await plan_value_service.create(plan_value_create, session=session)

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

@router.delete("/by-period", status_code=200)
async def delete_plan_value_by_period(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    month: Optional[int] = None,
    quarter: Optional[int] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Удаление планового значения по параметрам периода.
    
    Args:
        metric_id: ID метрики
        shop_id: ID магазина
        year: Год
        month: Месяц (опционально)
        quarter: Квартал (опционально)
    """
    # Находим период
    period = await period_service.get_by_params_first(
        year=year,
        month=month,
        quarter=quarter,
        session=session
    )
    
    if not period:
        raise HTTPException(status_code=404, detail="Период не найден")
    
    # Ищем существующее значение
    plan_values = await plan_value_service.get_by_params(
        metric_id=metric_id,
        shop_id=shop_id,
        period_id=period.id,
        session=session
    )
    
    if not plan_values or len(plan_values) == 0:
        raise HTTPException(status_code=404, detail="Плановое значение не найдено")
    
    # Удаляем значение
    plan_value_id = plan_values[0].id
    result = await plan_value_service.delete(id=plan_value_id, session=session)
    
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении планового значения")
    
    return {"status": "success", "message": "Плановое значение успешно удалено"}

@router.post("/distribute-yearly", status_code=200)
async def distribute_yearly_plan(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    yearly_value: float,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Распределение годового плана по месяцам.
    
    Args:
        metric_id: ID метрики
        shop_id: ID магазина
        year: Год
        yearly_value: Годовое значение для распределения
    """
    return await plan_value_service.distribute_yearly_plan(
        metric_id=metric_id,
        shop_id=shop_id,
        year=year,
        yearly_value=yearly_value,
        session=session
    )

@router.post("/recalculate-with-actual", status_code=200)
async def recalculate_plan_with_actual(
    metric_id: UUID,
    shop_id: UUID,
    year: int,
    actual_month: int,
    actual_value: float,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Пересчет плановых значений на основе фактического значения.
    
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
    
    try:
        # Преобразуем float в Decimal для метода сервиса
        decimal_value = Decimal(str(actual_value))  # Безопасное преобразование через строку
        
        return await plan_value_service.recalculate_plan_with_actual(
            metric_id=metric_id,
            shop_id=shop_id,
            year=year,
            actual_month=actual_month,
            actual_value=decimal_value,
            session=session
        )
    except Exception as e:
        # Логируем ошибку и возвращаем понятное сообщение
        print(f"Ошибка при пересчете плана: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при пересчете плана: {str(e)}"
        ) 
 
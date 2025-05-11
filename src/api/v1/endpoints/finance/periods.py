from typing import List, Optional, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import Period, PeriodCreate, PeriodUpdate
from src.api.v1.endpoints.finance.utils import finances_db, period_service

router = APIRouter()

@router.get("", response_model=List[Period])
async def get_periods(
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    period_type: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение списка периодов с фильтрацией.
    
    Args:
        year: Год для фильтрации
        quarter: Квартал для фильтрации
        month: Месяц для фильтрации
        period_type: Тип периода (year, quarter, month)
        skip: Смещение для пагинации
        limit: Ограничение для пагинации
    """
    # Если указан тип периода, используем специальный метод для получения
    if period_type:
        # Проверяем валидность типа периода
        valid_types = ["year", "quarter", "month"]
        if period_type not in valid_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Неверный тип периода. Допустимые значения: {', '.join(valid_types)}"
            )
            
        return await period_service.get_by_type(
            session=session,
            period_type=period_type,
            year=year,
            quarter=quarter,
            skip=skip,
            limit=limit
        )
    
    # Иначе получаем все периоды
    return await period_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/grouped", response_model=Dict[str, List[Period]])
async def get_periods_grouped(
    year: Optional[int] = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """
    Получение периодов, сгруппированных по типам (год, квартал, месяц).
    
    Args:
        year: Год для фильтрации
    """
    return await period_service.get_periods_grouped_by_type(session=session, year=year)

@router.post("", response_model=Period)
async def create_period(
    period_in: PeriodCreate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового периода."""
    return await period_service.create(period_in, session=session)

@router.get("/{period_id}", response_model=Period)
async def get_period(
    period_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение данных периода по ID."""
    period = await period_service.get(id=period_id, session=session)
    if not period:
        raise HTTPException(status_code=404, detail="Период не найден")
    return period

@router.put("/{period_id}", response_model=Period)
async def update_period(
    period_id: UUID, 
    period_in: PeriodUpdate, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Обновление данных периода."""
    period = await period_service.get(id=period_id, session=session)
    if not period:
        raise HTTPException(status_code=404, detail="Период не найден")
    return await period_service.update(id=period_id, obj_in=period_in, session=session)

@router.delete("/{period_id}", status_code=200)
async def delete_period(
    period_id: UUID, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Удаление периода."""
    period = await period_service.get(id=period_id, session=session)
    if not period:
        raise HTTPException(status_code=404, detail="Период не найден")
    result = await period_service.delete(id=period_id, session=session)
    if not result:
        raise HTTPException(status_code=500, detail="Ошибка при удалении периода")
    return {"status": "success", "message": "Период успешно удален"} 

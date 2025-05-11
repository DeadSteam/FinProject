from typing import List, Optional, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.scheme.finance import Period, PeriodCreate, PeriodUpdate
from src.api.v1.endpoints.finance.utils import finances_db, period_service
from src.repository import finances_db
from src.service.finance.period import PeriodService
from src.scheme.finance import Period as PeriodSchema

router = APIRouter()
period_service = PeriodService()

@router.get("", response_model=List[PeriodSchema])
async def get_periods(
    skip: int = 0, 
    limit: int = 100, 
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка всех периодов."""
    return await period_service.get_multi(session=session, skip=skip, limit=limit)

@router.get("/grouped", response_model=Dict[str, List[PeriodSchema]])
async def get_periods_grouped_by_type(
    year: int = None,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение периодов, сгруппированных по типу (годы, кварталы, месяцы)."""
    return await period_service.get_periods_grouped_by_type(session=session, year=year)

@router.get("/years", response_model=List[int])
async def get_available_years(
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка всех доступных годов."""
    return await period_service.get_available_years(session=session)

@router.post("/years/{year}/init", response_model=Dict[str, List[PeriodSchema]])
async def initialize_year_periods(
    year: int,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание периодов для года (год, кварталы, месяцы)."""
    return await period_service.create_periods_for_year(year=year, session=session)

@router.get("/by-year/{year}", response_model=List[PeriodSchema])
async def get_periods_by_year(
    year: int,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение всех периодов для указанного года."""
    periods = await period_service.get_by_year(year=year, session=session)
    return [PeriodSchema.model_validate(period) for period in periods]

@router.get("/current", response_model=PeriodSchema)
async def get_current_period(
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение текущего периода."""
    period = await period_service.get_current_period(session=session)
    if not period:
        raise HTTPException(status_code=404, detail="Текущий период не найден")
    return PeriodSchema.model_validate(period)

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

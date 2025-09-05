from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, distinct

from src.model.finance.period import Period as PeriodModel
from src.repository import finances_db

router = APIRouter()

@router.get("", response_model=List[dict])
async def get_years(
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Получение списка всех годов."""
    try:
        # Получаем уникальные годы
        stmt = select(distinct(PeriodModel.year)).order_by(desc(PeriodModel.year))
        result = await session.execute(stmt)
        years_data = result.scalars().all()
        
        years = []
        for year in years_data:
            years.append({
                'id': f"year-{year}",  # Создаем ID для года
                'year': year,
                'is_active': True
            })
        
        return years
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении годов: {str(e)}"
        )

@router.post("", response_model=dict)
async def create_year(
    year_data: dict,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Создание нового года."""
    try:
        year_value = year_data.get('year')
        if not year_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поле 'year' обязательно"
            )
        
        # Проверяем, существует ли уже такой год
        stmt = select(PeriodModel).where(PeriodModel.year == year_value).limit(1)
        result = await session.execute(stmt)
        existing_period = result.scalar_one_or_none()
        
        if existing_period:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Год {year_value} уже существует"
            )
        
        # Создаем новый период для года (только год, без кварталов и месяцев)
        new_period = PeriodModel(
            year=year_value,
            quarter=None,
            month=None
        )
        
        session.add(new_period)
        await session.commit()
        await session.refresh(new_period)
        
        return {
            'id': str(new_period.id),
            'year': new_period.year,
            'is_active': True
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании года: {str(e)}"
        )

@router.put("/{year_id}", response_model=dict)
async def update_year(
    year_id: str,
    year_data: dict,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Обновление года."""
    try:
        # Парсим ID года
        if year_id.startswith("year-"):
            old_year = int(year_id.split("-")[1])
        else:
            old_year = int(year_id)
        
        stmt = select(PeriodModel).where(
            PeriodModel.year == old_year,
            PeriodModel.quarter.is_(None),
            PeriodModel.month.is_(None)
        ).limit(1)
        result = await session.execute(stmt)
        period = result.scalar_one_or_none()
        
        if not period:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Год не найден"
            )
        
        # Обновляем поля
        if 'year' in year_data:
            period.year = year_data['year']
        
        await session.commit()
        await session.refresh(period)
        
        return {
            'id': str(period.id),
            'year': period.year,
            'is_active': True
        }
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении года: {str(e)}"
        )

@router.delete("/{year_id}")
async def delete_year(
    year_id: str,
    session: AsyncSession = Depends(finances_db.get_session)
):
    """Удаление года."""
    try:
        # Парсим ID года
        if year_id.startswith("year-"):
            year_value = int(year_id.split("-")[1])
        else:
            year_value = int(year_id)
        
        # Удаляем все периоды для этого года
        stmt = select(PeriodModel).where(PeriodModel.year == year_value)
        result = await session.execute(stmt)
        periods = result.scalars().all()
        
        if not periods:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Год не найден"
            )
        
        for period in periods:
            await session.delete(period)
        
        await session.commit()
        
        return {"success": True, "message": "Год успешно удален"}
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении года: {str(e)}"
        ) 
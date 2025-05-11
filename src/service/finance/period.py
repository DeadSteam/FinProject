import uuid
from typing import Optional, List, Dict
from datetime import datetime

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import TypeAdapter

from src.repository import finances_db
from src.model.finance import Period
from src.scheme.finance import Period as PeriodSchema, PeriodCreate, PeriodUpdate
from src.service.base import BaseService


class PeriodService(BaseService[Period, PeriodSchema, PeriodCreate, PeriodUpdate]):
    """Сервис для работы с периодами."""
    
    def __init__(self):
        super().__init__(finances_db, Period, PeriodSchema)
    
    async def get_by_year_quarter_month(
        self, year: int, session: AsyncSession, quarter: Optional[int] = None, month: Optional[int] = None
    ) -> Optional[PeriodSchema]:
        """Получение периода по году, кварталу и месяцу."""
        conditions = [self.model.year == year]
        
        if quarter is not None:
            conditions.append(self.model.quarter == quarter)
        else:
            conditions.append(self.model.quarter.is_(None))
            
        if month is not None:
            conditions.append(self.model.month == month)
        else:
            conditions.append(self.model.month.is_(None))
        
        query = select(self.model).where(and_(*conditions))
        result = await session.execute(query)
        # Используем first() вместо scalar_one_or_none() для защиты от дубликатов
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
        
            
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
    async def get_by_type(
        self, year: int, period_type: str, session: AsyncSession
    ) -> Optional[Period]:
        """
        Получение периода определенного типа (year, quarter, month) по году.
        
        Args:
            year: Год для поиска периода
            period_type: Тип периода ("year", "quarter", "month")
            session: Сессия БД
            
        Returns:
            Период заданного типа или None, если не найден
        """
        conditions = [self.model.year == year]
        
        if period_type == "year":
            conditions.append(self.model.quarter.is_(None))
            conditions.append(self.model.month.is_(None))
        elif period_type == "quarter":
            conditions.append(self.model.quarter.isnot(None))
            conditions.append(self.model.month.is_(None))
        elif period_type == "month":
            conditions.append(self.model.month.isnot(None))
        else:
            raise ValueError(f"Неизвестный тип периода: {period_type}")
        
        query = select(self.model).where(and_(*conditions))
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_or_create(
        self, year: int, session: AsyncSession, quarter: Optional[int] = None, month: Optional[int] = None
    ) -> PeriodSchema:
        """
        Получение или создание периода.
        
        Этот метод устарел, используйте get_or_create_by_params.
        
        Args:
            year: Год для поиска/создания периода
            session: Сессия БД
            quarter: Квартал для поиска/создания периода (опционально)
            month: Месяц для поиска/создания периода (опционально)
        
        Returns:
            Найденный или созданный период
        """
        return await self.get_or_create_by_params(
            year=year,
            month=month,
            quarter=quarter,
            session=session
        )
    
    async def get_periods_grouped_by_type(
        self, 
        session: AsyncSession,
        year: Optional[int] = None
    ) -> Dict[str, List[PeriodSchema]]:
        """
        Получение периодов, сгруппированных по типу (год, квартал, месяц).
        
        Args:
            session: Сессия БД
            year: Год для фильтрации периодов (опционально)
            
        Returns:
            Словарь с периодами, сгруппированными по типам
        """
        # Базовое условие фильтрации
        conditions = []
        if year is not None:
            conditions.append(self.model.year == year)
        
        # Получаем все периоды
        query = select(self.model)
        if conditions:
            query = query.where(and_(*conditions))
            
        result = await session.execute(query)
        periods = result.scalars().all()
        
        # Группируем периоды по типу
        grouped_periods = {
            "years": [],
            "quarters": [],
            "months": []
        }
        
        for period in periods:
            period_schema = TypeAdapter(self.schema).validate_python(period.__dict__)
            
            if period.quarter is None and period.month is None:
                # Годовой период
                grouped_periods["years"].append(period_schema)
            elif period.month is None:
                # Квартальный период
                grouped_periods["quarters"].append(period_schema)
            else:
                # Месячный период
                grouped_periods["months"].append(period_schema)
        
        return grouped_periods

    async def get_current_period(self, session: AsyncSession) -> Optional[Period]:
        """
        Получение текущего периода (текущий месяц текущего года).
        
        Args:
            session: Сессия БД
            
        Returns:
            Текущий период или None, если период не найден
        """
        # Получаем текущую дату
        now = datetime.now()
        year = now.year
        month = now.month
        
        # Определяем квартал
        quarter = (month - 1) // 3 + 1
        
        # Пробуем найти месячный период
        period = await self.get_by_year_quarter_month(year, session, quarter, month)
        if period:
            # Получаем объект модели, а не схему
            query = select(self.model).where(self.model.id == period.id)
            result = await session.execute(query)
            return result.scalar_one_or_none()
            
        # Пробуем найти квартальный период
        period = await self.get_by_year_quarter_month(year, session, quarter, None)
        if period:
            query = select(self.model).where(self.model.id == period.id)
            result = await session.execute(query)
            return result.scalar_one_or_none()
            
        # Пробуем найти годовой период
        period = await self.get_by_year_quarter_month(year, session, None, None)
        if period:
            query = select(self.model).where(self.model.id == period.id)
            result = await session.execute(query)
            return result.scalar_one_or_none()
        
        return None
    
    async def get_by_year(self, year: int, session: AsyncSession) -> List[Period]:
        """
        Получение всех периодов для указанного года.
        
        Args:
            year: Год для поиска периодов
            session: Сессия БД
            
        Returns:
            Список периодов для указанного года
        """
        query = select(self.model).where(self.model.year == year)
        result = await session.execute(query)
        return list(result.scalars().all())

    async def get_periods_by_type(
        self, 
        session: AsyncSession, 
        period_type: str,
        year: Optional[int] = None,
        quarter: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PeriodSchema]:
        """Получение периодов по типу (год, квартал, месяц)."""
        conditions = []
        
        if year is not None:
            conditions.append(self.model.year == year)
        
        if period_type == "year":
            conditions.append(self.model.quarter.is_(None))
            conditions.append(self.model.month.is_(None))
        elif period_type == "quarter":
            conditions.append(self.model.quarter.isnot(None))
            conditions.append(self.model.month.is_(None))
            if quarter is not None:
                conditions.append(self.model.quarter == quarter)
        elif period_type == "month":
            conditions.append(self.model.month.isnot(None))
        
        query = select(self.model).where(and_(*conditions)).offset(skip).limit(limit)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]

    async def get_by_params(
        self, 
        year: int, 
        session: AsyncSession, 
        month: Optional[int] = None, 
        quarter: Optional[int] = None
    ) -> List[PeriodSchema]:
        """
        Получение списка периодов по параметрам года, месяца и квартала.
        
        Args:
            year: Год для поиска
            session: Сессия БД
            month: Месяц (опционально)
            quarter: Квартал (опционально)
            
        Returns:
            Список найденных периодов
        """
        conditions = [self.model.year == year]
        
        if month is not None:
            conditions.append(self.model.month == month)
        elif quarter is not None:
            conditions.append(self.model.quarter == quarter)
            conditions.append(self.model.month.is_(None))
        
        query = select(self.model).where(and_(*conditions))
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
        
    async def get_by_params_first(
        self, 
        year: int, 
        session: AsyncSession, 
        month: Optional[int] = None, 
        quarter: Optional[int] = None
    ) -> Optional[PeriodSchema]:
        """
        Получение первого найденного периода по параметрам года, месяца и квартала.
        
        Args:
            year: Год для поиска
            session: Сессия БД
            month: Месяц (опционально)
            quarter: Квартал (опционально)
            
        Returns:
            Найденный период или None
        """
        periods = await self.get_by_params(
            year=year,
            month=month,
            quarter=quarter,
            session=session
        )
        
        if not periods:
            return None
            
        return periods[0]
        
    async def get_or_create_by_params(
        self, 
        year: int, 
        session: AsyncSession, 
        month: Optional[int] = None, 
        quarter: Optional[int] = None
    ) -> PeriodSchema:
        """
        Получение или создание периода по параметрам.
        
        Args:
            year: Год для поиска/создания
            session: Сессия БД
            month: Месяц (опционально)
            quarter: Квартал (опционально)
            
        Returns:
            Найденный или созданный период
        """
        period = await self.get_by_params_first(
            year=year,
            month=month,
            quarter=quarter,
            session=session
        )
        
        if period:
            return period
            
        # Создаем новый период
        period_data = {
            "year": year,
            "month": month,
            "quarter": quarter
        }
        
        period_in = PeriodCreate(**period_data)
        return await self.create(period_in, session=session) 
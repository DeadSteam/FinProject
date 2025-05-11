import uuid
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import TypeAdapter

from src.repository import finances_db
from src.model.finance.plan_value import PlanValue
from src.model.finance.period import Period
from src.scheme.finance.plan_value import (
    PlanValue as PlanValueSchema, 
    PlanValueWithRelations, 
    PlanValueCreate, 
    PlanValueUpdate
)
from src.service.base import BaseService
from src.service.finance.period import PeriodService


class PlanValueService(BaseService[PlanValue, PlanValueSchema, PlanValueCreate, PlanValueUpdate]):
    """Сервис для работы с плановыми значениями."""
    
    def __init__(self):
        super().__init__(finances_db, PlanValue, PlanValueSchema)
        self.period_service = PeriodService()
    
    async def distribute_yearly_plan(
        self,
        metric_id: uuid.UUID,
        shop_id: uuid.UUID,
        year: int,
        yearly_value: Decimal,
        session: AsyncSession
    ) -> List[PlanValueSchema]:
        """
        Распределение годового плана по месяцам и кварталам.
        
        Вычисляет планы для каждого месяца, квартала и года на основе годового
        значения с равномерным распределением.
        
        Args:
            metric_id: ID метрики
            shop_id: ID магазина
            year: Год для распределения
            yearly_value: Годовое значение
            session: Сессия БД
            
        Returns:
            Список созданных/обновленных плановых значений
        """
        result_plans = []
        
        # Получаем или создаем период для года
        year_period = await self.period_service.get_by_year_quarter_month(
            year=year, 
            session=session,
            quarter=None,  # Годовой период не имеет квартала
            month=None     # Годовой период не имеет месяца
        )
        
        if not year_period:
            # Если годовой период не найден, создаем его
            year_period = await self.period_service.get_or_create_by_params(
                year=year,
                month=None,
                quarter=None,
                session=session
            )
        
        # Проверяем, существует ли уже годовое плановое значение
        year_plan = await self.get_by_metric_shop_period(metric_id, shop_id, year_period.id, session)
        
        if year_plan:
            # Обновляем существующее значение
            year_plan_update = PlanValueUpdate(value=yearly_value)
            updated_plan = await self.update(year_plan.id, year_plan_update, session)
            result_plans.append(updated_plan)
        else:
            # Создаем новое значение для года
            year_plan_create = PlanValueCreate(
                metric_id=metric_id,
                shop_id=shop_id,
                period_id=year_period.id,
                value=yearly_value
            )
            created_plan = await self.create(year_plan_create, session)
            result_plans.append(created_plan)
            
        # Распределяем значение по кварталам
        quarterly_value = round(yearly_value / 4, 2)
        
        # Общий остаток для компенсации округления
        remaining = yearly_value - (quarterly_value * 4)
        
        for quarter in range(1, 5):
            # Для последнего квартала добавляем остаток
            current_value = quarterly_value
            if quarter == 4:
                current_value += remaining
                
            # Получаем или создаем период для квартала
            quarter_period = await self.period_service.get_or_create(year, session, quarter=quarter)
            
            # Проверяем, существует ли уже квартальное плановое значение
            quarter_plan = await self.get_by_metric_shop_period(metric_id, shop_id, quarter_period.id, session)
            
            if quarter_plan:
                # Обновляем существующее значение
                quarter_plan_update = PlanValueUpdate(value=current_value)
                updated_plan = await self.update(quarter_plan.id, quarter_plan_update, session)
                result_plans.append(updated_plan)
            else:
                # Создаем новое значение для квартала
                quarter_plan_create = PlanValueCreate(
                    metric_id=metric_id,
                    shop_id=shop_id,
                    period_id=quarter_period.id,
                    value=current_value
                )
                created_plan = await self.create(quarter_plan_create, session)
                result_plans.append(created_plan)
                
            # Распределяем значение по месяцам в текущем квартале
            monthly_value = round(current_value / 3, 2)
            
            # Остаток для месяцев
            month_remaining = current_value - (monthly_value * 3)
            
            for i in range(3):
                month = (quarter - 1) * 3 + i + 1
                
                # Для последнего месяца в квартале добавляем остаток
                current_month_value = monthly_value
                if i == 2:
                    current_month_value += month_remaining
                    
                # Получаем или создаем период для месяца
                month_period = await self.period_service.get_or_create(year, session, quarter=quarter, month=month)
                
                # Проверяем, существует ли уже месячное плановое значение
                month_plan = await self.get_by_metric_shop_period(metric_id, shop_id, month_period.id, session)
                
                if month_plan:
                    # Обновляем существующее значение
                    month_plan_update = PlanValueUpdate(value=current_month_value)
                    updated_plan = await self.update(month_plan.id, month_plan_update, session)
                    result_plans.append(updated_plan)
                else:
                    # Создаем новое значение для месяца
                    month_plan_create = PlanValueCreate(
                        metric_id=metric_id,
                        shop_id=shop_id,
                        period_id=month_period.id,
                        value=current_month_value
                    )
                    created_plan = await self.create(month_plan_create, session)
                    result_plans.append(created_plan)
                    
        return result_plans
    
    async def get_with_relations(self, id: uuid.UUID, session: AsyncSession) -> Optional[PlanValueWithRelations]:
        """Получение планового значения с отношениями."""
        query = (
            select(self.model)
            .options(
                selectinload(self.model.metric),
                selectinload(self.model.shop),
                selectinload(self.model.period)
            )
            .where(self.model.id == id)
        )
        result = await session.execute(query)
        db_obj = result.scalar_one_or_none()
        
        if not db_obj:
            return None
            
        # Преобразуем объект модели в словарь
        obj_dict = db_obj.__dict__.copy()
        
        # Добавляем данные из отношений
        if db_obj.metric:
            obj_dict["metric"] = db_obj.metric.__dict__
        if db_obj.shop:
            obj_dict["shop"] = db_obj.shop.__dict__
        if db_obj.period:
            obj_dict["period"] = db_obj.period.__dict__
            
        return TypeAdapter(PlanValueWithRelations).validate_python(obj_dict)
    
    async def get_by_metric_shop_period(
        self, metric_id: uuid.UUID, shop_id: uuid.UUID, period_id: uuid.UUID, session: AsyncSession
    ) -> Optional[PlanValueSchema]:
        """Получение планового значения по метрике, магазину и периоду."""
        # Используем функцию get_by_params для получения объекта модели
        db_obj = await self.get_by_params(metric_id, shop_id, period_id, session)
        
        if not db_obj:
            return None
            
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
    async def get_by_period(self, period_id: uuid.UUID, session: AsyncSession) -> List[PlanValueSchema]:
        """Получение всех плановых значений для периода."""
        query = select(self.model).where(self.model.period_id == period_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_shop(self, shop_id: uuid.UUID, session: AsyncSession) -> List[PlanValueSchema]:
        """Получение всех плановых значений для магазина."""
        query = select(self.model).where(self.model.shop_id == shop_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_metric(self, metric_id: uuid.UUID, session: AsyncSession) -> List[PlanValueSchema]:
        """Получение всех плановых значений для метрики."""
        query = select(self.model).where(self.model.metric_id == metric_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def recalculate_plan_with_actual(
        self,
        metric_id: uuid.UUID,
        shop_id: uuid.UUID,
        year: int,
        actual_month: int,
        actual_value: Decimal,
        session: AsyncSession
    ) -> List[PlanValueSchema]:
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
            session: Сессия БД
            
        Returns:
            Список обновленных плановых значений
        """
        # Получаем текущую дату для определения текущего месяца
        now = datetime.now()
        current_month = now.month if now.year == year else 1
        
        # Находим годовой период
        year_period = await self.period_service.get_by_year_quarter_month(
            year=year, 
            session=session,
            quarter=None,  # Годовой период не имеет квартала
            month=None     # Годовой период не имеет месяца
        )
        
        if not year_period:
            # Если годовой период не найден, создаем его
            year_period = await self.period_service.get_or_create_by_params(
                year=year,
                month=None,
                quarter=None,
                session=session
            )
        
        # Получаем годовое плановое значение
        year_plan = await self.get_by_metric_shop_period(metric_id, shop_id, year_period.id, session)
        
        if not year_plan:
            # Если годовой план не найден, возвращаем пустой список
            return []
            
        yearly_value = year_plan.value
        updated_plans = []
        
        # Определяем квартал для месяца
        quarter = (actual_month - 1) // 3 + 1
        
        # Получаем все периоды для года
        year_periods = await self.period_service.get_by_year(year, session)
        
        # Создаем словари для периодов и планов
        month_periods = {}
        quarter_periods = {}
        month_plans = {}
        quarter_plans = {}
        
        # Распределяем периоды по типам и получаем планы
        for period in year_periods:
            if period.month is not None:
                # Это месячный период
                month_periods[period.month] = period
                # Получаем план для месяца
                plan = await self.get_by_metric_shop_period(metric_id, shop_id, period.id, session)
                if plan:
                    month_plans[period.month] = plan
            elif period.quarter is not None:
                # Это квартальный период
                quarter_periods[period.quarter] = period
                # Получаем план для квартала
                plan = await self.get_by_metric_shop_period(metric_id, shop_id, period.id, session)
                if plan:
                    quarter_plans[period.quarter] = plan
        
        # Обновляем план для месяца с фактическим значением
        if actual_month in month_periods and actual_month in month_plans:
            month_plan = month_plans[actual_month]
            month_plan_update = PlanValueUpdate(value=actual_value)
            updated_plan = await self.update(month_plan.id, month_plan_update, session)
            updated_plans.append(updated_plan)
            
            # Рассчитываем разницу между планом и фактом
            diff = actual_value - month_plan.value
        else:
            diff = Decimal('0')
            
        # Если месяц с фактическим значением уже прошел, корректируем планы для будущих месяцев
        if actual_month < current_month:
            # Подсчитываем сумму планов для месяцев после указанного до текущего
            sum_past_plans = Decimal('0')
            for month in range(actual_month + 1, current_month):
                if month in month_plans:
                    sum_past_plans += month_plans[month].value
                    
            # Корректируем разницу на сумму прошедших планов
            diff += sum_past_plans
        
        # Получаем список месяцев, для которых нужно скорректировать план
        future_months = [m for m in range(max(actual_month + 1, current_month), 13)]
        
        if not future_months:
            # Если нет будущих месяцев, просто возвращаем обновленный план для месяца с фактом
            return updated_plans
            
        # Распределяем разницу по оставшимся месяцам
        adjustment_per_month = round(diff / len(future_months), 2)
        
        # Остаток от округления
        remaining = diff - (adjustment_per_month * len(future_months))
        
        # Обновляем планы для будущих месяцев
        for i, month in enumerate(future_months):
            if month in month_periods and month in month_plans:
                # У нас есть и период, и план для месяца
                month_plan = month_plans[month]
                
                # Вычисляем новое значение
                new_value = month_plan.value - adjustment_per_month
                
                # Для последнего месяца добавляем остаток
                if i == len(future_months) - 1:
                    new_value -= remaining
                    
                # Проверяем, что значение не отрицательное
                if new_value < 0:
                    new_value = Decimal('0')
                    
                # Обновляем план
                month_plan_update = PlanValueUpdate(value=new_value)
                updated_plan = await self.update(month_plan.id, month_plan_update, session)
                updated_plans.append(updated_plan)
                
        # Обновляем квартальные планы
        for q in range(1, 5):
            if q in quarter_periods and q in quarter_plans:
                # Определяем месяцы в квартале
                quarter_months = [m for m in range((q-1)*3+1, q*3+1)]
                
                # Считаем сумму месячных планов
                sum_month_plans = Decimal('0')
                for month in quarter_months:
                    if month in month_plans:
                        # Если это месяцы до текущего, берем факт для месяца с фактом
                        if month == actual_month:
                            sum_month_plans += actual_value
                        else:
                            sum_month_plans += month_plans[month].value
                            
                # Обновляем квартальный план
                quarter_plan = quarter_plans[q]
                quarter_plan_update = PlanValueUpdate(value=sum_month_plans)
                updated_plan = await self.update(quarter_plan.id, quarter_plan_update, session)
                updated_plans.append(updated_plan)
                
        # Обновляем годовой план
        # Считаем сумму квартальных планов
        sum_quarter_plans = Decimal('0')
        for q in range(1, 5):
            if q in quarter_plans:
                sum_quarter_plans += quarter_plans[q].value
                
        # Если сумма квартальных планов отличается от годового, обновляем годовой
        if sum_quarter_plans != yearly_value:
            year_plan_update = PlanValueUpdate(value=sum_quarter_plans)
            updated_plan = await self.update(year_plan.id, year_plan_update, session)
            updated_plans.append(updated_plan)
        
        return updated_plans
    
    async def get_by_params(
        self, metric_id: uuid.UUID, shop_id: uuid.UUID, period_id: uuid.UUID, session: AsyncSession
    ) -> Optional[PlanValue]:
        """Получение планового значения по параметрам."""
        query = select(self.model).where(
            and_(
                self.model.metric_id == metric_id,
                self.model.shop_id == shop_id,
                self.model.period_id == period_id
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_params_list(
        self, 
        metric_id: uuid.UUID, 
        period_id: uuid.UUID, 
        session: AsyncSession,
        shop_id: Optional[uuid.UUID] = None
    ) -> List[PlanValueSchema]:
        """
        Получение списка плановых значений по параметрам.
        
        Args:
            metric_id: ID метрики
            period_id: ID периода
            session: Сессия БД
            shop_id: ID магазина (опционально)
            
        Returns:
            Список плановых значений, подходящих под условия
        """
        conditions = [
            self.model.metric_id == metric_id,
            self.model.period_id == period_id
        ]
        
        if shop_id is not None:
            conditions.append(self.model.shop_id == shop_id)
        
        query = select(self.model).where(and_(*conditions))
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs] 
import uuid
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import TypeAdapter

from src.repository import finances_db
from src.model.finance import Metric, Category, ActualValue, PlanValue, Period
from src.scheme.finance import (
    Metric as MetricSchema, 
    MetricWithCategory, 
    MetricCreate, 
    MetricUpdate
)
from src.service.base import BaseService


class MetricService(BaseService[Metric, MetricSchema, MetricCreate, MetricUpdate]):
    """Сервис для работы с метриками."""
    
    def __init__(self):
        super().__init__(finances_db, Metric, MetricSchema)
    
    async def get_with_relations(self, id: uuid.UUID, session: AsyncSession) -> Optional[MetricWithCategory]:
        """Получение метрики с категорией по ID."""
        query = (
            select(self.model)
            .options(selectinload(self.model.category))
            .where(self.model.id == id)
        )
        
        result = await session.execute(query)
        metric = result.scalars().first()
        
        if not metric:
            return None
        
        # Создаем базовые данные метрики без поля category
        metric_data = {
            "id": metric.id,
            "name": metric.name,
            "category_id": metric.category_id,
            "unit": metric.unit
        }
        
        # Добавляем данные категории, если она есть
        if metric.category:
            category_data = {
                "id": metric.category.id,
                "name": metric.category.name,
                "description": metric.category.description,
                "image_id": metric.category.image_id,
                "status": metric.category.status
            }
            return MetricWithCategory(**metric_data, category=category_data)
        else:
            return MetricWithCategory(**metric_data, category=None)
    
    async def get_by_category(self, category_id: uuid.UUID, session: AsyncSession) -> List[MetricSchema]:
        """Получение всех метрик для указанной категории."""
        query = select(self.model).where(self.model.category_id == category_id)
        result = await session.execute(query)
        metrics = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(metric.__dict__) for metric in metrics]
    
    async def get_metrics_by_filters(
        self,
        session: AsyncSession,
        category_id: Optional[uuid.UUID] = None,
        store_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MetricSchema]:
        """
        Получение метрик по фильтрам.
        
        Args:
            session: Сессия БД
            category_id: ID категории для фильтрации
            store_id: ID магазина для фильтрации
            skip: Смещение для пагинации
            limit: Ограничение для пагинации
            
        Returns:
            Список метрик, соответствующих критериям фильтрации
        """
        conditions = []
        
        # Фильтр по категории
        if category_id:
            conditions.append(self.model.category_id == category_id)
        
        # Сначала строим базовый запрос с фильтрами по категории
        query = select(self.model).distinct()
        
        # Применяем фильтры по категории
        if conditions:
            query = query.where(and_(*conditions))
        
        # Если указан магазин, выбираем только метрики, для которых есть значения в этом магазине
        if store_id:
            # Подзапрос для получения metric_id, которые используются в plan_values или actual_values
            # для указанного магазина
            plan_subquery = (
                select(PlanValue.metric_id)
                .where(PlanValue.shop_id == store_id)
                .distinct()
            )
            
            actual_subquery = (
                select(ActualValue.metric_id)
                .where(ActualValue.shop_id == store_id)
                .distinct()
            )
            
            # Добавляем фильтр к основному запросу
            query = query.where(
                or_(
                    self.model.id.in_(plan_subquery),
                    self.model.id.in_(actual_subquery)
                )
            )
        
        # Добавляем пагинацию
        query = query.offset(skip).limit(limit)
        
        # Выполняем запрос
        result = await session.execute(query)
        metrics = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(metric.__dict__) for metric in metrics]
    
    async def get_by_name_and_category(
        self, name: str, category_id: uuid.UUID, session: AsyncSession
    ) -> Optional[MetricSchema]:
        """Получение метрики по имени и категории."""
        query = select(self.model).where(
            and_(
                self.model.name == name,
                self.model.category_id == category_id
            )
        )
        result = await session.execute(query)
        metric = result.scalars().first()
        
        if not metric:
            return None
        
        return TypeAdapter(self.schema).validate_python(metric.__dict__)
    
    async def search_metrics(
        self,
        session: AsyncSession,
        search: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MetricSchema]:
        """
        Поиск метрик по параметрам.
        
        Args:
            session: Сессия БД
            search: Поисковый запрос для фильтрации по имени
            category_id: ID категории для фильтрации
            skip: Смещение для пагинации
            limit: Ограничение для пагинации
            
        Returns:
            Список метрик, соответствующих критериям поиска
        """
        conditions = []
        
        # Фильтр по поисковому запросу
        if search:
            conditions.append(or_(
                self.model.name.ilike(f"%{search}%"),
                self.model.unit.ilike(f"%{search}%")
            ))
        
        # Фильтр по категории
        if category_id:
            conditions.append(self.model.category_id == category_id)
        
        # Сборка запроса
        query = select(self.model)
        if conditions:
            query = query.where(and_(*conditions))
        
        # Добавление пагинации
        query = query.offset(skip).limit(limit)
        
        # Выполнение запроса
        result = await session.execute(query)
        metrics = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(metric.__dict__) for metric in metrics]

    async def get_metrics_with_values_for_charts(
        self,
        session: AsyncSession,
        shop_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        year: int = None
    ) -> List[Dict]:
        """
        Получение метрик с агрегированными данными (плановыми и фактическими значениями) для построения графиков.
        
        Args:
            session: Сессия БД
            shop_id: ID магазина для фильтрации данных
            category_id: ID категории для фильтрации метрик
            year: Год для фильтрации периодов
        
        Returns:
            Список метрик с агрегированными данными
        """
        # Если год не указан, используем текущий
        if year is None:
            year = datetime.now().year
            
        # Получаем метрики, соответствующие критериям фильтрации
        metrics = await self.get_metrics_by_filters(
            session=session,
            category_id=category_id,
            store_id=shop_id,
            limit=500  # Увеличиваем лимит для получения всех метрик
        )
        
        # Получаем все периоды для указанного года
        query_periods = select(Period).where(Period.year == year)
        result_periods = await session.execute(query_periods)
        periods = result_periods.scalars().all()
        
        # Создаем карту для быстрого доступа к периодам
        period_map = {period.id: period for period in periods}
        
        # Результирующий список метрик с данными
        result = []
        
        # Проходим по всем метрикам
        for metric in metrics:
            metric_id = metric.id
            
            # Получаем фактические значения для метрики и фильтров
            query_actual = select(ActualValue).where(ActualValue.metric_id == metric_id)
            if shop_id:
                query_actual = query_actual.where(ActualValue.shop_id == shop_id)
            result_actual = await session.execute(query_actual)
            actual_values = result_actual.scalars().all()
            
            # Получаем плановые значения для метрики и фильтров
            query_plan = select(PlanValue).where(PlanValue.metric_id == metric_id)
            if shop_id:
                query_plan = query_plan.where(PlanValue.shop_id == shop_id)
            result_plan = await session.execute(query_plan)
            plan_values = result_plan.scalars().all()
            
            # Фильтруем значения по периодам
            actual_values = [av for av in actual_values if av.period_id in period_map]
            plan_values = [pv for pv in plan_values if pv.period_id in period_map]
            
            # Если данных нет, пропускаем метрику
            if not actual_values and not plan_values:
                continue
                
            # Получаем категорию метрики
            query_category = select(Category).where(Category.id == metric.category_id)
            result_category = await session.execute(query_category)
            category = result_category.scalar_one_or_none()
                
            # Подготавливаем данные для графиков
            # Структурируем данные по периодам: год, кварталы, месяцы
            period_data = {
                "year": {
                    "period_id": None,
                    "actual": None,
                    "plan": None
                },
                "quarters": {
                    1: {"period_id": None, "actual": None, "plan": None},
                    2: {"period_id": None, "actual": None, "plan": None},
                    3: {"period_id": None, "actual": None, "plan": None},
                    4: {"period_id": None, "actual": None, "plan": None}
                },
                "months": {
                    1: {"period_id": None, "actual": None, "plan": None},
                    2: {"period_id": None, "actual": None, "plan": None},
                    3: {"period_id": None, "actual": None, "plan": None},
                    4: {"period_id": None, "actual": None, "plan": None},
                    5: {"period_id": None, "actual": None, "plan": None},
                    6: {"period_id": None, "actual": None, "plan": None},
                    7: {"period_id": None, "actual": None, "plan": None},
                    8: {"period_id": None, "actual": None, "plan": None},
                    9: {"period_id": None, "actual": None, "plan": None},
                    10: {"period_id": None, "actual": None, "plan": None},
                    11: {"period_id": None, "actual": None, "plan": None},
                    12: {"period_id": None, "actual": None, "plan": None}
                }
            }
            
            # Заполняем период_id для каждого периода
            for period_id, period in period_map.items():
                if period.quarter is None and period.month is None:
                    # Годовой период
                    period_data["year"]["period_id"] = str(period_id)
                elif period.month is None:
                    # Квартальный период
                    period_data["quarters"][period.quarter]["period_id"] = str(period_id)
                else:
                    # Месячный период
                    period_data["months"][period.month]["period_id"] = str(period_id)
            
            # Заполняем фактические значения
            for av in actual_values:
                period = period_map.get(av.period_id)
                if period:
                    if period.quarter is None and period.month is None:
                        # Годовой период
                        period_data["year"]["actual"] = float(av.value)
                    elif period.month is None:
                        # Квартальный период
                        period_data["quarters"][period.quarter]["actual"] = float(av.value)
                    else:
                        # Месячный период
                        period_data["months"][period.month]["actual"] = float(av.value)
            
            # Заполняем плановые значения
            for pv in plan_values:
                period = period_map.get(pv.period_id)
                if period:
                    if period.quarter is None and period.month is None:
                        # Годовой период
                        period_data["year"]["plan"] = float(pv.value)
                    elif period.month is None:
                        # Квартальный период
                        period_data["quarters"][period.quarter]["plan"] = float(pv.value)
                    else:
                        # Месячный период
                        period_data["months"][period.month]["plan"] = float(pv.value)
            
            # Формируем итоговый объект для метрики
            metric_data = {
                "metric_id": str(metric_id),
                "metric_name": metric.name,
                "unit": metric.unit,
                "category_id": str(metric.category_id),
                "category_name": category.name if category else "Unknown",
                "periods": period_data
            }
            
            result.append(metric_data)
        
        return result

    async def calculate_budget_statistics(
        self,
        session: AsyncSession,
        shop_id: Optional[uuid.UUID] = None,
        year: int = None,
        month: int = None
    ) -> Dict[str, Any]:
        """
        Расчет статистики по бюджету.
        
        Args:
            session: Сессия БД
            shop_id: ID магазина для фильтрации
            year: Год для фильтрации
            month: Месяц для фильтрации
            
        Returns:
            Статистика по бюджету
        """
        # Если год не указан, используем текущий
        if year is None:
            year = datetime.now().year
        
        # Получаем все периоды для указанного года
        query_periods = select(Period).where(Period.year == year)
        result_periods = await session.execute(query_periods)
        periods = result_periods.scalars().all()
        
        # Создаем карту для быстрого доступа к периодам
        period_map = {period.id: period for period in periods}
        
        # Определяем период для статистики
        target_period_id = None
        for period_id, period in period_map.items():
            if month and period.month == month:
                # Месячный период
                target_period_id = period_id
                break
            elif not month and period.quarter is None and period.month is None:
                # Годовой период
                target_period_id = period_id
                break
        
        if not target_period_id:
            # Если период не найден, возвращаем пустую статистику
            return {
                "total_plan": 0,
                "total_actual": 0,
                "deviation": 0,
                "deviation_percent": 0,
                "categories": [],
                "period": {
                    "year": year,
                    "month": month
                }
            }
        
        # Получаем фактические значения
        query_actual = select(ActualValue).where(ActualValue.period_id == target_period_id)
        if shop_id:
            query_actual = query_actual.where(ActualValue.shop_id == shop_id)
        result_actual = await session.execute(query_actual)
        actual_values = result_actual.scalars().all()
        
        # Получаем плановые значения
        query_plan = select(PlanValue).where(PlanValue.period_id == target_period_id)
        if shop_id:
            query_plan = query_plan.where(PlanValue.shop_id == shop_id)
        result_plan = await session.execute(query_plan)
        plan_values = result_plan.scalars().all()
        
        # Подготавливаем данные для статистики
        total_plan = sum(pv.value for pv in plan_values)
        total_actual = sum(av.value for av in actual_values)
        
        # Рассчитываем отклонение
        deviation = total_plan - total_actual
        deviation_percent = (deviation / total_plan * 100) if total_plan != 0 else 0
        
        # Группируем данные по категориям
        category_stats = {}
        
        # Создаем словарь метрик для быстрого доступа
        metric_ids = set([av.metric_id for av in actual_values] + [pv.metric_id for pv in plan_values])
        query_metrics = select(self.model).where(self.model.id.in_(metric_ids))
        result_metrics = await session.execute(query_metrics)
        metrics = result_metrics.scalars().all()
        metric_map = {metric.id: metric for metric in metrics}
        
        # Получаем категории для метрик
        category_ids = set([metric.category_id for metric in metrics if metric.category_id])
        query_categories = select(Category).where(Category.id.in_(category_ids))
        result_categories = await session.execute(query_categories)
        categories = result_categories.scalars().all()
        category_map = {category.id: category for category in categories}
        
        # Группируем план/факт по категориям
        for pv in plan_values:
            metric = metric_map.get(pv.metric_id)
            if not metric or not metric.category_id:
                continue
                
            category_id = metric.category_id
            if category_id not in category_stats:
                category = category_map.get(category_id)
                category_stats[category_id] = {
                    "category_id": str(category_id),
                    "category_name": category.name if category else "Unknown",
                    "plan": 0,
                    "actual": 0,
                    "deviation": 0,
                    "deviation_percent": 0
                }
                
            category_stats[category_id]["plan"] += float(pv.value)
            
        for av in actual_values:
            metric = metric_map.get(av.metric_id)
            if not metric or not metric.category_id:
                continue
                
            category_id = metric.category_id
            if category_id not in category_stats:
                category = category_map.get(category_id)
                category_stats[category_id] = {
                    "category_id": str(category_id),
                    "category_name": category.name if category else "Unknown",
                    "plan": 0,
                    "actual": 0,
                    "deviation": 0,
                    "deviation_percent": 0
                }
                
            category_stats[category_id]["actual"] += float(av.value)
            
        # Рассчитываем отклонения для категорий
        for category_id, stats in category_stats.items():
            stats["deviation"] = stats["plan"] - stats["actual"]
            stats["deviation_percent"] = (stats["deviation"] / stats["plan"] * 100) if stats["plan"] != 0 else 0
            
        # Формируем итоговую статистику
        result = {
            "total_plan": float(total_plan),
            "total_actual": float(total_actual),
            "deviation": float(deviation),
            "deviation_percent": float(deviation_percent),
            "categories": list(category_stats.values()),
            "period": {
                "year": year,
                "month": month
            }
        }
        
        return result 
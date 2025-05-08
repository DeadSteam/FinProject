import uuid
from typing import Optional, List, Union, Dict, Any
from decimal import Decimal
from datetime import datetime

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import TypeAdapter

from src.repository import finances_db
from src.model.finance import (
    Period, Image, Category, Shop, Metric, ActualValue, PlanValue
)
from src.scheme.finance import (
    Period as PeriodSchema, PeriodCreate, PeriodUpdate,
    Image as ImageSchema, ImageCreate, ImageUpdate,
    Category as CategorySchema, CategoryWithRelations, CategoryCreate, CategoryUpdate,
    Shop as ShopSchema, ShopCreate, ShopUpdate,
    Metric as MetricSchema, MetricWithCategory, MetricCreate, MetricUpdate,
    ActualValue as ActualValueSchema, ActualValueWithRelations, ActualValueCreate, ActualValueUpdate,
    PlanValue as PlanValueSchema, PlanValueWithRelations, PlanValueCreate, PlanValueUpdate
)
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
    
    async def get_or_create(
        self, year: int, session: AsyncSession, quarter: Optional[int] = None, month: Optional[int] = None
    ) -> PeriodSchema:
        """Получение или создание периода."""
        period = await self.get_by_year_quarter_month(year, session, quarter, month)
        if period:
            return period
        
        # Создаем новый период
        period_data = {
            "year": year,
            "quarter": quarter,
            "month": month
        }
        period_in = PeriodCreate(**period_data)
        return await self.create(period_in, session)
    
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


class ImageService(BaseService[Image, ImageSchema, ImageCreate, ImageUpdate]):
    """Сервис для работы с изображениями."""
    
    def __init__(self):
        super().__init__(finances_db, Image, ImageSchema)
    
    async def get_unused_images(self, session: AsyncSession) -> List[ImageSchema]:
        """Получение изображений, не используемых в категориях."""
        # Подзапрос для получения image_id, используемых в категориях
        subquery = select(Category.image_id).where(Category.image_id != None).distinct()
        
        # Основной запрос для получения изображений, ID которых не входят в подзапрос
        query = select(self.model).where(self.model.id.not_in(subquery))
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]


class CategoryService(BaseService[Category, CategorySchema, CategoryCreate, CategoryUpdate]):
    """Сервис для работы с категориями."""
    
    def __init__(self):
        super().__init__(finances_db, Category, CategorySchema)
    
    async def get_by_image_id(self, image_id: uuid.UUID, session: AsyncSession) -> List[CategorySchema]:
        """Получение всех категорий, использующих указанное изображение."""
        query = select(self.model).where(self.model.image_id == image_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_multi_with_relations(
        self, session: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[CategoryWithRelations]:
        """Получение списка категорий со связанными объектами."""
        query = select(self.model).options(
            selectinload(self.model.image)
        ).offset(skip).limit(limit)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        categories = []
        for db_obj in db_objs:
            # Преобразуем объект SQLAlchemy в словарь
            category_dict = {
                "id": db_obj.id,
                "name": db_obj.name,
                "description": db_obj.description,
                "image_id": db_obj.image_id,
                "status": db_obj.status,
                "image": None
            }
            
            # Добавляем связанный объект изображения, если есть
            if db_obj.image and hasattr(db_obj.image, 'id'):
                try:
                    category_dict["image"] = {
                        "id": db_obj.image.id,
                        "name": db_obj.image.name,
                        "svg_data": db_obj.image.svg_data
                    }
                except Exception as e:
                    # Логируем ошибку, но продолжаем выполнение
                    print(f"Ошибка при получении данных изображения: {e}")
                    category_dict["image"] = None
                
            categories.append(TypeAdapter(CategoryWithRelations).validate_python(category_dict))
            
        return categories
    
    async def get_with_relations(self, id: uuid.UUID, session: AsyncSession) -> Optional[CategoryWithRelations]:
        """Получение категории со связанными объектами."""
        query = select(self.model).options(
            # Заранее загружаем связанные объекты с помощью sqlalchemy.orm.joinedload
            selectinload(self.model.image)
        ).where(self.model.id == id)
        result = await session.execute(query)
        # Используем first() вместо scalar_one_or_none()
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
            
        # Преобразуем объект SQLAlchemy в словарь
        category_dict = {
            "id": db_obj.id,
            "name": db_obj.name,
            "description": db_obj.description,
            "image_id": db_obj.image_id,
            "status": db_obj.status,
            "image": None
        }
        
        # Добавляем связанный объект изображения, если есть
        if db_obj.image and hasattr(db_obj.image, 'id'):
            try:
                category_dict["image"] = {
                    "id": db_obj.image.id,
                    "name": db_obj.image.name,
                    "svg_data": db_obj.image.svg_data
                }
            except Exception as e:
                # Логируем ошибку, но продолжаем выполнение
                print(f"Ошибка при получении данных изображения: {e}")
                category_dict["image"] = None
            
        return TypeAdapter(CategoryWithRelations).validate_python(category_dict)
    
    async def get_by_name(self, name: str, session: AsyncSession) -> Optional[CategorySchema]:
        """Получение категории по имени."""
        query = select(self.model).where(self.model.name == name)
        result = await session.execute(query)
        # Используем first() вместо scalar_one_or_none()
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
            
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)


class ShopService(BaseService[Shop, ShopSchema, ShopCreate, ShopUpdate]):
    """Сервис для работы с магазинами."""
    
    def __init__(self):
        super().__init__(finances_db, Shop, ShopSchema)
    
    async def get_by_name(self, name: str, session: AsyncSession) -> Optional[ShopSchema]:
        """Получение магазина по имени."""
        query = select(self.model).where(self.model.name == name)
        result = await session.execute(query)
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
            
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
        
    async def search_shops(
        self,
        session: AsyncSession,
        search: Optional[str] = None,
        status: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ShopSchema]:
        """
        Поиск и фильтрация магазинов.
        
        Args:
            session: Сессия БД
            search: Поисковая строка для фильтрации по имени, адресу и описанию
            status: Фильтр по статусу (True - активен, False - неактивен)
            skip: Смещение для пагинации
            limit: Ограничение количества результатов для пагинации
        
        Returns:
            Список магазинов, соответствующих критериям фильтрации
        """
        conditions = []
        
        # Применяем поисковый фильтр, если он указан
        if search and search.strip():
            search_term = f"%{search.lower()}%"
            conditions.append(
                or_(
                    self.model.name.ilike(search_term),
                    self.model.address.ilike(search_term),
                    self.model.description.ilike(search_term)
                )
            )
        
        # Фильтр по статусу
        if status is not None:
            conditions.append(self.model.status == status)
        
        # Формируем запрос с учетом всех фильтров
        if conditions:
            query = select(self.model).where(and_(*conditions))
        else:
            query = select(self.model)
        
        # Добавляем пагинацию
        query = query.offset(skip).limit(limit)
        
        # Выполняем запрос
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        # Конвертируем результаты в схемы Pydantic
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]


class MetricService(BaseService[Metric, MetricSchema, MetricCreate, MetricUpdate]):
    """Сервис для работы с метриками."""
    
    def __init__(self):
        super().__init__(finances_db, Metric, MetricSchema)
    
    async def get_with_relations(self, id: uuid.UUID, session: AsyncSession) -> Optional[MetricWithCategory]:
        """Получение метрики со связанными объектами."""
        query = select(self.model).options(
            selectinload(self.model.category)
        ).where(self.model.id == id)
        result = await session.execute(query)
        # Используем first() вместо scalar_one_or_none()
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
            
        # Преобразуем объект SQLAlchemy в словарь с учетом всех полей включая unit
        metric_dict = {
            "id": db_obj.id,
            "name": db_obj.name,
            "category_id": db_obj.category_id,
            "unit": db_obj.unit,
            "category": None
        }
        
        # Добавляем связанный объект категории, если есть
        if db_obj.category and hasattr(db_obj.category, 'id'):
            try:
                metric_dict["category"] = {
                    "id": db_obj.category.id,
                    "name": db_obj.category.name,
                    "description": db_obj.category.description,
                    "image_id": db_obj.category.image_id,
                    "status": db_obj.category.status
                }
            except Exception as e:
                # Логируем ошибку, но продолжаем выполнение
                print(f"Ошибка при получении данных категории: {e}")
                metric_dict["category"] = None
            
        return TypeAdapter(MetricWithCategory).validate_python(metric_dict)
    
    async def get_by_category(self, category_id: uuid.UUID, session: AsyncSession) -> List[MetricSchema]:
        """Получение всех метрик для указанной категории."""
        query = select(self.model).where(self.model.category_id == category_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_metrics_by_filters(
        self,
        session: AsyncSession,
        category_id: Optional[uuid.UUID] = None,
        store_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MetricSchema]:
        """Получение метрик с возможностью фильтрации по категории и магазину."""
        conditions = []
        
        if category_id:
            conditions.append(self.model.category_id == category_id)
        
        # Если указан store_id, нужно получить метрики, которые имеют значения для этого магазина
        # Это требует отдельного запроса с JOIN или подзапроса
        # Для упрощения, если указан store_id, но не указан category_id, 
        # пока возвращаем все метрики (это нужно оптимизировать в будущем)
        
        if conditions:
            query = select(self.model).where(and_(*conditions)).offset(skip).limit(limit)
        else:
            query = select(self.model).offset(skip).limit(limit)
            
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_name_and_category(
        self, name: str, category_id: uuid.UUID, session: AsyncSession
    ) -> Optional[MetricSchema]:
        """Получение метрики по названию и ID категории."""
        query = select(self.model).where(
            and_(
                self.model.name == name,
                self.model.category_id == category_id
            )
        )
        result = await session.execute(query)
        db_obj = result.scalar_one_or_none()
        
        if not db_obj:
            return None
            
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
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
        if not year:
            current_date = datetime.now()
            year = current_date.year
        
        # Получаем все периоды для указанного года
        period_service = PeriodService()
        all_periods = await period_service.get_multi(session=session)
        year_periods = [p for p in all_periods if p.year == year]
        
        # Получаем метрики с фильтрацией по категории
        conditions = []
        if category_id:
            conditions.append(self.model.category_id == category_id)
        
        if conditions:
            query = select(self.model).options(
                selectinload(self.model.category)
            ).where(and_(*conditions))
        else:
            query = select(self.model).options(
                selectinload(self.model.category)
            )
        
        result = await session.execute(query)
        metrics = result.scalars().all()
        
        # Получаем план и факт для каждой метрики
        plan_service = PlanValueService()
        actual_service = ActualValueService()
        
        metrics_data = []
        for metric in metrics:
            # Получаем плановые значения для метрики и магазина
            plan_conditions = [
                PlanValue.metric_id == metric.id
            ]
            if shop_id:
                plan_conditions.append(PlanValue.shop_id == shop_id)
            
            plan_query = select(PlanValue).join(
                Period, PlanValue.period_id == Period.id
            ).where(
                and_(
                    *plan_conditions,
                    Period.year == year
                )
            )
            plan_result = await session.execute(plan_query)
            plan_values = plan_result.scalars().all()
            
            # Получаем фактические значения для метрики и магазина
            actual_conditions = [
                ActualValue.metric_id == metric.id
            ]
            if shop_id:
                actual_conditions.append(ActualValue.shop_id == shop_id)
            
            actual_query = select(ActualValue).join(
                Period, ActualValue.period_id == Period.id
            ).where(
                and_(
                    *actual_conditions,
                    Period.year == year
                )
            )
            actual_result = await session.execute(actual_query)
            actual_values = actual_result.scalars().all()
            
            # Формируем данные по метрике
            category_name = metric.category.name if metric.category else None
            metric_data = {
                "id": str(metric.id),
                "name": metric.name,
                "category_id": str(metric.category_id) if metric.category_id else None,
                "category_name": category_name,
                "unit": metric.unit,
                "planValues": [],
                "actualValues": []
            }
            
            # Добавляем данные по плановым значениям
            for plan in plan_values:
                metric_data["planValues"].append({
                    "id": str(plan.id),
                    "value": float(plan.value),
                    "metric_id": str(plan.metric_id),
                    "shop_id": str(plan.shop_id),
                    "period_id": str(plan.period_id)
                })
            
            # Добавляем данные по фактическим значениям
            for actual in actual_values:
                metric_data["actualValues"].append({
                    "id": str(actual.id),
                    "value": float(actual.value),
                    "metric_id": str(actual.metric_id),
                    "shop_id": str(actual.shop_id),
                    "period_id": str(actual.period_id)
                })
            
            metrics_data.append(metric_data)
        
        # Данные по периодам, необходимые для клиентской визуализации
        periods_data = []
        for period in year_periods:
            periods_data.append({
                "id": str(period.id),
                "year": period.year,
                "quarter": period.quarter,
                "month": period.month
            })
        
        # Включаем данные по периодам в ответ
        result_data = {
            "metrics": metrics_data,
            "periods": periods_data
        }
        
        return metrics_data
    
    async def calculate_budget_statistics(
        self,
        session: AsyncSession,
        shop_id: Optional[uuid.UUID] = None,
        year: int = None,
        month: int = None
    ) -> Dict[str, Any]:
        """
        Расчет бюджетной статистики для отображения в панели управления.
        
        Args:
            session: Сессия БД
            shop_id: ID магазина для фильтрации данных (опционально)
            year: Год для получения данных
            month: Месяц для получения данных
            
        Returns:
            Словарь со статистическими данными:
            - total_plan: Сумма плановых значений
            - total_actual: Сумма фактических значений
            - percentage: Процент выполнения плана
            - status: Статус бюджета (ahead|on_track|behind)
            - remaining_budget: Оставшийся бюджет
        """
        # Если год не указан, используем текущий
        if not year:
            current_date = datetime.now()
            year = current_date.year
        
        # Если месяц не указан, используем текущий
        if not month:
            current_date = datetime.now()
            month = current_date.month
        
        # Вычисляем квартал для указанного месяца
        quarter = (month - 1) // 3 + 1
        
        # Получаем период для указанного месяца
        period_service = PeriodService()
        month_period = await period_service.get_by_year_quarter_month(
            year=year, 
            quarter=quarter, 
            month=month, 
            session=session
        )
        
        if not month_period:
            # Возвращаем пустые данные, если период не найден
            return {
                "total_plan": 0,
                "total_actual": 0,
                "percentage": 0,
                "status": "no_data",
                "remaining_budget": 0
            }
        
        # Получаем все плановые значения для указанного периода и магазина
        plan_service = PlanValueService()
        plan_conditions = [PlanValue.period_id == month_period.id]
        if shop_id:
            plan_conditions.append(PlanValue.shop_id == shop_id)
        
        plan_query = select(PlanValue).where(and_(*plan_conditions))
        plan_result = await session.execute(plan_query)
        plan_values = plan_result.scalars().all()
        
        total_plan = sum(float(pv.value) for pv in plan_values)
        
        # Получаем все фактические значения для указанного периода и магазина
        actual_service = ActualValueService()
        actual_conditions = [ActualValue.period_id == month_period.id]
        if shop_id:
            actual_conditions.append(ActualValue.shop_id == shop_id)
        
        actual_query = select(ActualValue).where(and_(*actual_conditions))
        actual_result = await session.execute(actual_query)
        actual_values = actual_result.scalars().all()
        
        total_actual = sum(float(av.value) for av in actual_values)
        
        # Рассчитываем процент выполнения плана
        percentage = 0
        remaining_budget = 0
        if total_plan > 0:
            percentage = min(100, round((total_actual / total_plan) * 100))
            remaining_budget = total_plan - total_actual
        
        # Определяем статус бюджета
        status = "on_track"  # По умолчанию - в соответствии с планом
        if percentage > 105:
            status = "ahead"  # Опережает план
        elif percentage < 95:
            status = "behind"  # Отстает от плана
        
        # Возвращаем расчетные данные
        return {
            "total_plan": total_plan,
            "total_actual": total_actual,
            "percentage": percentage,
            "status": status,
            "remaining_budget": remaining_budget
        }

    async def search_metrics(
        self,
        session: AsyncSession,
        search: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MetricSchema]:
        """
        Поиск и фильтрация метрик.
        
        Args:
            session: Сессия БД
            search: Поисковая строка для фильтрации по имени и единице измерения
            category_id: Фильтр по ID категории
            skip: Смещение для пагинации
            limit: Ограничение количества результатов для пагинации
        
        Returns:
            Список метрик, соответствующих критериям фильтрации
        """
        # Формируем условия фильтрации
        conditions = []
        
        # Поиск по имени и единице измерения
        if search and search.strip():
            search_term = f"%{search.lower()}%"
            conditions.append(
                or_(
                    self.model.name.ilike(search_term),
                    self.model.unit.ilike(search_term)
                )
            )
        
        # Фильтр по категории
        if category_id:
            conditions.append(self.model.category_id == category_id)
        
        # Формируем запрос с учетом всех фильтров и включаем данные о категории
        query = select(self.model).options(
            selectinload(self.model.category)
        )
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Добавляем пагинацию
        query = query.offset(skip).limit(limit)
        
        # Выполняем запрос
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        # Преобразуем результаты в схемы Pydantic
        metrics = []
        for db_obj in db_objs:
            # Создаем словарь с данными метрики
            metric_dict = db_obj.__dict__.copy()
            
            # Добавляем связанную категорию, если она существует
            if hasattr(db_obj, 'category') and db_obj.category:
                metric_dict['category'] = {
                    'id': db_obj.category.id,
                    'name': db_obj.category.name,
                    'description': db_obj.category.description,
                    'image_id': db_obj.category.image_id,
                    'status': db_obj.category.status
                }
            
            # Преобразуем в схему Pydantic и добавляем в результат
            metrics.append(TypeAdapter(MetricWithCategory).validate_python(metric_dict))
        
        return metrics


class ActualValueService(BaseService[ActualValue, ActualValueSchema, ActualValueCreate, ActualValueUpdate]):
    """Сервис для работы с фактическими значениями."""
    
    def __init__(self):
        super().__init__(finances_db, ActualValue, ActualValueSchema)
    
    async def get_with_relations(self, id: uuid.UUID, session: AsyncSession) -> Optional[ActualValueWithRelations]:
        """Получение фактического значения со связанными объектами."""
        query = select(self.model).options(
            selectinload(self.model.metric),
            selectinload(self.model.shop),
            selectinload(self.model.period)
        ).where(self.model.id == id)
        result = await session.execute(query)
        # Используем first() вместо scalar_one_or_none()
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
            
        # Преобразуем объект SQLAlchemy в словарь
        value_dict = {
            "id": db_obj.id,
            "metric_id": db_obj.metric_id,
            "shop_id": db_obj.shop_id,
            "value": db_obj.value,
            "period_id": db_obj.period_id,
            "metric": None,
            "shop": None,
            "period": None
        }
        
        # Добавляем связанные объекты, если есть
        if db_obj.metric:
            value_dict["metric"] = {
                "id": db_obj.metric.id,
                "name": db_obj.metric.name,
                "category_id": db_obj.metric.category_id
            }
            
        if db_obj.shop:
            value_dict["shop"] = {
                "id": db_obj.shop.id,
                "name": db_obj.shop.name,
                "number_of_staff": db_obj.shop.number_of_staff,
                "description": db_obj.shop.description,
                "address": db_obj.shop.address,
                "status": db_obj.shop.status
            }
            
        if db_obj.period:
            value_dict["period"] = {
                "id": db_obj.period.id,
                "year": db_obj.period.year,
                "quarter": db_obj.period.quarter,
                "month": db_obj.period.month
            }
            
        return TypeAdapter(ActualValueWithRelations).validate_python(value_dict)
    
    async def get_by_metric_shop_period(
        self, metric_id: uuid.UUID, shop_id: uuid.UUID, period_id: uuid.UUID, session: AsyncSession
    ) -> Optional[ActualValueSchema]:
        """Получение фактического значения по метрике, магазину и периоду."""
        query = select(self.model).where(
            and_(
                self.model.metric_id == metric_id,
                self.model.shop_id == shop_id,
                self.model.period_id == period_id
            )
        )
        result = await session.execute(query)
        # Вместо scalar_one_or_none() используем first(), чтобы избежать ошибки при наличии нескольких записей
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
            
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
    async def get_by_period(self, period_id: uuid.UUID, session: AsyncSession) -> List[ActualValueSchema]:
        """Получение фактических значений по периоду."""
        query = select(self.model).where(self.model.period_id == period_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_shop(self, shop_id: uuid.UUID, session: AsyncSession) -> List[ActualValueSchema]:
        """Получение фактических значений по магазину."""
        query = select(self.model).where(self.model.shop_id == shop_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_metric(self, metric_id: uuid.UUID, session: AsyncSession) -> List[ActualValueSchema]:
        """Получение фактических значений по метрике."""
        query = select(self.model).where(self.model.metric_id == metric_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]


class PlanValueService(BaseService[PlanValue, PlanValueSchema, PlanValueCreate, PlanValueUpdate]):
    """Сервис для работы с плановыми значениями."""
    
    def __init__(self):
        super().__init__(finances_db, PlanValue, PlanValueSchema)
    
    async def distribute_yearly_plan(
        self,
        metric_id: uuid.UUID,
        shop_id: uuid.UUID,
        year: int,
        yearly_value: Decimal,
        session: AsyncSession
    ) -> List[PlanValueSchema]:
        """Распределение годового плана по кварталам и месяцам."""
        # Получаем или создаем годовой период
        period_service = PeriodService()
        year_period = await period_service.get_or_create(year, session)
        
        # Проверяем существование годового плана
        existing_yearly_plan = await self.get_by_metric_shop_period(metric_id, shop_id, year_period.id, session)
        
        if existing_yearly_plan:
            # Обновляем существующий годовой план
            yearly_plan = await self.update(
                id=existing_yearly_plan.id,
                obj_in=PlanValueUpdate(value=yearly_value),
                session=session
            )
        else:
            # Создаем новый годовой план
            yearly_plan = await self.create(
                PlanValueCreate(
                    metric_id=metric_id,
                    shop_id=shop_id,
                    value=yearly_value,
                    period_id=year_period.id
                ),
                session
            )
        
        # Равномерное распределение годового значения по кварталам
        quarter_value = yearly_value / 4
        
        # Распределяем план по кварталам
        quarterly_values = []
        for quarter in range(1, 5):
            # Получаем или создаем квартальный период
            quarter_period = await period_service.get_or_create(year, session, quarter=quarter)
            
            # Проверяем существование квартального плана
            existing_quarter_plan = await self.get_by_metric_shop_period(metric_id, shop_id, quarter_period.id, session)
            
            if existing_quarter_plan:
                # Обновляем существующий квартальный план
                quarterly_plan = await self.update(
                    id=existing_quarter_plan.id,
                    obj_in=PlanValueUpdate(value=quarter_value),
                    session=session
                )
            else:
                # Создаем новый квартальный план
                quarterly_plan = await self.create(
                    PlanValueCreate(
                        metric_id=metric_id,
                        shop_id=shop_id,
                        value=quarter_value,
                        period_id=quarter_period.id
                    ),
                    session
                )
            
            quarterly_values.append(quarterly_plan)
            
            # Равномерное распределение квартального значения по месяцам
            month_value = quarter_value / 3
            
            # Распределяем план по месяцам
            for month_in_quarter in range(1, 4):
                # Вычисляем абсолютный номер месяца в году (от 1 до 12)
                month_num = (quarter - 1) * 3 + month_in_quarter
                
                # Получаем или создаем месячный период
                month_period = await period_service.get_or_create(year, session, quarter=quarter, month=month_num)
                
                # Проверяем существование месячного плана
                existing_month_plan = await self.get_by_metric_shop_period(metric_id, shop_id, month_period.id, session)
                
                if existing_month_plan:
                    # Обновляем существующий месячный план
                    await self.update(
                        id=existing_month_plan.id,
                        obj_in=PlanValueUpdate(value=month_value),
                        session=session
                    )
                else:
                    # Создаем новый месячный план
                    await self.create(
                        PlanValueCreate(
                            metric_id=metric_id,
                            shop_id=shop_id,
                            value=month_value,
                            period_id=month_period.id
                        ),
                        session
                    )
        
        return [yearly_plan] + quarterly_values
    
    async def get_with_relations(self, id: uuid.UUID, session: AsyncSession) -> Optional[PlanValueWithRelations]:
        """Получение планового значения со связанными объектами."""
        query = select(self.model).options(
            selectinload(self.model.metric),
            selectinload(self.model.shop),
            selectinload(self.model.period)
        ).where(self.model.id == id)
        result = await session.execute(query)
        # Используем first() вместо scalar_one_or_none()
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
            
        # Преобразуем объект SQLAlchemy в словарь
        value_dict = {
            "id": db_obj.id,
            "metric_id": db_obj.metric_id,
            "shop_id": db_obj.shop_id,
            "value": db_obj.value,
            "period_id": db_obj.period_id,
            "metric": None,
            "shop": None,
            "period": None
        }
        
        # Добавляем связанные объекты, если есть
        if db_obj.metric:
            value_dict["metric"] = {
                "id": db_obj.metric.id,
                "name": db_obj.metric.name,
                "category_id": db_obj.metric.category_id
            }
            
        if db_obj.shop:
            value_dict["shop"] = {
                "id": db_obj.shop.id,
                "name": db_obj.shop.name,
                "number_of_staff": db_obj.shop.number_of_staff,
                "description": db_obj.shop.description,
                "address": db_obj.shop.address,
                "status": db_obj.shop.status
            }
            
        if db_obj.period:
            value_dict["period"] = {
                "id": db_obj.period.id,
                "year": db_obj.period.year,
                "quarter": db_obj.period.quarter,
                "month": db_obj.period.month
            }
            
        return TypeAdapter(PlanValueWithRelations).validate_python(value_dict)
    
    async def get_by_metric_shop_period(
        self, metric_id: uuid.UUID, shop_id: uuid.UUID, period_id: uuid.UUID, session: AsyncSession
    ) -> Optional[PlanValueSchema]:
        """Получение планового значения по метрике, магазину и периоду."""
        query = select(self.model).where(
            and_(
                self.model.metric_id == metric_id,
                self.model.shop_id == shop_id,
                self.model.period_id == period_id
            )
        )
        result = await session.execute(query)
        # Вместо scalar_one_or_none() используем first(), чтобы избежать ошибки при наличии нескольких записей
        db_obj = result.scalars().first()
        
        if not db_obj:
            return None
            
        return TypeAdapter(self.schema).validate_python(db_obj.__dict__)
    
    async def get_by_period(self, period_id: uuid.UUID, session: AsyncSession) -> List[PlanValueSchema]:
        """Получение плановых значений по периоду."""
        query = select(self.model).where(self.model.period_id == period_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_shop(self, shop_id: uuid.UUID, session: AsyncSession) -> List[PlanValueSchema]:
        """Получение плановых значений по магазину."""
        query = select(self.model).where(self.model.shop_id == shop_id)
        result = await session.execute(query)
        db_objs = result.scalars().all()
        
        return [TypeAdapter(self.schema).validate_python(obj.__dict__) for obj in db_objs]
    
    async def get_by_metric(self, metric_id: uuid.UUID, session: AsyncSession) -> List[PlanValueSchema]:
        """Получение плановых значений по метрике."""
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
        Пересчет плановых значений с учетом фактического значения.
        
        После ввода фактического значения, оставшаяся разница между годовым планом и
        уже введенными фактическими значениями равномерно распределяется
        по будущим месяцам года.
        
        Годовой план при этом остается неизменным.
        
        Args:
            metric_id: ID метрики
            shop_id: ID магазина
            year: Год
            actual_month: Месяц, для которого внесено фактическое значение
            actual_value: Фактическое значение
            session: Сессия БД
            
        Returns:
            Список обновленных плановых значений
        """
        # Получаем сервисы
        period_service = PeriodService()
        actual_service = ActualValueService()
        
        # Получаем период-год
        year_period = await period_service.get_or_create(year, session)
        
        # Вычисляем квартал для фактического месяца
        actual_quarter = (actual_month - 1) // 3 + 1
        
        # Получаем период-месяц для фактического значения
        actual_month_period = await period_service.get_or_create(year, session, quarter=actual_quarter, month=actual_month)
        
        # Получаем годовой план - НЕ ИЗМЕНЯЕМ ЕГО!
        yearly_plan = await self.get_by_metric_shop_period(metric_id, shop_id, year_period.id, session)
        if not yearly_plan:
            raise ValueError(f"Годовой план для метрики {metric_id} не найден")
        
        # Получаем плановое значение для текущего месяца
        monthly_plan = await self.get_by_metric_shop_period(metric_id, shop_id, actual_month_period.id, session)
        if not monthly_plan:
            raise ValueError(f"Плановое значение для месяца {actual_month} не найдено")
        
        # 1. Собираем информацию о всех месяцах года
        all_months = []
        actual_values_by_month = {}
        plan_values_by_month = {}
        
        # Собираем данные по всем месяцам
        for quarter in range(1, 5):
            for month_in_quarter in range(1, 4):
                month_num = (quarter - 1) * 3 + month_in_quarter
                
                # Получаем период-месяц
                month_period = await period_service.get_or_create(year, session, quarter=quarter, month=month_num)
                
                # Добавляем в список всех месяцев
                all_months.append({
                    "quarter": quarter,
                    "month": month_num,
                    "period": month_period
                })
                
                # Получаем фактическое значение для месяца, если есть
                actual = await actual_service.get_by_metric_shop_period(metric_id, shop_id, month_period.id, session)
                if actual:
                    actual_values_by_month[month_num] = actual.value
                
                # Получаем плановое значение для месяца
                plan = await self.get_by_metric_shop_period(metric_id, shop_id, month_period.id, session)
                if plan:
                    plan_values_by_month[month_num] = plan.value
        
        # 2. Определяем прошедшие и будущие месяцы
        past_months = [m for m in all_months if m["month"] <= actual_month]
        future_months = [m for m in all_months if m["month"] > actual_month]
        
        if not future_months:
            # Если нет будущих месяцев, просто возвращаем годовой план
            return [yearly_plan]
        
        # 3. Рассчитываем общую сумму, которая уже "израсходована" на прошедшие месяцы
        # Для месяца, по которому вносится фактическое значение, используем actual_value
        past_sum = Decimal('0')
        for month_data in past_months:
            month_num = month_data["month"]
            if month_num < actual_month:
                # Для уже прошедших месяцев используем фактические значения, если есть
                if month_num in actual_values_by_month:
                    past_sum += actual_values_by_month[month_num]
                else:
                    # Иначе используем плановые значения
                    past_sum += plan_values_by_month.get(month_num, Decimal('0'))
            elif month_num == actual_month:
                # Для текущего месяца используем введенное фактическое значение
                past_sum += actual_value
        
        # 4. Рассчитываем, сколько осталось распределить на будущие месяцы
        # Годовой план минус уже "израсходованная" сумма
        remaining_to_distribute = yearly_plan.value - past_sum
        
        # 5. Равномерно распределяем оставшуюся сумму по будущим месяцам
        value_per_future_month = Decimal('0')
        if len(future_months) > 0:
            value_per_future_month = remaining_to_distribute / len(future_months)
        
        # 6. Обновляем плановые значения для будущих месяцев
        updated_plans = []
        future_quarters = set()  # Для отслеживания кварталов, которые нужно обновить
        
        for month_data in future_months:
            month_num = month_data["month"]
            quarter = month_data["quarter"]
            month_period = month_data["period"]
            future_quarters.add(quarter)
            
            # Получаем или создаем плановое значение для месяца
            existing_plan = await self.get_by_metric_shop_period(metric_id, shop_id, month_period.id, session)
            
            if existing_plan:
                # Обновляем существующее плановое значение
                updated_plan = await self.update(
                    id=existing_plan.id,
                    obj_in=PlanValueUpdate(value=value_per_future_month),
                    session=session
                )
                updated_plans.append(updated_plan)
            else:
                # Создаем новое плановое значение
                new_plan = await self.create(
                    PlanValueCreate(
                        metric_id=metric_id,
                        shop_id=shop_id,
                        value=value_per_future_month,
                        period_id=month_period.id
                    ),
                    session=session
                )
                updated_plans.append(new_plan)
        
        # 7. Обновляем все квартальные планы с учетом новых значений
        # Сначала обрабатываем текущий квартал
        current_quarter_period = await period_service.get_or_create(year, session, quarter=actual_quarter)
        current_quarter_months = [m for m in all_months if m["quarter"] == actual_quarter]
        
        current_quarter_sum = Decimal('0')
        for month_data in current_quarter_months:
            month_num = month_data["month"]
            
            if month_num < actual_month:
                # Для прошедших месяцев используем фактические значения, если есть
                if month_num in actual_values_by_month:
                    current_quarter_sum += actual_values_by_month[month_num]
                else:
                    # Иначе используем плановые значения
                    current_quarter_sum += plan_values_by_month.get(month_num, Decimal('0'))
            elif month_num == actual_month:
                # Для текущего месяца используем введенное фактическое значение
                current_quarter_sum += actual_value
            else:
                # Для будущих месяцев в текущем квартале используем новое расчетное значение
                current_quarter_sum += value_per_future_month
        
        # Обновляем план текущего квартала
        existing_current_quarter_plan = await self.get_by_metric_shop_period(metric_id, shop_id, current_quarter_period.id, session)
        if existing_current_quarter_plan:
            await self.update(
                id=existing_current_quarter_plan.id,
                obj_in=PlanValueUpdate(value=current_quarter_sum),
                session=session
            )
        
        # Теперь обрабатываем будущие кварталы
        for quarter in future_quarters:
            # Пропускаем текущий квартал, так как мы его уже обработали
            if quarter == actual_quarter:
                continue
                
            # Получаем период-квартал
            quarter_period = await period_service.get_or_create(year, session, quarter=quarter)
            
            # Рассчитываем сумму для квартала (все месяцы этого квартала имеют одинаковое value_per_future_month)
            quarter_months = [m for m in all_months if m["quarter"] == quarter]
            quarter_sum = len(quarter_months) * value_per_future_month
            
            # Обновляем квартальный план
            existing_quarter_plan = await self.get_by_metric_shop_period(metric_id, shop_id, quarter_period.id, session)
            if existing_quarter_plan:
                await self.update(
                    id=existing_quarter_plan.id,
                    obj_in=PlanValueUpdate(value=quarter_sum),
                    session=session
                )
            else:
                # Создаем, если не существует
                await self.create(
                    PlanValueCreate(
                        metric_id=metric_id,
                        shop_id=shop_id,
                        value=quarter_sum,
                        period_id=quarter_period.id
                    ),
                    session=session
                )
        
        # Возвращаем обновленные значения
        return [yearly_plan] + updated_plans


# Инициализация сервисов
period_service = PeriodService()
image_service = ImageService()
category_service = CategoryService()
shop_service = ShopService()
metric_service = MetricService()
actual_value_service = ActualValueService()
plan_value_service = PlanValueService() 
import uuid
from typing import List, Dict, Optional, Tuple, Any
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.model.finance import Period, Shop, Metric, Category
from src.scheme.finance import Period as PeriodSchema
from src.service.finance import (
    period_service, shop_service, metric_service, category_service,
    actual_value_service, plan_value_service, image_service
)


class AnalyticsService:
    """Сервис для аналитики и бизнес-логики."""
    
    async def get_actual_vs_plan(
        self, 
        period_id: uuid.UUID, 
        session: AsyncSession,
        shop_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """Получение сравнения фактических и плановых значений.
        
        Args:
            period_id: ID периода
            session: Сессия SQLAlchemy
            shop_id: Опционально, ID магазина для фильтрации
            category_id: Опционально, ID категории для фильтрации
            
        Returns:
            Словарь с данными сравнения фактических и плановых значений
        """
        # Получаем фактические значения
        actual_values = await actual_value_service.get_by_period(period_id, session)
        
        # Получаем плановые значения
        plan_values = await plan_value_service.get_by_period(period_id, session)
        
        # Фильтруем по магазину, если необходимо
        if shop_id:
            actual_values = [av for av in actual_values if av.shop_id == shop_id]
            plan_values = [pv for pv in plan_values if pv.shop_id == shop_id]
        
        # Фильтруем по категории, если необходимо
        if category_id:
            # Сначала получаем метрики для данной категории
            metrics = await metric_service.get_by_category(category_id, session)
            metric_ids = [m.id for m in metrics]
            
            actual_values = [av for av in actual_values if av.metric_id in metric_ids]
            plan_values = [pv for pv in plan_values if pv.metric_id in metric_ids]
        
        # Формируем словарь метрика -> магазин -> (факт, план)
        result_data: Dict[uuid.UUID, Dict[uuid.UUID, Tuple[Decimal, Decimal]]] = {}
        
        # Обрабатываем фактические значения
        for av in actual_values:
            if av.metric_id not in result_data:
                result_data[av.metric_id] = {}
            
            if av.shop_id not in result_data[av.metric_id]:
                result_data[av.metric_id][av.shop_id] = (Decimal('0'), Decimal('0'))
            
            current_values = result_data[av.metric_id][av.shop_id]
            result_data[av.metric_id][av.shop_id] = (av.value, current_values[1])
        
        # Обрабатываем плановые значения
        for pv in plan_values:
            if pv.metric_id not in result_data:
                result_data[pv.metric_id] = {}
            
            if pv.shop_id not in result_data[pv.metric_id]:
                result_data[pv.metric_id][pv.shop_id] = (Decimal('0'), Decimal('0'))
            
            current_values = result_data[pv.metric_id][pv.shop_id]
            result_data[pv.metric_id][pv.shop_id] = (current_values[0], pv.value)
        
        # Преобразуем в формат для ответа
        formatted_result = {
            "period_id": str(period_id),
            "data": []
        }
        
        # Загружаем связанные данные для названий и информации
        period = await period_service.get_by_id(period_id, session)
        
        for metric_id, shops_data in result_data.items():
            metric = await metric_service.get_with_category(metric_id, session)
            if not metric:
                continue
                
            metric_data = {
                "metric_id": str(metric_id),
                "metric_name": metric.name,
                "category_id": str(metric.category_id),
                "category_name": metric.category.name if metric.category else "Unknown",
                "shops": []
            }
            
            for shop_id, (actual, plan) in shops_data.items():
                shop = await shop_service.get_by_id(shop_id, session)
                if not shop:
                    continue
                    
                # Рассчитываем отклонение
                deviation = actual - plan
                deviation_percent = (deviation / plan * 100) if plan != 0 else Decimal('0')
                
                shop_data = {
                    "shop_id": str(shop_id),
                    "shop_name": shop.name,
                    "actual": float(actual),
                    "plan": float(plan),
                    "deviation": float(deviation),
                    "deviation_percent": float(deviation_percent)
                }
                
                metric_data["shops"].append(shop_data)
            
            formatted_result["data"].append(metric_data)
        
        # Добавляем информацию о периоде
        if period:
            formatted_result["period"] = {
                "year": period.year,
                "quarter": period.quarter,
                "month": period.month
            }
        
        return formatted_result
    
    async def get_total_metrics_by_shop(
        self, 
        period_id: uuid.UUID,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Получение итоговых метрик по магазинам.
        
        Args:
            period_id: ID периода
            session: Сессия SQLAlchemy
            
        Returns:
            Словарь с итоговыми метриками по магазинам
        """
        # Получаем фактические значения
        actual_values = await actual_value_service.get_by_period(period_id, session)
        
        # Создаем словарь магазин -> метрика -> значение
        shop_metrics: Dict[uuid.UUID, Dict[uuid.UUID, Decimal]] = {}
        
        # Обрабатываем фактические значения
        for av in actual_values:
            if av.shop_id not in shop_metrics:
                shop_metrics[av.shop_id] = {}
            
            shop_metrics[av.shop_id][av.metric_id] = av.value
        
        # Формируем результат
        result = {
            "period_id": str(period_id),
            "shops": []
        }
        
        # Загружаем связанные данные
        period = await period_service.get_by_id(period_id, session)
        
        for shop_id, metrics_data in shop_metrics.items():
            shop = await shop_service.get_by_id(shop_id, session)
            if not shop:
                continue
                
            shop_data = {
                "shop_id": str(shop_id),
                "shop_name": shop.name,
                "metrics": []
            }
            
            total_value = Decimal('0')
            
            for metric_id, value in metrics_data.items():
                metric = await metric_service.get_with_category(metric_id, session)
                if not metric:
                    continue
                    
                metric_data = {
                    "metric_id": str(metric_id),
                    "metric_name": metric.name,
                    "category_id": str(metric.category_id),
                    "category_name": metric.category.name if metric.category else "Unknown",
                    "value": float(value)
                }
                
                total_value += value
                shop_data["metrics"].append(metric_data)
            
            shop_data["total_value"] = float(total_value)
            result["shops"].append(shop_data)
        
        # Добавляем информацию о периоде
        if period:
            result["period"] = {
                "year": period.year,
                "quarter": period.quarter,
                "month": period.month
            }
        
        # Сортируем магазины по общей сумме (по убыванию)
        result["shops"] = sorted(
            result["shops"],
            key=lambda x: x["total_value"],
            reverse=True
        )
        
        return result

    async def get_aggregated_data(self, session: AsyncSession) -> Dict[str, Any]:
        """Агрегирует данные для дашборда в требуемом формате.
        
        Args:
            session: Сессия SQLAlchemy
            
        Returns:
            Структура данных для дашборда со всеми необходимыми метриками
        """
        # Получаем текущий период (можно настроить логику)
        current_period = await period_service.get_current_period(session)
        if not current_period:
            # Если текущий период не найден, возьмем последний
            all_periods = await period_service.get_all(session)
            if not all_periods:
                # Если периодов нет, вернем пустые данные
                return self._get_empty_aggregated_data()
            current_period = all_periods[-1]
        
        # Получаем данные по текущему месяцу
        month_values = await self._calculate_month_values(current_period, session)
        
        # Получаем метрики для дашборда
        dashboard_metrics = await self._calculate_dashboard_metrics(current_period, session)
        
        # Получаем данные по категориям
        categories_data = await self._aggregate_categories_data(current_period, session)
        
        # Получаем данные по магазинам
        shops_data = await self._aggregate_shops_data(current_period, session)
        
        # Формируем результат
        return {
            "month_values": month_values,
            "dashboard_metrics": dashboard_metrics,
            "categories": categories_data,
            "shops": shops_data
        }

    async def _calculate_month_values(self, period: Period, session: AsyncSession) -> Dict[str, float]:
        """Вычисляет значения для текущего месяца.
        
        Args:
            period: Текущий период
            session: Сессия SQLAlchemy
            
        Returns:
            Словарь с месячными значениями
        """
        # Получаем фактические и плановые значения за период
        actual_values = await actual_value_service.get_by_period(period.id, session)
        plan_values = await plan_value_service.get_by_period(period.id, session)
        
        # Суммируем значения
        total_actual = sum(av.value for av in actual_values)
        total_plan = sum(pv.value for pv in plan_values)
        
        # Вычисляем процент выполнения
        month_procent = (float(total_actual) / float(total_plan) * 100) if total_plan != 0 else 0.0
        
        return {
            "month_actual": float(total_actual),
            "month_plan": float(total_plan),
            "month_procent": round(month_procent, 2)
        }
    
    async def _calculate_dashboard_metrics(self, period: Period, session: AsyncSession) -> Dict[str, Any]:
        """Вычисляет общие метрики для дашборда.
        
        Args:
            period: Текущий период
            session: Сессия SQLAlchemy
            
        Returns:
            Словарь с метриками для дашборда
        """
        # Получаем количество категорий
        categories = await category_service.get_all(session)
        count_category = len(categories)
        
        # Получаем количество магазинов
        shops = await shop_service.get_all(session)
        count_shops = len(shops)
        
        # Получаем все периоды за год
        all_periods = await period_service.get_by_year(period.year, session)
        if not all_periods:
            return {
                "count_category": count_category,
                "count_shops": count_shops,
                "all_yearly_procent": 0.0
            }
        
        # Получаем годовой период для плановых значений
        yearly_period = next((p for p in all_periods if p.quarter is None and p.month is None), None)
        
        # Вычисляем общий годовой процент выполнения
        actual_values = []
        plan_values = []
        
        # Получаем все плановые значения из годового периода
        if yearly_period:
            plan_values = await plan_value_service.get_by_period(yearly_period.id, session)
        
        # Получаем все фактические значения из всех периодов
        for p in all_periods:
            period_actuals = await actual_value_service.get_by_period(p.id, session)
            actual_values.extend(period_actuals)
        
        total_actual = sum(av.value for av in actual_values)
        total_plan = sum(pv.value for pv in plan_values)
        
        all_yearly_procent = (float(total_actual) / float(total_plan) * 100) if total_plan != 0 else 0.0
        
        return {
            "count_category": count_category,
            "count_shops": count_shops,
            "all_yearly_procent": round(all_yearly_procent, 2)
        }
    
    async def _aggregate_categories_data(self, period: Period, session: AsyncSession) -> List[Dict[str, Any]]:
        """Агрегирует данные по категориям.
        
        Args:
            period: Текущий период
            session: Сессия SQLAlchemy
            
        Returns:
            Список с данными по категориям
        """
        categories = await category_service.get_all(session)
        result = []
        
        # Получаем все периоды за год
        all_periods = await period_service.get_by_year(period.year, session)
        if not all_periods:
            # Если периоды не найдены, возвращаем пустой список
            return result
        
        # Получаем годовой период для плановых значений
        yearly_period = next((p for p in all_periods if p.quarter is None and p.month is None), None)
        if not yearly_period:
            # Если годовой период не найден, возвращаем пустой список
            return result
        
        # Получаем все плановые значения для годового периода
        all_plan_values = await plan_value_service.get_by_period(yearly_period.id, session)
        
        # Получаем все фактические значения для всех периодов года
        all_actual_values = []
        for p in all_periods:
            # Добавляем фактические значения из каждого периода
            period_actuals = await actual_value_service.get_by_period(p.id, session)
            all_actual_values.extend(period_actuals)
        
        for category in categories:
            # Получаем метрики для категории
            metrics = await metric_service.get_by_category(category.id, session)
            metric_ids = [m.id for m in metrics]
            
            if not metric_ids:
                # Если у категории нет метрик, пропускаем
                continue
            
            # Фильтруем значения по метрикам данной категории
            # Учитываем все магазины при суммировании
            category_actuals = [av for av in all_actual_values if av.metric_id in metric_ids]
            category_plans = [pv for pv in all_plan_values if pv.metric_id in metric_ids]
            
            yearly_actual = sum(av.value for av in category_actuals)
            yearly_plan = sum(pv.value for pv in category_plans)
            
            # Вычисляем процент выполнения
            yearly_procent = (float(yearly_actual) / float(yearly_plan) * 100) if yearly_plan != 0 else 0.0
            
            # Получаем SVG данные для изображения категории, если они есть
            svg_data = ""
            if category.image_id:
                image = await image_service.get(id=category.image_id, session=session)
                if image and hasattr(image, 'svg_data'):
                    svg_data = image.svg_data
            
            result.append({
                "id": str(category.id),
                "name": category.name,
                "description": category.description or "",
                "image": svg_data,
                "yearly_actual": float(yearly_actual),
                "yearly_plan": float(yearly_plan),
                "yearly_procent": round(yearly_procent, 2)
            })
        
        return result
    
    async def _aggregate_shops_data(self, period: Period, session: AsyncSession) -> List[Dict[str, Any]]:
        """Агрегирует данные по магазинам.
        
        Args:
            period: Текущий период
            session: Сессия SQLAlchemy
            
        Returns:
            Список с данными по магазинам
        """
        shops = await shop_service.get_all(session)
        result = []
        
        # Получаем все периоды за год
        all_periods = await period_service.get_by_year(period.year, session)
        if not all_periods:
            # Если периоды не найдены, возвращаем пустой список
            return result
        
        # Получаем все фактические значения для всех периодов года
        all_actual_values = []
        for p in all_periods:
            # Добавляем фактические значения из каждого периода
            period_actuals = await actual_value_service.get_by_period(p.id, session)
            all_actual_values.extend(period_actuals)
        
        for shop in shops:
            # Фильтруем по данному магазину
            # Учитываем все метрики для данного магазина
            shop_actuals = [av for av in all_actual_values if av.shop_id == shop.id]
            
            # Суммируем значения по всем метрикам для данного магазина
            yearly_actual = sum(av.value for av in shop_actuals)
            
            result.append({
                "id": str(shop.id),
                "name": shop.name,
                "description": shop.description or "",
                "address": shop.address or "",
                "yearly_actual": float(yearly_actual)
            })
        
        return result
    
    def _get_empty_aggregated_data(self) -> Dict[str, Any]:
        """Возвращает структуру с пустыми данными для случая отсутствия данных.
        
        Returns:
            Структура данных с нулевыми значениями
        """
        return {
            "month_values": {
                "month_actual": 0.0,
                "month_plan": 0.0,
                "month_procent": 0.0
            },
            "dashboard_metrics": {
                "count_category": 0,
                "count_shops": 0,
                "all_yearly_procent": 0.0
            },
            "categories": [],
            "shops": []
        }

    async def get_detailed_category_metrics(
        self, 
        category_id: uuid.UUID,
        shop_id: uuid.UUID,
        year: int,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """
        Получение детальных метрик по категории и магазину за указанный год.
        
        Args:
            category_id: ID категории
            shop_id: ID магазина
            year: Год для выборки данных
            session: Сессия SQLAlchemy
            
        Returns:
            Структура с детальными метриками
        """
        # Проверяем существование категории и магазина
        category = await category_service.get(id=category_id, session=session)
        if not category:
            raise ValueError(f"Категория с ID {category_id} не найдена")
        
        shop = await shop_service.get(id=shop_id, session=session)
        if not shop:
            raise ValueError(f"Магазин с ID {shop_id} не найден")
        
        # Получаем все периоды для указанного года
        periods = await period_service.get_by_year(year, session)
        if not periods:
            raise ValueError(f"Периоды для года {year} не найдены")
        
        # Получаем метрики для данной категории
        metrics = await metric_service.get_by_category(category_id, session)
        if not metrics:
            raise ValueError(f"Метрики для категории {category.name} не найдены")
        
        # Разделяем периоды по типам
        year_period = None
        quarter_periods = {}
        month_periods = {}
        
        for p in periods:
            # Проверяем тип периода по атрибутам вместо вызова методов
            if p.quarter is None and p.month is None:  # Это годовой период
                year_period = p
            elif p.quarter is not None and p.month is None:  # Это квартальный период
                quarter_name = f"{self._get_roman_numeral(p.quarter)} квартал"
                quarter_periods[quarter_name] = p
            elif p.month is not None:  # Это месячный период
                month_name = self._get_month_name(p.month)
                month_periods[month_name] = p
        
        # Создаем результат
        result = {
            "metrics": [],
            "category_name": category.name,
            "shop_name": shop.name,
            "year": year
        }
        
        # Для каждой метрики получаем данные по периодам
        for metric in metrics:
            metric_data = {
                "metric_id": str(metric.id),
                "metric_name": metric.name,
                "unit": metric.unit,
                "periods_value": {
                    "year": None,
                    "quarters": {},
                    "months": {}
                }
            }
            
            # Получаем годовые значения
            if year_period:
                year_metric_data = await self._get_period_values(
                    year_period.id, metric.id, shop_id, session
                )
                metric_data["periods_value"]["year"] = year_metric_data
            
            # Получаем квартальные значения
            for quarter_name, quarter_period in quarter_periods.items():
                quarter_metric_data = await self._get_period_values(
                    quarter_period.id, metric.id, shop_id, session
                )
                metric_data["periods_value"]["quarters"][quarter_name] = quarter_metric_data
            
            # Получаем месячные значения
            for month_name, month_period in month_periods.items():
                month_metric_data = await self._get_period_values(
                    month_period.id, metric.id, shop_id, session
                )
                metric_data["periods_value"]["months"][month_name] = month_metric_data
            
            result["metrics"].append(metric_data)
        
        return result
    
    async def _get_period_values(
        self, 
        period_id: uuid.UUID,
        metric_id: uuid.UUID,
        shop_id: uuid.UUID,
        session: AsyncSession
    ) -> Dict[str, float]:
        """
        Получение значений плана, факта, отклонения и процента для конкретного периода, метрики и магазина.
        
        Args:
            period_id: ID периода
            metric_id: ID метрики
            shop_id: ID магазина
            session: Сессия SQLAlchemy
            
        Returns:
            Структура с данными по периоду
        """
        # Получаем плановое значение
        plan_value = await plan_value_service.get_by_params(
            metric_id=metric_id, 
            shop_id=shop_id, 
            period_id=period_id, 
            session=session
        )
        
        # Получаем фактическое значение
        actual_value = await actual_value_service.get_by_params(
            metric_id=metric_id, 
            shop_id=shop_id, 
            period_id=period_id, 
            session=session
        )
        
        # Устанавливаем значения по умолчанию
        plan = Decimal('0')
        actual = Decimal('0')
        
        if plan_value:
            plan = plan_value.value
        
        if actual_value:
            actual = actual_value.value
        
        # Вычисляем отклонение (variance) как план-факт
        variance = plan - actual
        
        # Вычисляем процент выполнения
        procent = (float(actual) / float(plan) * 100) if plan != 0 else 0.0
        
        return {
            "plan": float(plan),
            "actual": float(actual),
            "variance": float(variance),  # Здесь план-факт
            "procent": round(procent, 2)
        }
    
    def _get_roman_numeral(self, num: int) -> str:
        """Преобразует число в римскую цифру."""
        roman_numerals = {1: "I", 2: "II", 3: "III", 4: "IV"}
        return roman_numerals.get(num, str(num))
    
    def _get_month_name(self, month: int) -> str:
        """Возвращает название месяца по его номеру."""
        month_names = {
            1: "январь", 2: "февраль", 3: "март", 4: "апрель",
            5: "май", 6: "июнь", 7: "июль", 8: "август",
            9: "сентябрь", 10: "октябрь", 11: "ноябрь", 12: "декабрь"
        }
        return month_names.get(month, str(month))


# Инициализация сервиса
analytics_service = AnalyticsService()
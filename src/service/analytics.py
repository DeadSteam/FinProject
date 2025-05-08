import uuid
from typing import List, Dict, Optional, Tuple, Any
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.model.finance import Period, Shop, Metric, Category
from src.scheme.finance import Period as PeriodSchema
from src.service.finance import (
    period_service, shop_service, metric_service, category_service,
    actual_value_service, plan_value_service
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


# Инициализация сервиса
analytics_service = AnalyticsService()
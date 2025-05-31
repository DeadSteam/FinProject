from typing import List, Dict

from src.scheme.base import BaseSchema


class MonthValues(BaseSchema):
    """Схема для значений по месяцам."""
    month_actual: float
    month_plan: float
    month_procent: float


class DashboardMetrics(BaseSchema):
    """Схема для метрик дашборда."""
    count_category: int
    count_shops: int
    all_yearly_procent: float


class CategoryStats(BaseSchema):
    """Схема для статистики по категориям."""
    id: str
    name: str
    description: str
    image: str
    yearly_actual: float
    yearly_plan: float
    yearly_procent: float


class ShopStats(BaseSchema):
    """Схема для статистики по магазинам."""
    id: str
    name: str
    description: str
    address: str
    yearly_actual: float


class AggregatedData(BaseSchema):
    """Схема для агрегированных данных дашборда."""
    month_values: MonthValues
    dashboard_metrics: DashboardMetrics
    categories: List[CategoryStats]
    shops: List[ShopStats]


class PeriodValue(BaseSchema):
    """Схема для значений по периоду."""
    plan: float
    actual: float
    variance: float
    procent: float


class MetricPeriodValues(BaseSchema):
    """Схема для значений метрики по периодам."""
    year: PeriodValue
    quarters: Dict[str, PeriodValue]
    months: Dict[str, PeriodValue]


class DetailedMetric(BaseSchema):
    """Схема для детализированной метрики."""
    metric_id: str
    metric_name: str
    unit: str
    periods_value: MetricPeriodValues


class DetailedCategoryMetrics(BaseSchema):
    """Схема для детализированных метрик категории."""
    metrics: List[DetailedMetric]
    category_name: str
    shop_name: str
    year: int 
# Унифицированная система графиков

## Обзор

Новая система графиков объединяет всю логику работы с графиками в единую архитектуру, устраняя дублирование кода и обеспечивая консистентность во всем приложении.

## Архитектура

### Базовые компоненты

1. **BaseChart** - Универсальный базовый компонент для всех типов графиков
2. **PlanVsActualChart** - Специализированный компонент для графиков "План vs Факт"
3. **ComparisonChart** - Компонент для сравнительной аналитики
4. **TrendsChart** - Компонент для анализа трендов

### Утилиты

- **chartDataUtils.js** - Централизованные функции для подготовки и обработки данных

## Использование

### Базовый график

```jsx
import { BaseChart } from '../charts';

<BaseChart
    data={chartData}
    title="Мой график"
    chartType="bar"
    selectedMetrics={['plan', 'actual']}
    showHeader={true}
    showTable={true}
    showSummary={true}
/>
```

### План vs Факт

```jsx
import { PlanVsActualChart } from '../charts';

<PlanVsActualChart
    analyticsData={analyticsData}
    filters={filters}
    isLoading={isLoading}
    showHeader={true}
    showSummary={true}
    showTable={true}
    chartType="bar"
    groupBy="categories"
    selectedMetrics={['plan', 'actual']}
/>
```

### Сравнительная аналитика

```jsx
import { ComparisonChart } from '../charts';

<ComparisonChart
    analyticsData={analyticsData}
    filters={filters}
    isLoading={isLoading}
    chartType="bar"
    viewMode="chart"
    groupBy="years"
    selectedMetrics={['plan', 'actual']}
/>
```

### Анализ трендов

```jsx
import { TrendsChart } from '../charts';

<TrendsChart
    analyticsData={analyticsData}
    filters={filters}
    isLoading={isLoading}
    chartType="line"
    trendType="absolute"
    smoothing={false}
    showForecast={false}
/>
```

## Пропсы

### BaseChart

| Проп | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| data | Array | - | Данные для графика |
| analyticsData | Object | - | Исходные данные аналитики |
| filters | Object | {} | Фильтры |
| isLoading | Boolean | false | Состояние загрузки |
| showControls | Boolean | false | Показать контролы |
| showTable | Boolean | false | Показать таблицу |
| showSummary | Boolean | false | Показать сводку |
| showHeader | Boolean | false | Показать заголовок |
| chartType | String | 'bar' | Тип графика |
| groupBy | String | 'categories' | Группировка данных |
| selectedMetrics | Array | ['plan', 'actual'] | Выбранные метрики |
| title | String | 'График' | Заголовок |
| disableAnimations | Boolean | false | Отключить анимации |

## Преимущества

1. **Устранение дублирования** - Вся логика подготовки данных централизована
2. **Консистентность** - Единый интерфейс для всех графиков
3. **Переиспользование** - Компоненты можно использовать в разных частях приложения
4. **Легкость поддержки** - Изменения в одном месте влияют на все графики
5. **Типизация** - Четкие интерфейсы и пропсы

## Миграция

Старые компоненты были заменены на новые:

- `AnalyticsCharts` → `PlanVsActualChart`
- `AnalyticsComparison` → `ComparisonChart`
- `AnalyticsTrends` → `TrendsChart`
- `ReportChart` → `BaseChart`
- `PlanVsActualChart` (reports) → `PlanVsActualChart` (charts)

## Обратная совместимость

Старые компоненты `Chart` и `ChartJSAdapter` остаются доступными для обратной совместимости.



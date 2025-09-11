/**
 * Централизованный экспорт всех компонентов графиков
 * Унифицированная система графиков для всего приложения
 */

// Основные компоненты
export { default as BaseChart } from './BaseChart';
export { default as PlanVsActualChart } from './PlanVsActualChart';
export { default as ComparisonChart } from './ComparisonChart';
export { default as TrendsChart } from './TrendsChart';

// Утилиты
export * from './utils/chartDataUtils';

// Переиспользуемые компоненты (для обратной совместимости)
export { default as Chart } from '../ui/Chart';
export { default as ChartJSAdapter } from '../reports/ChartJSAdapter';



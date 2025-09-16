/**
 * Общий компонент-обертка для графиков
 * Унифицирует API и устраняет дублирование кода
 */

import React from 'react';
import BaseChart from '../BaseChart';
import { ChartLoading, ChartNoData, ChartSelectMetrics, ChartHeader } from './ChartStates';

/**
 * Общий компонент-обертка для графиков
 */
const ChartWrapper = ({
  // Данные
  analyticsData,
  chartData,
  filters = {},
  
  // Состояние
  isLoading = false,
  hasData = false,
  hasSelectedMetrics = true,
  
  // Настройки отображения
  showHeader = false,
  showTable = false,
  showSummary = false,
  showControls = false,
  
  // Настройки графика
  chartType = 'bar',
  viewMode = 'chart',
  groupBy = 'categories',
  selectedMetrics = ['plan', 'actual'],
  title = 'График',
  subtitle,
  
  // Дополнительные настройки
  disableAnimations = false,
  className = '',
  
  // Обработчики
  onDataChange,
  onFilterChange,
  
  // Дополнительные компоненты
  children,
  customNoData,
  customLoading,
  
  // Специфичные настройки
  actualGroupBy = 'categories',
  statistics = null
}) => {
  // Если загружается
  if (isLoading) {
    return customLoading || <ChartLoading message="Загрузка данных..." />;
  }

  // Если нет данных
  if (!analyticsData || !hasData) {
    return customNoData || <ChartNoData title="Нет данных для отображения" />;
  }

  // Если не выбраны метрики (для месячных/квартальных режимов)
  if (!hasSelectedMetrics && (actualGroupBy === 'monthly' || actualGroupBy === 'quarterly')) {
    return <ChartSelectMetrics message="Выберите показатели" />;
  }

  return (
    <div className={`chart-wrapper ${className}`}>
      {/* Заголовок */}
      <ChartHeader 
        title={title}
        subtitle={subtitle}
        showHeader={showHeader}
      />
      
      {/* График */}
      {(viewMode === 'chart' || viewMode === 'both') && (
        <div>
          {chartData && Array.isArray(chartData) && chartData.length > 0 ? (
            <BaseChart
              data={chartData}
              analyticsData={analyticsData}
              filters={filters}
              isLoading={isLoading}
              showControls={showControls}
              viewMode={viewMode}
              showTable={showTable || viewMode === 'table' || viewMode === 'both'}
              showSummary={showSummary}
              showHeader={false} // Заголовок уже показан выше
              chartType={chartType}
              groupBy={groupBy}
              selectedMetrics={selectedMetrics}
              title={title}
              disableAnimations={disableAnimations}
              onDataChange={onDataChange}
              onFilterChange={onFilterChange}
            />
          ) : (
            <ChartNoData 
              title="Нет данных для отображения"
              message="Выберите фильтры для отображения данных"
            />
          )}
        </div>
      )}
      
      {/* Дополнительные компоненты */}
      {children}
    </div>
  );
};

export default ChartWrapper;

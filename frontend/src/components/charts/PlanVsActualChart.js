import React from 'react';
import BaseChart from './BaseChart';
import { prepareChartData, calculateStatistics } from './utils/chartDataUtils';

/**
 * Специализированный компонент для графиков "План vs Факт"
 * Использует BaseChart с предустановленными настройками
 */
const PlanVsActualChart = ({
    analyticsData,
    filters = {},
    isLoading = false,
    showControls = false,
    showTable = false,
    showSummary = false,
    showHeader = false,
    chartType = 'bar',
    viewMode = 'chart',
    groupBy = 'categories',
    selectedMetrics = ['plan', 'actual'],
    title = 'План vs Факт',
    disableAnimations = false,
    className = '',
    onDataChange,
    onFilterChange
}) => {
    
    // Подготавливаем данные для графика
    const chartData = prepareChartData(analyticsData, groupBy, filters);
    
    // Вычисляем статистику
    const statistics = calculateStatistics(chartData);
    
    return (
        <BaseChart
            data={chartData}
            analyticsData={analyticsData}
            filters={filters}
            isLoading={isLoading}
            showControls={showControls}
            viewMode={viewMode}
            showTable={showTable || viewMode === 'table' || viewMode === 'both'}
            showSummary={showSummary}
            showHeader={showHeader}
            chartType={chartType}
            groupBy={groupBy}
            selectedMetrics={selectedMetrics}
            title={title}
            disableAnimations={disableAnimations}
            className={`plan-vs-actual-chart ${className}`}
            onDataChange={onDataChange}
            onFilterChange={onFilterChange}
        />
    );
};

export default PlanVsActualChart;


import React from 'react';
import BaseChart from './BaseChart';

/**
 * Специализированный компонент для графиков "План vs Факт"
 * Использует унифицированный ChartWrapper
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
    return (
        <BaseChart
            analyticsData={analyticsData}
            filters={filters}
            isLoading={isLoading}
            showHeader={showHeader}
            showTable={showTable}
            showSummary={showSummary}
            showControls={showControls}
            chartType={chartType}
            viewMode={viewMode}
            groupBy={groupBy}
            selectedMetrics={selectedMetrics}
            title={title}
            disableAnimations={disableAnimations}
            className={`plan-vs-actual-chart ${className}`}
            onDataChange={onDataChange}
            onFilterChange={onFilterChange}
            smoothing={filters?.smoothing === true}
            showForecast={filters?.showForecast === true}
        />
    );
};

export default PlanVsActualChart;
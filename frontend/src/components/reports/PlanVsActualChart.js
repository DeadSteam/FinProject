import React from 'react';
import { PlanVsActualChart as BasePlanVsActualChart } from '../charts';

/**
 * Компонент для отображения диаграмм "План vs Факт" в отчетах
 * Теперь использует унифицированную систему графиков
 */
const PlanVsActualChart = ({ 
    analyticsData, 
    filters, 
    isLoading, 
    showControls = false, 
    showTable = false, 
    showSummary = false, 
    showHeader = false 
}) => {
    return (
        <BasePlanVsActualChart
            analyticsData={analyticsData}
            filters={filters}
            isLoading={isLoading}
            showControls={showControls}
            showTable={showTable}
            showSummary={showSummary}
            showHeader={showHeader}
            chartType={filters.chartType || 'bar'}
            groupBy={filters.groupBy || 'categories'}
            selectedMetrics={filters.metrics || ['plan', 'actual']}
            title="План vs Факт"
            className="chartInReports"
        />
    );
};

export default PlanVsActualChart;



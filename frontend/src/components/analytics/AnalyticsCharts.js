import React from 'react';
import { PlanVsActualChart } from '../charts';

/**
 * Компонент для отображения диаграмм "План vs Факт"
 * Теперь использует унифицированную систему графиков
 */
const AnalyticsCharts = ({ filters, analyticsData, isLoading }) => {
    return (
        <div className="p-3">
            <PlanVsActualChart
                analyticsData={analyticsData}
                filters={filters}
                isLoading={isLoading}
                showHeader={true}
                showSummary={true}
                viewMode={filters.viewMode || 'chart'}
                showTable={filters.viewMode === 'table' || filters.viewMode === 'both'}
                chartType={filters.chartType || 'bar'}
                groupBy={filters.groupBy || 'categories'}
                selectedMetrics={filters.metrics || ['plan', 'actual']}
                title="План vs Факт"
            />
        </div>
    );
};

export default AnalyticsCharts; 
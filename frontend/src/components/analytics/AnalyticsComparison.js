import React from 'react';
import ComparisonChart from '../charts/ComparisonChart';

/**
 * Компонент для сравнительной аналитики.
 * Теперь использует унифицированную систему графиков
 */
const AnalyticsComparison = ({ 
    analyticsData, 
    filters, 
    isLoading, 
    showControls = false, 
    showTable = false, 
    showSummary = false, 
    showHeader = false 
}) => {
    return (
        <ComparisonChart
            analyticsData={analyticsData}
            filters={filters}
                    isLoading={isLoading}
            showControls={showControls}
            showTable={showTable}
            showSummary={showSummary}
            showHeader={showHeader}
            chartType={filters.chartType || 'bar'}
            viewMode={filters.viewMode || 'chart'}
            groupBy={filters.periodType === 'months' ? 'monthly' : 
                    filters.periodType === 'quarters' ? 'quarterly' : 'years'}
            selectedMetrics={filters.metrics || ['plan', 'actual']}
            title="Сравнительная аналитика"
        />
    );
};

export default AnalyticsComparison; 

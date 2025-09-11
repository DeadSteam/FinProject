import React from 'react';
import { BaseChart } from '../charts';

/**
 * Обертка для Chart компонента специально для отчетов
 * Теперь использует унифицированную систему графиков
 */
const ReportChart = ({ data, title, type, selectedMetrics, isFiltering, unit }) => {
    return (
        <div className="report-chart-wrapper">
            <BaseChart
                data={data}
                title={title}
                chartType={type}
                selectedMetrics={selectedMetrics}
                disableAnimations={isFiltering}
                showHeader={false}
                showTable={false}
                showSummary={false}
            />
            {unit && (
                <div className="chart-unit-info">
                    <small className="text-muted">Единица измерения: {unit}</small>
                </div>
            )}
        </div>
    );
};

export default ReportChart;

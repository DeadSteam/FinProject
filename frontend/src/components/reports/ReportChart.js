import React from 'react';
import Chart from '../ui/Chart';
import './ReportChart.css';

/**
 * Обертка для Chart компонента специально для отчетов
 * с увеличенными размерами и стилями
 */
const ReportChart = ({ data, title, type, selectedMetrics, isFiltering, unit }) => {
    const dev = typeof window !== 'undefined' && 
                window.location.hostname === 'localhost' && 
                ['3000', '3001'].includes(window.location.port);

    // Подготавливаем данные для Chart компонента
    const prepareChartData = (rawData) => {
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return [];
        }

        // Если данные уже в правильном формате, возвращаем как есть
        if (rawData[0] && rawData[0].label) {
            return rawData;
        }

        // Если данные содержат метрики, преобразуем их
        if (rawData[0] && rawData[0].data) {
            return rawData[0].data;
        }

        return rawData;
    };

    const chartData = prepareChartData(data);
    

    return (
        <div className="report-chart-wrapper">
            <Chart
                data={chartData}
                title={title}
                type={type}
                selectedMetrics={selectedMetrics}
                isFiltering={isFiltering}
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

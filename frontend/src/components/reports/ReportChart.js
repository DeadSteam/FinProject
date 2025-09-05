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
        console.log('🔍 ReportChart prepareChartData: rawData:', rawData);
        console.log('🔍 ReportChart prepareChartData: rawData type:', typeof rawData);
        console.log('🔍 ReportChart prepareChartData: rawData is array:', Array.isArray(rawData));
        console.log('🔍 ReportChart prepareChartData: rawData length:', rawData?.length);
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
            console.log('🔍 ReportChart prepareChartData: Нет данных или пустой массив');
            return [];
        }

        // Если данные уже в правильном формате, возвращаем как есть
        if (rawData[0] && rawData[0].label) {
            console.log('🔍 ReportChart prepareChartData: Данные уже в правильном формате');
            return rawData;
        }

        // Если данные содержат метрики, преобразуем их
        if (rawData[0] && rawData[0].data) {
            console.log('🔍 ReportChart prepareChartData: Преобразуем данные из rawData[0].data');
            return rawData[0].data;
        }

        console.log('🔍 ReportChart prepareChartData: Возвращаем rawData как есть');
        return rawData;
    };

    const chartData = prepareChartData(data);
    
    console.log('🔍 ReportChart: data:', data);
    console.log('🔍 ReportChart: data type:', typeof data);
    console.log('🔍 ReportChart: data is array:', Array.isArray(data));
    console.log('🔍 ReportChart: data length:', data?.length);
    console.log('🔍 ReportChart: chartData:', chartData);
    console.log('🔍 ReportChart: chartData type:', typeof chartData);
    console.log('🔍 ReportChart: chartData is array:', Array.isArray(chartData));
    console.log('🔍 ReportChart: chartData length:', chartData?.length);
    console.log('🔍 ReportChart: selectedMetrics:', selectedMetrics);
    console.log('🔍 ReportChart: type:', type);

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

import React, { useMemo } from 'react';
import ChartWrapper from './common/ChartWrapper';
import BaseChart from './BaseChart';
import { useChartData } from './hooks/useChartData';
import { normalizeMetric } from './utils/chartDataUtils';
import AnalyticsTable from '../analytics/AnalyticsTable';

/**
 * Специализированный компонент для сравнительных графиков
 * Поддерживает месячные и квартальные данные с группировкой по годам
 */
const ComparisonChart = ({
    analyticsData,
    filters = {},
    isLoading = false,
    showControls = false,
    showTable = false,
    showSummary = false,
    showHeader = false,
    chartType = 'bar',
    viewMode = 'chart',
    groupBy = 'years',
    selectedMetrics = ['plan', 'actual'],
    title = 'Сравнительная аналитика',
    disableAnimations = false,
    className = '',
    onDataChange,
    onFilterChange
}) => {
    // Используем хук для работы с данными
    const { chartData, statistics, actualGroupBy, hasData, hasSelectedMetrics } = useChartData({
        analyticsData,
        filters,
        groupBy,
        selectedMetrics,
        isLoading
    });

    // Поворотная таблица для месячных/квартальных режимов
    const { pivotColumns, pivotRows } = useMemo(() => {
        if (!chartData || (actualGroupBy !== 'monthly' && actualGroupBy !== 'quarterly')) {
            return { pivotColumns: null, pivotRows: null };
        }

        const metrics = (filters.metrics || ['plan', 'actual']).map(m => normalizeMetric(m));
        const years = (filters.years || []).map(y => String(y));

        // Берем первую метрику, чтобы получить список периодов
        const firstMetricKey = metrics[0];
        const firstMetricSeries = chartData[firstMetricKey] || [];
        if (!Array.isArray(firstMetricSeries) || firstMetricSeries.length === 0) {
            return { pivotColumns: null, pivotRows: null };
        }

        // Заголовки: первая фиксированная колонка + группы по метрикам, внутри — года
        const metricTitles = {
            plan: 'План',
            actual: 'Факт',
            fact: 'Факт',
            deviation: 'Отклонение',
            percentage: '% выполнения'
        };

        const columns = [
            { key: 'period', header: 'Период', sticky: true, align: 'left', width: '220px' }
        ];

        metrics.forEach(metric => {
            years.forEach(year => {
                columns.push({
                    key: `${metric}_${year}`,
                    header: year,
                    subHeader: metricTitles[metric] || metric,
                    align: 'right',
                    width: '120px'
                });
            });
        });

        // Строки
        const rows = firstMetricSeries.map((point, idx) => {
            const row = { period: point.label };
            metrics.forEach(metric => {
                const series = chartData[metric] || [];
                const item = series[idx] || {};
                years.forEach(year => {
                    row[`${metric}_${year}`] = item[year] ?? 0;
                });
            });
            return row;
        });

        return { pivotColumns: columns, pivotRows: rows };
    }, [chartData, actualGroupBy, filters.metrics, filters.years]);

    // Для месячных/квартальных данных показываем отдельные графики для каждой метрики
    const renderMultipleCharts = () => {
        if (actualGroupBy !== 'monthly' && actualGroupBy !== 'quarterly') {
            return null;
        }
        
        if (!filters.metrics || filters.metrics.length === 0) {
            return null; // ChartWrapper покажет сообщение о выборе показателей
        }
        
        return filters.metrics.map(metricRaw => {
            const normalized = normalizeMetric(metricRaw);
            const metricData = chartData[normalized] || [];
            
            const metricTitles = {
                'plan': 'План',
                'fact': 'Факт',
                'actual': 'Факт',
                'deviation': 'Отклонение',
                'percentage': '% выполнения'
            };
            
            return (
                <div key={normalized} className="mb-4">
                    <ChartWrapper
                        analyticsData={analyticsData}
                        chartData={metricData}
                        filters={filters}
                        isLoading={isLoading}
                        hasData={Array.isArray(metricData) && metricData.length > 0}
                        hasSelectedMetrics={true}
                        showHeader={false}
                        showTable={false}
                        showSummary={false}
                        showControls={false}
                        chartType={chartType}
                        viewMode={'chart'}
                        groupBy={groupBy}
                        selectedMetrics={(filters.years || []).map(year => String(year))}
                        title={`${metricTitles[normalized] || normalized} ${actualGroupBy === 'monthly' ? 'по месяцам' : 'по кварталам'}`}
                        disableAnimations={disableAnimations}
                        className="comparison-metric-chart"
                    />
                </div>
            );
        });
    };

    // Для обычных режимов показываем один график
    const renderSingleChart = () => {
        if (actualGroupBy === 'monthly' || actualGroupBy === 'quarterly') {
            return null;
        }
        
        return (
            <BaseChart
                analyticsData={analyticsData}
                filters={filters}
                isLoading={isLoading}
                showHeader={false}
                showTable={showTable || viewMode === 'table' || viewMode === 'both'}
                showSummary={false}
                showControls={showControls}
                chartType={chartType}
                viewMode={viewMode}
                groupBy={groupBy}
                selectedMetrics={(filters.metrics || ['plan', 'fact']).map(m => (m?.value ?? m?.id ?? m))}
                title={title}
                disableAnimations={disableAnimations}
                className="comparison-single-chart"
                smoothing={filters?.smoothing === true}
                showForecast={filters?.showForecast === true}
            />
        );
    };

    return (
        <div className={`comparison-chart ${className}`}>
            {/* Заголовок */}
            {showHeader && (
                <div className="row mb-4">
                    <div className="col-12">
                        <h4 className="mb-0">{title}</h4>
                        <p className="text-muted mb-0">Сравнение показателей по выбранным критериям</p>
                    </div>
                </div>
            )}
            
            {/* Графики */}
            {(viewMode === 'chart' || viewMode === 'both') && (
                <>
                    {/* Множественные графики для monthly/quarterly */}
                    {renderMultipleCharts()}
                    {/* Одиночный график для обычных режимов */}
                    {renderSingleChart()}
                </>
            )}

            {/* Таблица для месячных/квартальных режимов */}
            {(viewMode === 'table' || viewMode === 'both') && (actualGroupBy === 'monthly' || actualGroupBy === 'quarterly') && pivotRows && pivotColumns && (
                <div className="mt-3">
                    <AnalyticsTable
                        data={pivotRows}
                        columns={pivotColumns}
                        title="Детальные данные"
                    />
                </div>
            )}
            
            {/* Сводка */}
            {showSummary && statistics && (
                <div className="card">
                    <div className="card-body">
                        <h6 className="card-title">Краткая информация о выборке</h6>
                        <div className="row text-center">
                            <div className="col-3">
                                <strong className="text-primary d-block">{filters.years?.length || 0}</strong>
                                <small className="text-muted">Выбрано лет</small>
                            </div>
                            <div className="col-3">
                                <strong className="text-success d-block">
                                    {filters.categories?.length || 'Все'}
                                </strong>
                                <small className="text-muted">Категорий</small>
                            </div>
                            <div className="col-3">
                                <strong className="text-warning d-block">
                                    {filters.shops?.length || 'Все'}
                                </strong>
                                <small className="text-muted">Магазинов</small>
                            </div>
                            <div className="col-3">
                                <strong className="text-info d-block">{filters.metrics?.length || 0}</strong>
                                <small className="text-muted">Показателей</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComparisonChart;
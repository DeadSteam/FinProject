import React, { useMemo } from 'react';
import BaseChart from './BaseChart';
import { prepareChartData, calculateStatistics, normalizeMetric } from './utils/chartDataUtils';
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
    
    // Определяем тип группировки на основе фильтров
    const actualGroupBy = useMemo(() => {
        const pt = filters?.periodType;
        if (pt === 'months') return 'monthly';
        if (pt === 'quarters') return 'quarterly';
        return groupBy;
    }, [filters?.periodType, groupBy]);
    
    // Подготавливаем данные для графика
    const chartData = useMemo(() => {
        return prepareChartData(analyticsData, actualGroupBy, filters);
    }, [analyticsData, actualGroupBy, filters]);

    // Поворотная таблица для месячных/квартальных режимов: одна таблица на все метрики
    const { pivotColumns, pivotRows } = useMemo(() => {
        if (!chartData || (actualGroupBy !== 'monthly' && actualGroupBy !== 'quarterly')) {
            return { pivotColumns: null, pivotRows: null };
        }

        const metrics = (filters.metrics || ['plan', 'actual']).map(m => normalizeMetric(m));
        const years = (filters.years || []).map(y => String(y));

        // Берем первую метрику, чтобы получить список периодов/длину
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
    
    // Вычисляем статистику
    const statistics = useMemo(() => {
        // Для месячных/квартальных данных chartData - это объект, а не массив
        if (actualGroupBy === 'monthly' || actualGroupBy === 'quarterly') {
            // Для месячных/квартальных данных статистика не нужна в сводке
            return null;
        }
        
        // Для обычных данных chartData - это массив
        if (Array.isArray(chartData)) {
            return calculateStatistics(chartData);
        }
        
        return null;
    }, [chartData, actualGroupBy]);
    
    // Для месячных/квартальных данных показываем отдельные графики для каждой метрики
    const renderMultipleCharts = () => {
        if (actualGroupBy !== 'monthly' && actualGroupBy !== 'quarterly') {
            return null;
        }
        
        if (!filters.metrics || filters.metrics.length === 0) {
            return (
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="text-center p-4 text-muted">
                            <h5>Выберите показатели</h5>
                            <p>Для просмотра графиков выберите показатели в фильтрах</p>
                        </div>
                    </div>
                </div>
            );
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
                    <BaseChart
                        data={metricData}
                        chartType={chartType}
                        viewMode={'chart'}
                        selectedMetrics={(filters.years || []).map(year => String(year))}
                        title={`${metricTitles[normalized] || normalized} ${actualGroupBy === 'monthly' ? 'по месяцам' : 'по кварталам'}`}
                        showHeader={false}
                        showTable={false}
                        showSummary={false}
                        disableAnimations={disableAnimations}
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
            <div style={{ width: '100%' }}>
                {chartData && chartData.length > 0 ? (
                    <BaseChart
                        data={chartData}
                        chartType={chartType}
                        viewMode={viewMode}
                        selectedMetrics={(filters.metrics || ['plan', 'fact']).map(m => (m?.value ?? m?.id ?? m))}
                        title={title}
                        showHeader={false}
                        showTable={showTable || viewMode === 'table' || viewMode === 'both'}
                        showSummary={false}
                        disableAnimations={disableAnimations}
                    />
                ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        Нет данных для отображения
                    </div>
                )}
            </div>
        );
    };
    
    if (isLoading) {
        return (
            <div className="text-center p-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Загрузка...</span>
                </div>
                <p className="mt-2">Загрузка данных для сравнения...</p>
            </div>
        );
    }
    
    if (!analyticsData || !chartData) {
        return (
            <div className="text-center p-4 text-muted">
                <div className="mb-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                        <path d="M3 3v18h18"/>
                        <path d="M18.7 8l-5.1 5.1-2.8-2.8L7 14.1"/>
                    </svg>
                </div>
                <h5>Нет данных для сравнения</h5>
                <p>Выберите фильтры для отображения сравнительной аналитики</p>
            </div>
        );
    }
    
    return (
        <div className={`comparison-chart ${className}`}>
            {showHeader && (
                <div className="row mb-4">
                    <div className="col-12">
                        <h4 className="mb-0">{title}</h4>
                        <p className="text-muted mb-0">Сравнение показателей по выбранным критериям</p>
                    </div>
                </div>
            )}
            
            {/* График */}
            {(viewMode === 'chart' || viewMode === 'both') && (
                <>
                    {/* Только графики для monthly/quarterly */}
                    {renderMultipleCharts()}
                </>
            )}

            {/* Для годового режима всегда рендерим BaseChart, он сам покажет таблицу/график по viewMode */}
            {renderSingleChart()}

            {/* Таблица для месячных/квартальных режимов — одна сводная таблица */}
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

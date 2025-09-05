import React, { useState, useMemo } from 'react';
import Chart from '../ui/Chart';
import AnalyticsDataTable from '../ui/AnalyticsDataTable';

/**
 * Компонент для отображения диаграмм "План vs Факт"
 */
const AnalyticsCharts = ({ filters, analyticsData, isLoading }) => {
    const [activeView, setActiveView] = useState('categories');
    const [chartType, setChartType] = useState('bar');

    console.log('🔍 AnalyticsCharts render:', { filters, analyticsData: !!analyticsData, isLoading });

    // Вспомогательная функция безопасного преобразования чисел
    const toSafeNumber = (value) => {
        const num = typeof value === 'string' ? parseFloat(String(value).replace(/\s/g, '').replace(',', '.')) : value;
        return Number.isFinite(num) ? num : 0;
    };

    // Функции подготовки данных для разных представлений
    const prepareCategoryChartData = (planVsActualData) => {
        if (!planVsActualData?.categories) return [];
        return Object.entries(planVsActualData.categories).map(([categoryName, data]) => ({
            label: categoryName,
            plan: toSafeNumber(data.plan || 0),
            fact: toSafeNumber(data.actual || 0),
            // 🎯 Передаем готовые данные с сервера
            deviation: toSafeNumber(data.deviation ?? (toSafeNumber(data.actual) - toSafeNumber(data.plan))),
            percentage: toSafeNumber(data.percentage ?? (toSafeNumber(data.plan) > 0 ? ((toSafeNumber(data.actual) / toSafeNumber(data.plan)) * 100) : 0))
        }));
    };

    const prepareShopChartData = (planVsActualData) => {
        if (!planVsActualData?.shops) return [];
        return Object.entries(planVsActualData.shops).map(([shopName, data]) => ({
            label: shopName,
            plan: toSafeNumber(data.plan || 0),
            fact: toSafeNumber(data.actual || 0),
            // 🎯 Передаем готовые данные с сервера
            deviation: toSafeNumber(data.deviation ?? (toSafeNumber(data.actual) - toSafeNumber(data.plan))),
            percentage: toSafeNumber(data.percentage ?? (toSafeNumber(data.plan) > 0 ? ((toSafeNumber(data.actual) / toSafeNumber(data.plan)) * 100) : 0))
        }));
    };

    const prepareMetricsChartData = (planVsActualData) => {
        if (!planVsActualData?.metrics) return [];
        return Object.entries(planVsActualData.metrics).map(([metricName, data]) => ({
            label: metricName,
            plan: toSafeNumber(data.plan || 0),
            fact: toSafeNumber(data.actual || 0),
            // 🎯 Передаем готовые данные с сервера
            deviation: toSafeNumber(data.deviation ?? (toSafeNumber(data.actual) - toSafeNumber(data.plan))),
            percentage: toSafeNumber(data.percentage ?? (toSafeNumber(data.plan) > 0 ? ((toSafeNumber(data.actual) / toSafeNumber(data.plan)) * 100) : 0))
        }));
    };



    // Подготовка данных для графика
    const chartData = useMemo(() => {
        if (!analyticsData?.planVsActual) return [];

        const planVsActualData = analyticsData.planVsActual;

        switch (activeView) {
            case 'categories':
                return prepareCategoryChartData(planVsActualData);
            case 'shops':
                return prepareShopChartData(planVsActualData);
            case 'metrics':
                return prepareMetricsChartData(planVsActualData);
            default:
                return [];
        }
    }, [analyticsData, activeView]);

    // Подготовка данных для таблицы
    const tableData = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];
        return chartData.map(item => ({
            name: item.label,
            plan: item.plan,
            fact: item.fact,
            deviation: item.deviation,
            percentage: item.percentage
        }));
    }, [chartData]);

    const tableColumns = [
        { key: 'name', title: 'Название', sortable: true },
        { key: 'plan', title: 'План', sortable: true, format: 'number' },
        { key: 'fact', title: 'Факт', sortable: true, format: 'number' },
        { key: 'deviation', title: 'Отклонение', sortable: true, format: 'number' },
        { key: 'percentage', title: '% выполнения', sortable: true, format: 'percent' }
    ];

    // Расчет статистики
    const statistics = useMemo(() => {
        if (!analyticsData?.planVsActualStats) return null;
        return {
            ...analyticsData.planVsActualStats,
            itemsCount: tableData?.length || 0
        };
    }, [analyticsData, tableData]);

    if (isLoading) {
        return (
            <div className="text-center p-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Загрузка...</span>
                </div>
                <p className="mt-2">Загрузка диаграмм...</p>
            </div>
        );
    }

    if (!analyticsData || !analyticsData.planVsActual) {
        return (
            <div className="text-center p-4 text-muted">
                <h5>Нет данных</h5>
                <p>Данные для сравнения планов и фактов отсутствуют</p>
            </div>
        );
    }

    return (
        <div className="p-3">
            {/* Управление */}
            <div className="row mb-4">
                <div className="col-md-8">
                    <h4 className="mb-0">План vs Факт</h4>
                    <p className="text-muted mb-0">Сравнение плановых и фактических показателей</p>
                </div>
                <div className="col-md-4">
                    <div className="d-flex gap-2 justify-content-end">
                        <div className="btn-group" role="group">
                            <button
                                className={`btn btn-sm ${activeView === 'categories' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveView('categories')}
                            >
                                По категориям
                            </button>
                            <button
                                className={`btn btn-sm ${activeView === 'shops' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveView('shops')}
                            >
                                По магазинам
                            </button>
                            <button
                                className={`btn btn-sm ${activeView === 'metrics' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveView('metrics')}
                            >
                                По метрикам
                            </button>

                        </div>
                        <select 
                            className="form-select form-select-sm"
                            value={chartType} 
                            onChange={(e) => setChartType(e.target.value)}
                        >
                            <option value="bar">Столбцы</option>
                            <option value="line">Линии</option>
                            <option value="pie">Круговая</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Основной график */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">План vs Факт</h5>
                    <div style={{ height: '400px' }}>
                        {chartData && chartData.length > 0 ? (
                            <Chart
                                type={chartType}
                                data={chartData}
                                selectedMetrics={filters.metrics || ['plan', 'fact']}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                Нет данных для выбранного представления
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Статистика */}
            {statistics && (
                <div className="card mb-4">
                    <div className="card-body">
                        <h6 className="card-title">Статистика</h6>
                        <div className="row text-center">
                            <div className="col">
                                <strong className="text-primary d-block">{statistics.totalPlan.toLocaleString('ru-RU')}</strong>
                                <small className="text-muted">Общий план</small>
                            </div>
                            <div className="col">
                                <strong className="text-success d-block">{statistics.totalFact.toLocaleString('ru-RU')}</strong>
                                <small className="text-muted">Общий факт</small>
                            </div>
                            <div className="col">
                                <strong className={`d-block ${statistics.totalDeviation >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {statistics.totalDeviation.toLocaleString('ru-RU')}
                                </strong>
                                <small className="text-muted">Отклонение</small>
                            </div>
                            <div className="col">
                                <strong className={`d-block ${statistics.totalPercentage >= 100 ? 'text-success' : 'text-warning'}`}>
                                    {statistics.totalPercentage.toFixed(1)}%
                                </strong>
                                <small className="text-muted">% выполнения</small>
                            </div>
                            <div className="col">
                                <strong className="text-info d-block">{statistics.itemsCount}</strong>
                                <small className="text-muted">Количество</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Детальные данные */}
            <div className="card">
                <div className="card-body">
                    <h6 className="card-title">Детальные данные</h6>
                    {tableData && tableData.length > 0 ? (
                        <AnalyticsDataTable
                            data={tableData}
                            columns={tableColumns}
                            defaultSort={{ key: 'percentage', direction: 'desc' }}
                        />
                    ) : (
                        <div className="text-center text-muted p-3">
                            Нет данных для отображения в таблице
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsCharts; 
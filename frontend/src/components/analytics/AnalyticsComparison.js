import React, { useState, useMemo } from 'react';
import Chart from '../ui/Chart';
import AnalyticsDataTable from '../ui/AnalyticsDataTable';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Компонент для сравнительной аналитики.
 * Отображает данные в виде графиков и таблиц для сравнения по различным измерениям.
 */
const AnalyticsComparison = ({ analyticsData, filters, isLoading, showControls = false, showTable = false, showSummary = false, showHeader = false }) => {
    const [chartType, setChartType] = useState('bar');
    const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table' | 'both'
    // Управляемая группировка от фильтра periodType
    const groupBy = useMemo(() => {
        const pt = filters?.periodType;
        if (pt === 'months') return 'monthly_metrics';
        if (pt === 'quarters') return 'quarterly_metrics';
        return 'year';
    }, [filters?.periodType]);

    // Функции подготовки данных для графиков
    const prepareYearlyData = (comparisonData, filters) => {
        if (!comparisonData.yearly) return [];
        return filters.years
            .sort((a, b) => a - b)
            .map(year => {
                const y = String(year);
                const yearData = comparisonData.yearly[year] || comparisonData.yearly[y] || {};
                const plan = Number(yearData.plan ?? 0) || 0;
                const actual = Number(yearData.actual ?? yearData.fact ?? 0) || 0;
                const deviation = Number(yearData.deviation ?? yearData.difference ?? (actual - plan)) || 0;
                const percentage = Number(yearData.percentage ?? (plan ? (actual / plan) * 100 : 0)) || 0;
                return {
                    label: y,
                    plan,
                    fact: actual,
                    deviation,
                    percentage
                };
            });
    };

    const prepareCategoryData = (comparisonData, filters) => {
        if (!comparisonData.categories) return [];
        return Object.entries(comparisonData.categories).map(([categoryName, categoryData]) => {
            const plan = Number(categoryData.plan ?? 0) || 0;
            const actual = Number(categoryData.actual ?? categoryData.fact ?? 0) || 0;
            const deviation = Number(categoryData.deviation ?? categoryData.difference ?? (actual - plan)) || 0;
            const percentage = Number(categoryData.percentage ?? (plan ? (actual / plan) * 100 : 0)) || 0;
            return {
                label: categoryName,
                plan,
                fact: actual,
                deviation,
                percentage
            };
        });
    };

    const prepareShopData = (comparisonData, filters) => {
        if (!comparisonData.shops) return [];
        return Object.entries(comparisonData.shops).map(([shopName, shopData]) => {
            const plan = Number(shopData.plan ?? 0) || 0;
            const actual = Number(shopData.actual ?? shopData.fact ?? 0) || 0;
            const deviation = Number(shopData.deviation ?? shopData.difference ?? (actual - plan)) || 0;
            const percentage = Number(shopData.percentage ?? (plan ? (actual / plan) * 100 : 0)) || 0;
            return {
                label: shopName,
                plan,
                fact: actual,
                deviation,
                percentage
            };
        });
    };



    // Вспомогательная функция: ищем подходящий ключ среди кандидатов
    const getExistingKey = (obj, candidates) => {
        if (!obj) return undefined;
        for (const cand of candidates) {
            if (cand in obj) return cand;
        }
        // Пытаемся понижать регистр и сравнивать без регистра
        const lowerMap = Object.keys(obj).reduce((acc, k) => { acc[k.toLowerCase()] = k; return acc; }, {});
        for (const cand of candidates) {
            const found = lowerMap[cand.toLowerCase()];
            if (found) return found;
        }
        return undefined;
    };

    // Нормализация имени метрики
    const normalizeMetric = (metric) => {
        const m = (metric?.value ?? metric?.id ?? metric ?? '').toString();
        if (m === 'fact') return 'actual';
        return m;
    };

    // Новая функция для подготовки квартальных данных по метрикам (аналогично месячным)
    const prepareQuarterlyMetricsData = (analyticsData, filters) => {
        if (!analyticsData?.trends?.quarterly || !filters.metrics || !filters.years) {
            return {};
        }
        
        const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
        
        // Создаем отдельные данные для каждой метрики
        const metricCharts = {};
        
        filters.metrics.forEach(metricRaw => {
            const metric = normalizeMetric(metricRaw);
            const quarterlyData = [];
            
            // Для каждого квартала создаем точку данных с столбцами по годам
            for (let quarter = 1; quarter <= 4; quarter++) {
                const quarterData = {
                    label: quarterNames[quarter - 1],
                    quarter: quarter
                };
                
                // Добавляем данные для каждого года как отдельные столбцы
                filters.years.forEach(year => {
                    const yearBlock = analyticsData.trends.quarterly[year] || analyticsData.trends.quarterly[String(year)];
                    const quarterKey = getExistingKey(yearBlock, [
                        `Q${quarter}`, `${quarter}`, `К${quarter}`, `${quarter} квартал`, `${quarter}-квартал`
                    ]);
                    const yearData = (yearBlock && yearBlock[quarterKey]) || {};
                    
                    let value = 0;
                    
                    if (metric === 'actual') {
                        value = yearData['actual'] || yearData['fact'] || 0;
                    } else if (metric === 'plan') {
                        value = yearData['plan'] || 0;
                    } else if (metric === 'deviation') {
                        const planVal = Number(yearData['plan'] ?? 0) || 0;
                        const factVal = Number(yearData['actual'] ?? yearData['fact'] ?? 0) || 0;
                        value = yearData['deviation'] ?? yearData['difference'] ?? (factVal - planVal);
                    } else if (metric === 'percentage') {
                        value = yearData['percentage'] || 0;
                    } else {
                        value = yearData[metric] || 0;
                    }
                    
                    quarterData[`${year}`] = value;
                });
                
                quarterlyData.push(quarterData);
            }
            
            metricCharts[metric] = quarterlyData;
        });
        
        return metricCharts;
    };

    // Новая функция для подготовки месячных данных по метрикам  
    const prepareMonthlyMetricsData = (analyticsData, filters) => {
        if (!analyticsData?.trends?.monthly || !filters.metrics || !filters.years) {
            return {};
        }
        
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        
        // Английские названия месяцев (как в бэкенде)
        const monthNamesEn = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        // Создаем отдельные данные для каждой метрики
        const metricCharts = {};
        
        filters.metrics.forEach(metricRaw => {
            const metric = normalizeMetric(metricRaw);
            const monthlyData = [];
            
            // Для каждого месяца создаем точку данных с столбцами по годам
            for (let month = 1; month <= 12; month++) {
                const monthData = {
                    label: monthNames[month - 1],
                    month: month
                };
                
                // Добавляем данные для каждого года как отдельные столбцы
                filters.years.forEach(year => {
                    const yearBlock = analyticsData.trends.monthly[year] || analyticsData.trends.monthly[String(year)];
                    const candidates = [
                        monthNamesEn[month - 1], // Jan
                        monthNames[month - 1],    // Январь
                        String(month),            // 1..12
                        String(month).padStart(2, '0') // 01..12
                    ];
                    const monthKey = getExistingKey(yearBlock, candidates);
                    const yearData = (yearBlock && yearBlock[monthKey]) || {};
                    
                    let value = 0;
                    
                    if (metric === 'actual') {
                        // Получаем факт
                        value = yearData['actual'] || yearData['fact'] || 0;
                    } else if (metric === 'plan') {
                        // Получаем план
                        value = yearData['plan'] || 0;
                    } else if (metric === 'deviation') {
                        // 🎯 Используем готовые данные или считаем разницу
                        const planVal = Number(yearData['plan'] ?? 0) || 0;
                        const factVal = Number(yearData['actual'] ?? yearData['fact'] ?? 0) || 0;
                        value = yearData['deviation'] ?? yearData['difference'] ?? (factVal - planVal);
                    } else if (metric === 'percentage') {
                        // 🎯 Используем готовые данные с сервера (уже вычислены)
                        value = yearData['percentage'] || 0;
                    } else {
                        // Для других метрик пытаемся получить напрямую
                        value = yearData[metric] || 0;
                    }
                    
                    monthData[`${year}`] = value;
                });
                
                monthlyData.push(monthData);
            }
            
            metricCharts[metric] = monthlyData;
        });
        
        return metricCharts;
    };

    // Функции подготовки данных для таблиц
    const prepareYearlyTableData = (comparisonData, filters) => {
        if (!comparisonData.yearly) return [];
        return filters.years
            .sort((a, b) => a - b) // Сортируем годы по возрастанию
            .map(year => {
                const yearData = comparisonData.yearly[year] || {};
                // 🎯 Используем готовые данные с сервера (уже вычислены)
                const deviation = yearData.deviation || 0;
                const percentage = yearData.percentage ? Number(yearData.percentage).toFixed(1) : 0;

                return {
                    period: year.toString(),
                    actual: (yearData.actual || 0).toLocaleString('ru-RU'),
                    plan: (yearData.plan || 0).toLocaleString('ru-RU'),
                    deviation: deviation.toLocaleString('ru-RU'),
                    percentage: `${percentage}%`
                };
            });
    };

    const prepareCategoryTableData = (comparisonData, filters) => {
        if (!comparisonData.categories) return [];
        return Object.entries(comparisonData.categories).map(([categoryName, categoryData]) => {
            // 🎯 Используем готовые данные с сервера (уже вычислены)
            const deviation = categoryData.deviation || 0;
            const percentage = categoryData.percentage ? Number(categoryData.percentage).toFixed(1) : 0;

            return {
                period: categoryName,
                actual: (categoryData.actual || 0).toLocaleString('ru-RU'),
                plan: (categoryData.plan || 0).toLocaleString('ru-RU'),
                deviation: deviation.toLocaleString('ru-RU'),
                percentage: `${percentage}%`
            };
        });
    };

    const prepareShopTableData = (comparisonData, filters) => {
        if (!comparisonData.shops) return [];
        return Object.entries(comparisonData.shops).map(([shopName, shopData]) => ({
            period: shopName,
            actual: (shopData.actual || 0).toLocaleString('ru-RU'),
            plan: (shopData.plan || 0).toLocaleString('ru-RU'),
            // 🎯 Используем готовые данные с сервера (уже вычислены)
            deviation: (shopData.deviation || 0).toLocaleString('ru-RU'),
            percentage: shopData.percentage ? `${Number(shopData.percentage).toFixed(1)}%` : '0%'
        }));
    };



    // Подготовка данных для таблицы
    const tableData = useMemo(() => {
        if (groupBy === 'monthly_metrics') {
            // Для режима месячных метрик не показываем таблицу
            return [];
        }
        
        if (!analyticsData || !analyticsData.comparison) return [];
        const comparisonData = analyticsData.comparison;
        
        switch (groupBy) {
            case 'year':
                return prepareYearlyTableData(comparisonData, filters);
            case 'category':
                return prepareCategoryTableData(comparisonData, filters);
            case 'shop':
                return prepareShopTableData(comparisonData, filters);
            default:
                return [];
        }
    }, [analyticsData, filters, groupBy]);

    // Подготовка данных для визуализации
    const chartData = useMemo(() => {
        if (groupBy === 'monthly_metrics') {
            return prepareMonthlyMetricsData(analyticsData, filters);
        }
        
        if (groupBy === 'quarterly_metrics') {
            return prepareQuarterlyMetricsData(analyticsData, filters);
        }

        if (!analyticsData || !analyticsData.comparison) return [];
        const comparisonData = analyticsData.comparison;
        
        switch (groupBy) {
            case 'year':
                return prepareYearlyData(comparisonData, filters);
            case 'category':
                return prepareCategoryData(comparisonData, filters);
            case 'shop':
                return prepareShopData(comparisonData, filters);
            default:
                return [];
        }
    }, [analyticsData, filters, groupBy]);

    const tableColumns = [
        { 
            key: 'period', 
            title: groupBy === 'year' ? 'Год' : 
                   groupBy === 'category' ? 'Категория' : 'Магазин',
            sortable: true 
        },
        { key: 'actual', title: 'Факт', sortable: true, format: 'number' },
        { key: 'plan', title: 'План', sortable: true, format: 'number' },
        { key: 'deviation', title: 'Отклонение', sortable: true, format: 'number' },
        { key: 'percentage', title: '% выполнения', sortable: true }
    ];

    if (isLoading) {
        return (
            <div className="text-center p-4">
                <LoadingSpinner size="large" />
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
        <div className="p-3">
            {showHeader && (
                <div className="row mb-4">
                    <div className="col-12">
                        <h4 className="mb-0">Сравнительная аналитика</h4>
                        <p className="text-muted mb-0">Сравнение показателей по выбранным критериям</p>
                    </div>
                </div>
            )}

            {/* График */}
            {(
                (groupBy === 'monthly_metrics' || groupBy === 'quarterly_metrics') ? (
                    // Режим по месяцам - отдельный график для каждой метрики
                    <div>
                        {filters.metrics && filters.metrics.length > 0 ? (
                            filters.metrics.map(metricRaw => {
                                const normalized = normalizeMetric(metricRaw);
                                const metricData = chartData[normalized] || [];
                                const enriched = (normalized === 'deviation' && metricData.length > 0)
                                    ? metricData.map(point => {
                                        const years = Object.keys(point).filter(k => /^(\d{4})$/.test(k));
                                        if (years.length === 0) return point;
                                        const next = { ...point };
                                        years.forEach(y => {
                                            const planCandidate = Number(point[`plan_${y}`] ?? point.plan ?? 0) || 0;
                                            const actualCandidate = Number(point[`actual_${y}`] ?? point[`fact_${y}`] ?? point[y] ?? 0) || 0;
                                            next[y] = actualCandidate - planCandidate;
                                        });
                                        return next;
                                    })
                                    : metricData;
                                                            const metricTitles = {
                                'plan': 'План',
                                'fact': 'Факт',
                                'actual': 'Факт', // Поддерживаем оба варианта
                                'deviation': 'Отклонение',
                                'percentage': '% выполнения'
                            };
                                
                                return (
                                    <div key={normalized} className="card mb-4">
                                        <div className="card-body">
                                            <h5 className="card-title">
                                                {metricTitles[normalized] || normalized} {groupBy === 'monthly_metrics' ? 'по месяцам' : 'по кварталам'}
                                                <small className="text-muted ms-2">
                                                    ({filters.years ? filters.years.join(', ') : ''})
                                                </small>
                                            </h5>
                                                                                    <div style={{ height: '400px', width: '100%' }} className="chart-full-width">
                                            {enriched.length > 0 ? (
                                                <div style={{ width: '100%', height: '100%' }}>
                                                    <Chart
                                                        type={chartType}
                                                        data={enriched}
                                                        selectedMetrics={(filters.years || []).map(year => String(year))}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                                    Нет данных для метрики "{metricTitles[normalized] || normalized}"
                                                </div>
                                            )}
                                        </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="card mb-4">
                                <div className="card-body">
                                    <div className="text-center p-4 text-muted">
                                        <h5>Выберите метрики</h5>
                                        <p>Для просмотра графиков по месяцам выберите метрики в фильтрах</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // Обычный режим - один график (без карточки)
                    <div style={{ padding: '0 8px 16px', width: '100%' }}>
                        <h5 className="card-title mb-3">Графическое представление</h5>
                        <div style={{ height: '400px', width: '100%' }} className="chart-full-width">
                            {chartData && chartData.length > 0 ? (
                                <div style={{ width: '100%', height: '100%' }}>
                                    <Chart
                                        type={chartType}
                                        data={chartData}
                                        selectedMetrics={(filters.metrics || ['plan', 'fact']).map(m => (m?.value ?? m?.id ?? m))}
                                    />
                                </div>
                            ) : (
                                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                    Нет данных для отображения
                                </div>
                            )}
                        </div>
                    </div>
                )
            )}

            {showTable && (
                <div className="card mb-4">
                    <div className="card-body">
                        <h5 className="card-title">Табличные данные</h5>
                        <AnalyticsDataTable
                            data={tableData}
                            columns={tableColumns}
                        />
                    </div>
                </div>
            )}

            {showSummary && (
            <div className="card">
                <div className="card-body">
                    <h6 className="card-title">Краткая информация о выборке</h6>
                    <div className="row text-center">
                        <div className="col-3">
                            <strong className="text-primary d-block">{filters.years.length}</strong>
                            <small className="text-muted">Выбрано лет</small>
                        </div>
                        <div className="col-3">
                            <strong className="text-success d-block">
                                {filters.categories.length || 'Все'}
                            </strong>
                            <small className="text-muted">Категорий</small>
                        </div>
                        <div className="col-3">
                            <strong className="text-warning d-block">
                                {filters.shops.length || 'Все'}
                            </strong>
                            <small className="text-muted">Магазинов</small>
                        </div>
                        <div className="col-3">
                            <strong className="text-info d-block">{filters.metrics.length}</strong>
                            <small className="text-muted">Показателей</small>
                        </div>
                    </div>
                    {groupBy === 'monthly_metrics' && (filters.years?.length > 0) && (
                        <div className="mt-3 d-flex align-items-center flex-wrap" style={{gap: '12px'}}>
                            <small className="text-muted">Легенда по годам:</small>
                            {(filters.years || []).map((year, index) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
                                const color = colors[index % colors.length];
                                return (
                                    <div key={year} className="d-flex align-items-center" style={{gap: '6px'}}>
                                        <span style={{display: 'inline-block', width: '14px', height: '14px', backgroundColor: color, borderRadius: '2px'}}></span>
                                        <span className="text-muted">{year}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
};

export default AnalyticsComparison; 
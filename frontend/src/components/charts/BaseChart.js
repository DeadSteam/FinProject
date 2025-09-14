import React, { useMemo, useState, useEffect } from 'react';
import Chart from '../ui/Chart';
import LoadingSpinner from '../common/LoadingSpinner';
import AnalyticsDataTable from '../ui/AnalyticsDataTable';
import AnalyticsTable from '../analytics/AnalyticsTable';

/**
 * Базовый универсальный компонент для всех типов графиков
 * Объединяет всю логику подготовки данных и отображения
 */
const BaseChart = ({
    // Данные
    data,
    analyticsData,
    
    // Фильтры и настройки
    filters = {},
    settings = {},
    
    // Состояние
    isLoading = false,
    
    // Настройки отображения
    showControls = false,
    showTable = false,
    showSummary = false,
    showHeader = false,
    showLegend = true,
    
    // Тип графика
    chartType = 'bar',
    viewMode = 'chart', // 'chart' | 'table' | 'both'
    
    // Группировка данных
    groupBy = 'categories', // 'categories' | 'shops' | 'metrics' | 'years'
    
    // Метрики для отображения
    selectedMetrics = ['plan', 'actual'],
    
    // Заголовок
    title = 'График',
    
    // Дополнительные опции
    disableAnimations = false,
    className = '',
    showForecast = false,
    
    // Callbacks
    onDataChange,
    onFilterChange,
    
    // Кастомные компоненты
    CustomTable = null,
    CustomSummary = null,
    
    // Дополнительные данные для таблицы
    tableColumns = null,
    tableData = null
}) => {
    
    // Состояние для плавных анимаций
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    
    // Отслеживаем изменения данных для плавной анимации (только для тумблеров)
    useEffect(() => {
        setIsAnimating(true);
        setAnimationKey(prev => prev + 1);
        
        const timer = setTimeout(() => {
            setIsAnimating(false);
        }, 400); // Длительность анимации
        
        return () => clearTimeout(timer);
    }, [showForecast, chartType]); // Убираем data и selectedMetrics
    
    // Вспомогательная функция безопасного преобразования чисел
    const toSafeNumber = (value) => {
        const num = typeof value === 'string' ? parseFloat(String(value).replace(/\s/g, '').replace(',', '.')) : value;
        return Number.isFinite(num) ? num : 0;
    };


    // Универсальные функции подготовки данных
    const prepareDataByGroup = (sourceData, groupType) => {
        if (!sourceData) return [];
        
        const dataMap = {
            categories: sourceData.categories || sourceData.planVsActual?.categories,
            shops: sourceData.shops || sourceData.planVsActual?.shops,
            metrics: sourceData.metrics || sourceData.planVsActual?.metrics,
            years: sourceData.yearly || sourceData.comparison?.yearly,
            monthly: sourceData.monthly || sourceData.trends?.monthly,
            quarterly: sourceData.quarterly || sourceData.trends?.quarterly
        };
        
        const groupData = dataMap[groupType];
        if (!groupData) return [];
        
        return Object.entries(groupData).map(([key, itemData]) => ({
            label: key,
            plan: toSafeNumber(itemData.plan || 0),
            actual: toSafeNumber(itemData.actual || itemData.fact || 0),
            deviation: toSafeNumber(itemData.deviation ?? (toSafeNumber(itemData.plan || 0) - toSafeNumber(itemData.actual || itemData.fact || 0))),
            percentage: toSafeNumber(itemData.percentage ?? (toSafeNumber(itemData.plan || 0) > 0 ? ((toSafeNumber(itemData.actual || itemData.fact || 0) / toSafeNumber(itemData.plan || 0)) * 100) : 0)),
            // Дополнительные поля
            ...itemData
        }));
    };

    // Подготовка данных для графика
    const chartData = useMemo(() => {
        let preparedData = [];
        
        // Если данные уже подготовлены, используем их
        if (data && Array.isArray(data)) {
            preparedData = data;
        } else if (analyticsData) {
            // Иначе подготавливаем из analyticsData
            preparedData = prepareDataByGroup(analyticsData, groupBy);
        }
        
        // Если включен прогноз, добавляем прогнозные данные
        if (showForecast && preparedData.length > 0) {
            // Добавляем прогноз только один раз для всех метрик
            const forecastData = [...preparedData];
            const forecastPeriods = 1; // Прогноз
            
            // Вычисляем прогноз для каждой метрики
            selectedMetrics.forEach(metric => {
                if (metric === 'actual' || metric === 'plan') {
                    const values = preparedData.map(item => toSafeNumber(item[metric] || 0));
                    const n = values.length;
                    
                    if (n >= 2) {
                        // Линейная регрессия
                        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                        for (let i = 0; i < n; i++) {
                            sumX += i;
                            sumY += values[i];
                            sumXY += i * values[i];
                            sumXX += i * i;
                        }
                        
                        const denominator = (n * sumXX - sumX * sumX);
                        const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
                        const intercept = (sumY - slope * sumX) / n;
                        
                        // Добавляем прогнозные точки
                        for (let i = 0; i < forecastPeriods; i++) {
                            const forecastValue = slope * (n + i) + intercept;
                            const forecastIndex = n + i;
                            
                            if (!forecastData[forecastIndex]) {
                                forecastData[forecastIndex] = {
                                    label: `Прогноз`,
                                    isForecast: true,
                                    plan: 0,
                                    actual: 0,
                                    deviation: 0,
                                    percentage: 0
                                };
                            }
                            
                            forecastData[forecastIndex][metric] = forecastValue;
                        }
                    }
                }
            });
            
            preparedData = forecastData;
        }
        
        return preparedData;
    }, [data, analyticsData, groupBy, showForecast, selectedMetrics]);

    // Подготовка данных для таблицы
    const preparedTableData = useMemo(() => {
        if (tableData) return tableData;
        
        return chartData.map(item => ({
            period: item.label,
            plan: item.plan,
            actual: item.actual,
            deviation: item.deviation,
            percentage: item.percentage,
            ...item
        }));
    }, [chartData, tableData]);

    // Стандартные колонки таблицы
    const defaultTableColumns = [
        { 
            key: 'period', 
            title: groupBy === 'categories' ? 'Категория' : 
                   groupBy === 'shops' ? 'Магазин' : 
                   groupBy === 'metrics' ? 'Показатель' : 'Период',
            sortable: true 
        },
        { key: 'plan', title: 'План', sortable: true, format: 'number' },
        { key: 'actual', title: 'Факт', sortable: true, format: 'number' },
        { key: 'deviation', title: 'Отклонение', sortable: true, format: 'number' },
        { key: 'percentage', title: '% выполнения', sortable: true, format: 'percent' }
    ];

    // Преобразуем колонки под формат AnalyticsTable (ожидает header)
    const normalizeColumns = (cols) => {
        return (cols || []).map(col => ({
            ...col,
            header: col.header ?? col.title,
        }));
    };

    // Статистика
    const statistics = useMemo(() => {
        if (!chartData || chartData.length === 0) return null;
        
        const totalPlan = chartData.reduce((sum, item) => sum + item.plan, 0);
        const totalActual = chartData.reduce((sum, item) => sum + item.actual, 0);
        const totalDeviation = chartData.reduce((sum, item) => sum + item.deviation, 0);
        const avgPercentage = chartData.length > 0 ? 
            chartData.reduce((sum, item) => sum + item.percentage, 0) / chartData.length : 0;
        
        return {
            totalPlan,
            totalActual,
            totalDeviation,
            avgPercentage,
            itemsCount: chartData.length
        };
    }, [chartData]);

    // Состояния загрузки и ошибок
    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <LoadingSpinner />
            </div>
        );
    }

    if (!chartData || chartData.length === 0) {
        return (
            <div className="text-center text-muted p-4">
                <i className="fas fa-chart-pie fa-3x mb-3"></i>
                <h5>Нет данных для отображения</h5>
                <p>Выберите параметры фильтрации или загрузите данные</p>
            </div>
        );
    }

    return (
        <div className={`base-chart ${className}`}>
            {(viewMode === 'chart' || viewMode === 'both') && (
                <Chart
                    key={animationKey}
                    type={chartType}
                    data={chartData}
                    selectedMetrics={selectedMetrics}
                    title={showLegend ? title : undefined}
                    disableAnimations={disableAnimations}
                    noMargins={true}
                />
            )}

            {(viewMode === 'table' || viewMode === 'both') && (
                <div className="table-container">
                    {CustomTable ? (
                        <CustomTable 
                            data={preparedTableData}
                            columns={normalizeColumns(tableColumns || defaultTableColumns)}
                            title="Детальные данные"
                            isLoading={isLoading}
                        />
                    ) : (
                        <AnalyticsTable
                            data={preparedTableData}
                            columns={normalizeColumns(tableColumns || defaultTableColumns)}
                            title="Детальные данные"
                            isLoading={isLoading}
                        />
                    )}
                </div>
            )}

            {CustomSummary && (
                <CustomSummary 
                    data={chartData}
                    statistics={statistics}
                    filters={filters}
                />
            )}
        </div>
    );
};

export default BaseChart;

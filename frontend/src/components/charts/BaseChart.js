import React, { useMemo, useState, useEffect } from 'react';
import AGChartWrapper from './AGChartWrapper';
import LoadingSpinner from '../common/LoadingSpinner';
import AnalyticsDataTable from '../ui/AnalyticsDataTable';
import AnalyticsTable from '../analytics/AnalyticsTable';
import { prepareChartData, calculateStatistics as calcStats, formatTableData, getDefaultTableColumns, toSafeNumber } from './utils/chartDataUtils';

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
    smoothing = false,
    
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
    
    // Унификация подготовки данных: используем utils/chartDataUtils

    // Подготовка данных для графика
    const chartData = useMemo(() => {
        let preparedData = [];
        
        // Если данные уже подготовлены, используем их
        if (data && Array.isArray(data)) {
            preparedData = data;
        } else if (analyticsData) {
            // Иначе подготавливаем из analyticsData единым методом
            preparedData = prepareChartData(analyticsData, groupBy, filters);
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
        
        // Сглаживание (скользящее среднее) для план/факт, если включено
        if (smoothing && preparedData.length > 0) {
            const windowSize = 3;
            const applySMA = (arr, key) => {
                const res = [...arr];
                for (let i = 0; i < arr.length; i++) {
                    let sum = 0;
                    let count = 0;
                    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
                        sum += toSafeNumber(arr[j]?.[key] ?? 0);
                        count++;
                    }
                    res[i] = { ...res[i], [key]: count > 0 ? sum / count : 0 };
                }
                return res;
            };
            let smoothed = preparedData;
            ['plan','actual','fact','deviation','percentage'].forEach((metric) => {
                if (preparedData.some(it => typeof it[metric] !== 'undefined')) {
                    smoothed = applySMA(smoothed, metric);
                }
            });
            preparedData = smoothed;
        }

        return preparedData;
    }, [data, analyticsData, groupBy, showForecast, smoothing, selectedMetrics]);

    // Подготовка данных для таблицы
    const preparedTableData = useMemo(() => {
        if (tableData) return tableData;
        if (!Array.isArray(chartData)) return [];
        return formatTableData(chartData);
    }, [chartData, tableData]);

    // Стандартные колонки таблицы
    const defaultTableColumns = getDefaultTableColumns(groupBy);

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
        return calcStats(chartData);
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
                <AGChartWrapper
                    key={animationKey}
                    type={chartType}
                    data={chartData}
                    selectedMetrics={selectedMetrics}
                    title={showLegend ? title : undefined}
                    disableAnimations={disableAnimations}
                    noMargins={true}
                    style={{ height: '100%' }}
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

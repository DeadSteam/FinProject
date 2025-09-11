import React, { useMemo, useCallback, useState, useEffect } from 'react';
import BaseChart from './BaseChart';
import { prepareChartData, calculateStatistics, toSafeNumber } from './utils/chartDataUtils';
import TrendsStatistics from '../analytics/TrendsStatistics';
import styles from '../analytics/AnalyticsTrends.module.css';

/**
 * Специализированный компонент для графиков трендов
 * Поддерживает анализ динамики с прогнозированием
 */
const TrendsChart = ({
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
    title = 'Анализ трендов',
    disableAnimations = false,
    className = '',
    onDataChange,
    onFilterChange,
    
    // Специфичные для трендов настройки
    trendType = 'absolute',
    smoothing = false,
    showForecast = false,
    monthStart = 1,
    monthEnd = 12
}) => {
    
    // Состояние для плавных анимаций
    const [isUpdating, setIsUpdating] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    
    // Отслеживаем изменения фильтров для плавной анимации (только для тумблеров)
    useEffect(() => {
        setIsUpdating(true);
        setAnimationKey(prev => prev + 1);
        
        const timer = setTimeout(() => {
            setIsUpdating(false);
        }, 300); // Длительность анимации
        
        return () => clearTimeout(timer);
    }, [trendType, smoothing, showForecast]); // Убираем filters.metrics, filters.years, filters.periodType
    
    // Функция сглаживания данных
    const applySmoothing = useCallback((data) => {
        if (data.length < 3) return data;
        
        const smoothed = [...data];
        
        // Простое сглаживание: каждый элемент = среднее с соседними
        for (let i = 1; i < data.length - 1; i++) {
            const prev = toSafeNumber(data[i - 1].actual || 0);
            const current = toSafeNumber(data[i].actual || 0);
            const next = toSafeNumber(data[i + 1].actual || 0);
            
            smoothed[i] = {
                ...smoothed[i],
                actual: (prev + current + next) / 3
            };
        }
        
        return smoothed;
    }, []);
    
    // Применяем анализ трендов
    const applyTrendAnalysis = useCallback((data, type, smoothing) => {
        if (!data || data.length === 0) return data;
        
        let processedData = data;
        
        switch (type) {
            case 'absolute':
                processedData = data;
                break;
                
            case 'percentage':
                // Конвертируем в проценты от максимального значения
                const maxValue = Math.max(...data.map(item => toSafeNumber(item.actual || 0)));
                processedData = data.map(item => ({
                    ...item,
                    actual: maxValue > 0 ? ((toSafeNumber(item.actual || 0) / maxValue) * 100) : 0,
                    plan: maxValue > 0 ? ((toSafeNumber(item.plan || 0) / maxValue) * 100) : 0
                }));
                break;
                
            case 'moving_average':
                // Скользящее среднее за 3 периода
                processedData = data.map((item, index) => {
                    const window = 3;
                    const start = Math.max(0, index - window + 1);
                    const end = index + 1;
                    const values = data.slice(start, end).map(d => toSafeNumber(d.actual || 0));
                    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
                    
                    return {
                        ...item,
                        actual: average,
                        plan: item.plan || 0
                    };
                });
                break;
                
            default:
                processedData = data;
        }
        
        // Применяем сглаживание если включено
        if (smoothing && processedData.length > 2) {
            processedData = applySmoothing(processedData);
        }
        
        return processedData;
    }, [applySmoothing]);
    
    // Определяем тип данных на основе фильтров
    const timeframe = useMemo(() => {
        const pt = filters.periodType;
        if (pt === 'months') return 'monthly';
        if (pt === 'quarters') return 'quarterly';
        return 'yearly';
    }, [filters.periodType]);
    
    // Подготавливаем данные для графика
    const chartData = useMemo(() => {
        if (!analyticsData?.trends) return [];
        
        // Для трендов используем специальную логику
        const trendsData = analyticsData.trends[timeframe];
        if (!trendsData) return [];
        
        // Преобразуем данные трендов в формат для графиков
        const data = [];
        
        if (timeframe === 'yearly') {
            // Для годовых данных
            const years = Object.keys(trendsData).sort((a, b) => parseInt(a) - parseInt(b));
            years.forEach(year => {
                const yearData = trendsData[year];
                data.push({
                    label: year,
                    actual: toSafeNumber(yearData.actual || 0),
                    plan: toSafeNumber(yearData.plan || 0),
                    deviation: toSafeNumber(yearData.deviation || 0),
                    percentage: toSafeNumber(yearData.percentage || 0)
                });
            });
        } else if (timeframe === 'quarterly') {
            // Для квартальных данных
            const years = Object.keys(trendsData).sort((a, b) => parseInt(a) - parseInt(b));
            years.forEach(year => {
                const yearData = trendsData[year];
                const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
                quarters.forEach(quarter => {
                    const quarterData = yearData[quarter];
                    if (quarterData) {
                        data.push({
                            label: `${year} ${quarter}`,
                            actual: toSafeNumber(quarterData.actual || 0),
                            plan: toSafeNumber(quarterData.plan || 0),
                            deviation: toSafeNumber(quarterData.deviation || 0),
                            percentage: toSafeNumber(quarterData.percentage || 0)
                        });
                    }
                });
            });
        } else if (timeframe === 'monthly') {
            // Для месячных данных
            const years = Object.keys(trendsData).sort((a, b) => parseInt(a) - parseInt(b));
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthNamesRu = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
                                'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            
            years.forEach(year => {
                const yearData = trendsData[year];
                monthNames.forEach((month, index) => {
                    const monthData = yearData[month];
                    if (monthData) {
                        data.push({
                            label: `${monthNamesRu[index]} ${year}`,
                            actual: toSafeNumber(monthData.actual || 0),
                            plan: toSafeNumber(monthData.plan || 0),
                            deviation: toSafeNumber(monthData.deviation || 0),
                            percentage: toSafeNumber(monthData.percentage || 0)
                        });
                    }
                });
            });
        }
        
        return applyTrendAnalysis(data, trendType, smoothing);
    }, [analyticsData, timeframe, filters, trendType, smoothing, applyTrendAnalysis]);
    
    // Вычисляем статистику
    // Фиксируем статистику относительно исходных данных, чтобы менялся только график
    const statistics = useMemo(() => {
        return calculateStatistics(chartData);
    }, [analyticsData]);
    
    // Получаем статистику трендов с сервера
    const trendStats = useMemo(() => {
        if (!analyticsData?.trendStats) return null;
        // Фиксируем на годовых сводках, чтобы карточки не пересчитывались при смене табов
        const mode = 'yearly';
        return analyticsData.trendStats[mode] || null;
    }, [analyticsData]);
    
    // Кастомная сводка для трендов с расширенными показателями
    
    
    if (isLoading) {
        return (
            <div className="text-center p-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Загрузка...</span>
                </div>
                <p className="mt-2">Загрузка данных трендов...</p>
            </div>
        );
    }
    
    if (!analyticsData) {
        return (
            <div className="text-center p-4 text-muted">
                <div className="mb-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                        <path d="M3 3v18h18"/>
                        <path d="M7 12l3-3 3 3 5-5"/>
                    </svg>
                </div>
                <h5>Нет данных для анализа трендов</h5>
                <p>Выберите периоды для отображения динамики изменений</p>
            </div>
        );
    }
    
    return (
        <div className={`trends-chart ${className}`}>
            {showHeader && (
                <div className="row">
                    <div className="col-12">
                        <h4 className="mb-0">{title}</h4>
                        <p className="text-muted mb-0">Динамика изменений показателей во времени с прогнозированием</p>
                    </div>
                </div>
            )}
            
            {/* График: в трендах всегда отображаем график, независимо от глобального viewMode */}
            {(
                <div>
                    <div 
                        className={`${styles.chartContainer} ${isUpdating ? styles.updating : ''} ${isLoading ? styles.loading : ''}`}
                        style={{
                            width: '100%',
                            minHeight: '260px',
                            height: 'auto',
                            margin: '2rem 0',
                            padding: '0.5rem',
                        }}
                        key={animationKey}
                    >
                        {chartData && Array.isArray(chartData) && chartData.length > 0 ? (
                            <BaseChart
                                data={chartData}
                                chartType={chartType}
                                selectedMetrics={filters.metrics || ['plan', 'actual']}
                                title="Тренды"
                                showHeader={false}
                                showTable={false}
                                showSummary={false}
                                disableAnimations={disableAnimations}
                                showForecast={showForecast}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                <div className="text-center">
                                    <div className="mb-3">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="48" height="48">
                                            <path d="M3 3v18h18"/>
                                            <path d="M7 12l3-3 3 3 5-5"/>
                                        </svg>
                                    </div>
                                    <h6>Нет данных для отображения трендов</h6>
                                    <p className="mb-0">Выберите периоды и показатели в фильтрах</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Статистика и прогнозирование для трендов */}
            {showSummary && (
                <TrendsStatistics 
                    data={chartData}
                    trendStats={trendStats}
                    timeframe={timeframe}
                    animationKey={animationKey}
                />
            )}
        </div>
    );
};

export default TrendsChart;

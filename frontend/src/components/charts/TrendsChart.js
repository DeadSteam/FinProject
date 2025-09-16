import React, { useMemo, useCallback, useState, useEffect } from 'react';
import BaseChart from './BaseChart';
import { useTrendsData } from './hooks/useChartData';
import { ChartLoading, ChartNoData } from './common/ChartStates';
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
    
    // Отслеживаем изменения фильтров для плавной анимации
    useEffect(() => {
        setIsUpdating(true);
        setAnimationKey(prev => prev + 1);
        
        const timer = setTimeout(() => {
            setIsUpdating(false);
        }, 300);
        
        return () => clearTimeout(timer);
    }, [trendType, smoothing, showForecast]);
    
    // Используем специализированный хук трендов (год/квартал/месяц)
    const { chartData, trendStats, timeframe } = useTrendsData({
        analyticsData,
        filters,
        trendType,
        smoothing
    });

    // Проверяем, есть ли данные для отображения
    const hasData = useMemo(() => {
        return chartData && Array.isArray(chartData) && chartData.length > 0;
    }, [chartData]);

    if (isLoading) {
        return <ChartLoading message="Загрузка данных трендов..." />;
    }
    
    if (!analyticsData) {
        return (
            <ChartNoData 
                title="Нет данных для анализа трендов"
                message="Выберите периоды для отображения динамики изменений"
                icon="trends"
            />
        );
    }
    
    return (
        <div className={`trends-chart ${className}`}>
            {/* Заголовок */}
            {showHeader && (
                <div className="row">
                    <div className="col-12">
                        <h4 className="mb-0">{title}</h4>
                        <p className="text-muted mb-0">Динамика изменений показателей во времени с прогнозированием</p>
                    </div>
                </div>
            )}
            
            {/* График */}
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
                            filters={filters}
                            isLoading={isLoading}
                            showHeader={false}
                            showTable={false}
                            showSummary={false}
                            showControls={false}
                            chartType={chartType}
                            viewMode={'chart'}
                            groupBy={'years'}
                            selectedMetrics={filters.metrics || ['plan', 'actual']}
                            title="Тренды"
                            disableAnimations={disableAnimations}
                            className="trends-chart-wrapper"
                            smoothing={smoothing}
                            showForecast={showForecast}
                        />
                    ) : (
                        <ChartNoData 
                            title="Нет данных для отображения трендов"
                            message="Выберите периоды и показатели в фильтрах"
                            icon="trends"
                        />
                    )}
                </div>
            </div>
            
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
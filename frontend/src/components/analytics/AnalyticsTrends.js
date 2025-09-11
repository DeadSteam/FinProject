import React, { useMemo } from 'react';
import { TrendsChart } from '../charts';
import TrendsStatistics from './TrendsStatistics';

/**
 * Компонент для анализа трендов.
 * Теперь использует унифицированную систему графиков с отдельным блоком статистики
 */
const AnalyticsTrends = ({ 
    analyticsData, 
    filters, 
    isLoading, 
    onMonthRangeChange 
}) => {
    
    // Определяем тип данных на основе фильтров
    const timeframe = useMemo(() => {
        const pt = filters.periodType;
        if (pt === 'months') return 'monthly';
        if (pt === 'quarters') return 'quarterly';
        return 'yearly';
    }, [filters.periodType]);
    
    // Получаем статистику трендов с сервера
    const trendStats = useMemo(() => {
        if (!analyticsData?.trendStats) return null;
        const mode = timeframe === 'yearly' ? 'yearly' : timeframe === 'quarterly' ? 'quarterly' : 'monthly';
        return analyticsData.trendStats[mode] || null;
    }, [analyticsData, timeframe]);
    
    // Подготавливаем данные для статистики
    const chartData = useMemo(() => {
        if (!analyticsData?.trends) return [];
        
        const trendsData = analyticsData.trends[timeframe];
        if (!trendsData) return [];
        
        const data = [];
        
        if (timeframe === 'yearly') {
            const years = Object.keys(trendsData).sort((a, b) => parseInt(a) - parseInt(b));
            years.forEach(year => {
                const yearData = trendsData[year];
                data.push({
                    label: year,
                    actual: yearData.actual || 0,
                    plan: yearData.plan || 0,
                    deviation: yearData.deviation || 0,
                    percentage: yearData.percentage || 0
                });
            });
        } else if (timeframe === 'quarterly') {
            const years = Object.keys(trendsData).sort((a, b) => parseInt(a) - parseInt(b));
            years.forEach(year => {
                const yearData = trendsData[year];
                const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
                quarters.forEach(quarter => {
                    const quarterData = yearData[quarter];
                    if (quarterData) {
                        data.push({
                            label: `${year} ${quarter}`,
                            actual: quarterData.actual || 0,
                            plan: quarterData.plan || 0,
                            deviation: quarterData.deviation || 0,
                            percentage: quarterData.percentage || 0
                        });
                    }
                });
            });
        } else if (timeframe === 'monthly') {
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
                            actual: monthData.actual || 0,
                            plan: monthData.plan || 0,
                            deviation: monthData.deviation || 0,
                            percentage: monthData.percentage || 0
                        });
                    }
                });
            });
        }
        
        return data;
    }, [analyticsData, timeframe]);
    
    return (
        <div>
            {/* График трендов */}
            <TrendsChart
                analyticsData={analyticsData}
                filters={filters}
                isLoading={false} // Убираем загрузку для тумблеров
                showHeader={true}
                showSummary={false}
                showTable={true}
                chartType={filters.chartType || 'bar'}
                viewMode={filters.viewMode || 'chart'}
                groupBy={filters.periodType === 'months' ? 'monthly' : 
                        filters.periodType === 'quarters' ? 'quarterly' : 'years'}
                selectedMetrics={filters.metrics || ['plan', 'actual']}
                title="Анализ трендов"
                trendType={filters.trendType || 'absolute'}
                smoothing={filters.smoothing || false}
                showForecast={filters.showForecast || false}
                monthStart={filters.monthStart || 1}
                monthEnd={filters.monthEnd || 12}
            />
            
            {/* Отдельный блок статистики и прогнозирования - вне зависимости от табов */}
            <TrendsStatistics 
                data={chartData}
                trendStats={trendStats}
                timeframe={timeframe}
                animationKey={0} // Статичный ключ, чтобы статистика не обновлялась с графиком
            />
        </div>
    );
};

export default AnalyticsTrends; 

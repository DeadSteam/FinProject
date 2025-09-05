

import React, { useState, useMemo } from 'react';
import Chart from '../ui/Chart';
import LoadingSpinner from '../common/LoadingSpinner';
import styles from './AnalyticsTrends.module.css';

/**
 * Компонент для анализа трендов.
 * Отображает динамику изменений показателей во времени с расширенной статистикой.
 */
const AnalyticsTrends = ({ analyticsData, filters, isLoading, onMonthRangeChange }) => {
    const [trendType, setTrendType] = useState('absolute'); // 'absolute' | 'percentage' | 'moving_average'
    const [smoothing, setSmoothing] = useState(false);
    const [timeframe, setTimeframe] = useState('yearly'); // 'yearly' | 'quarterly' | 'monthly_metrics'
    const [chartType, setChartType] = useState('line'); // 'bar' | 'line' | 'area'
    const [monthStart, setMonthStart] = useState(1);
    const [monthEnd, setMonthEnd] = useState(12);
    const [showForecast, setShowForecast] = useState(false);

    // Функции подготовки данных для трендов с расширенной аналитикой
    const toSafeNumber = (value) => {
        const num = typeof value === 'string' ? parseFloat(String(value).replace(/\s/g, '').replace(',', '.')) : value;
        return Number.isFinite(num) ? num : 0;
    };

    const prepareYearlyTrends = (trendsData, filters) => {
        if (!trendsData.yearly) return [];
        const data = filters.years
            .sort((a, b) => a - b)
            .map(year => {
                const yearData = trendsData.yearly[year] || {};
                return {
                    label: year.toString(),
                    plan: toSafeNumber(yearData.plan || 0),
                    fact: toSafeNumber(yearData.actual || 0),
                    deviation: toSafeNumber(yearData.deviation || 0),
                    percentage: toSafeNumber(yearData.percentage || 0)
                };
            });
        
        return applyTrendAnalysis(data, trendType);
    };

    const prepareQuarterlyTrends = (trendsData, filters) => {
        if (!trendsData.quarterly) return [];
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const result = [];
        
        filters.years.sort((a, b) => a - b).forEach(year => {
            quarters.forEach(quarter => {
                const quarterData = trendsData.quarterly[year]?.[quarter] || {};
                result.push({
                    label: `${year} ${quarter}`,
                    plan: toSafeNumber(quarterData.plan || 0),
                    fact: toSafeNumber(quarterData.actual || 0),
                    deviation: toSafeNumber(quarterData.deviation || 0),
                    percentage: toSafeNumber(quarterData.percentage || 0)
                });
            });
        });
        
        return applyTrendAnalysis(result, trendType);
    };

    const prepareMonthlyTrends = (trendsData, filters) => {
        if (!trendsData.monthly || !filters.metrics || !filters.years) return [];
        
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        
        const monthNamesEn = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        const result = [];
        
        // Для каждого месяца создаем точку данных
        const start = Math.max(1, Math.min(12, monthStart));
        const end = Math.max(start, Math.min(12, monthEnd));
        for (let month = start; month <= end; month++) {
            const monthData = {
                label: monthNames[month - 1],
                month: month
            };
            
            // Добавляем данные для каждого года как отдельные столбцы
            filters.years.forEach(year => {
                const monthKey = monthNamesEn[month - 1];
                const yearData = trendsData.monthly[year]?.[monthKey] || {};
                
                // Используем первую метрику как основную для трендов
                const metric = filters.metrics[0] || 'actual';
                let value = 0;
                
                if (metric === 'fact' || metric === 'actual') {
                    value = toSafeNumber(yearData['actual'] || yearData['fact'] || 0);
                } else if (metric === 'plan') {
                    value = toSafeNumber(yearData['plan'] || 0);
                } else if (metric === 'deviation') {
                    value = toSafeNumber(yearData['deviation'] || 0);
                } else if (metric === 'percentage') {
                    value = toSafeNumber(yearData['percentage'] || 0);
                } else {
                    value = toSafeNumber(yearData[metric] || 0);
                }
                
                monthData[`${year}`] = value;
            });
            
            result.push(monthData);
        }
        
        return applyTrendAnalysis(result, trendType);
    };

    // Функция применения анализа трендов
    const applyTrendAnalysis = (data, type) => {
        if (!data || data.length === 0) return data;
        
        let processedData = data;
        
        switch (type) {
            case 'absolute':
                processedData = data; // Оставляем как есть
                break;
                
            case 'percentage':
                // Конвертируем в проценты от максимального значения
                const maxValue = Math.max(...data.map(item => toSafeNumber(item.fact || 0)));
                processedData = data.map(item => ({
                    ...item,
                    fact: maxValue > 0 ? ((toSafeNumber(item.fact || 0) / maxValue) * 100) : 0,
                    plan: maxValue > 0 ? ((toSafeNumber(item.plan || 0) / maxValue) * 100) : 0
                }));
                break;
                
            case 'moving_average':
                // Скользящее среднее за 3 периода
                processedData = data.map((item, index) => {
                    const window = 3;
                    const start = Math.max(0, index - window + 1);
                    const end = index + 1;
                    const values = data.slice(start, end).map(d => toSafeNumber(d.fact || 0));
                    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
                    
                    return {
                        ...item,
                        fact: average,
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
    };

    // Функция сглаживания данных
    const applySmoothing = (data) => {
        if (data.length < 3) return data;
        
        const smoothed = [...data];
        
        // Простое сглаживание: каждый элемент = среднее с соседними
        for (let i = 1; i < data.length - 1; i++) {
            const prev = toSafeNumber(data[i - 1].fact || 0);
            const current = toSafeNumber(data[i].fact || 0);
            const next = toSafeNumber(data[i + 1].fact || 0);
            
            smoothed[i] = {
                ...smoothed[i],
                fact: (prev + current + next) / 3
            };
        }
        
        return smoothed;
    };

    // Функция добавления прогноза к данным
    const addForecastToData = (data) => {
        if (!showForecast || !data || data.length < 2) return data;
        
        const forecastData = [...data];
        
        // Используем те же алгоритмы, что и в контейнерах (линейная регрессия)
        const { factForecast, planForecast } = computeForecastsForCurrentTimeframe();
        
        forecastData.push({
            label: 'Прогноз',
            fact: toSafeNumber(factForecast || 0),
            plan: toSafeNumber(planForecast || 0),
            isForecast: true
        });
        
        return forecastData;
    };

    // Вспомогательная: линейная регрессия (slope, intercept, next)
    const linearRegressionForecast = (series) => {
        const n = series.length;
        if (!Array.isArray(series) || n === 0) return { slope: 0, intercept: 0, next: 0 };
        const x = Array.from({ length: n }, (_, i) => i);
        const sum = (arr) => arr.reduce((a, b) => a + b, 0);
        const xSum = sum(x);
        const ySum = sum(series);
        const xySum = sum(x.map((xi, i) => xi * series[i]));
        const x2Sum = sum(x.map((xi) => xi * xi));
        const denom = n * x2Sum - xSum * xSum;
        if (denom === 0) {
            const avg = ySum / n;
            return { slope: 0, intercept: avg, next: avg };
        }
        const slope = (n * xySum - xSum * ySum) / denom;
        const intercept = (ySum - slope * xSum) / n;
        const next = slope * n + intercept;
        return { slope, intercept, next };
    };

    // Вспомогательная: «уверенность» как на сервере
    const computeConfidence = (series, slope, intercept) => {
        const n = series.length;
        if (n < 3) return 0.95;
        const predicted = series.map((_, i) => slope * i + intercept);
        const residuals = series.map((v, i) => v - predicted[i]);
        const mse = residuals.reduce((a, b) => a + b * b, 0) / n;
        let denom = Math.max(...series, 1);
        if (denom <= 0) denom = 1;
        const conf = 1 - mse / denom;
        return Math.max(0.5, Math.min(0.99, conf));
    };

    // Вспомогательная: коэффициент детерминации R^2
    const computeR2 = (series, slope, intercept) => {
        const y = series.map(v => toSafeNumber(v || 0));
        const n = y.length;
        if (n < 2) return 0;
        const mean = y.reduce((a,b)=>a+b,0)/n;
        const ssTot = y.reduce((a,b)=> a + Math.pow(b-mean,2), 0);
        const ssRes = y.reduce((a,b,i)=> a + Math.pow(b - (slope*i+intercept), 2), 0);
        if (ssTot === 0) return 0;
        return Math.max(0, 1 - ssRes/ssTot);
    };

    // CAGR для yearly ряда
    const computeCAGR = (series) => {
        const y = series.map(v => toSafeNumber(v || 0));
        if (y.length < 2) return 0;
        const first = y.find(v => v !== 0) ?? 0;
        const last = [...y].reverse().find(v => v !== 0) ?? y[y.length-1];
        const years = y.length - 1;
        if (first <= 0 || years <= 0) return 0;
        return (Math.pow(last/first, 1/years) - 1) * 100;
    };

    const computeMaxDrawdown = (series) => {
        const y = series.map(v => toSafeNumber(v || 0));
        if (y.length < 2) return 0;
        
        let peak = y[0]; // Начинаем с первого значения
        let maxDD = 0;
        
        for (let i = 1; i < y.length; i++) {
            const currentValue = y[i];
            
            // Обновляем пик если текущее значение больше
            if (currentValue > peak) {
                peak = currentValue;
            }
            
            // Рассчитываем текущую просадку от пика
            if (peak > 0) {
                const currentDD = ((currentValue - peak) / peak) * 100;
                // Просадка всегда отрицательная или 0, берем наименьшее (максимальную просадку)
                maxDD = Math.min(maxDD, currentDD);
            }
        }
        
        return maxDD; // отрицательное значение (максимальная просадка)
    };

    const computeQuantiles = (series) => {
        const s = series.map(v => toSafeNumber(v || 0)).slice().sort((a,b)=>a-b);
        const q = (p) => {
            if (s.length === 0) return 0;
            const pos = (s.length - 1) * p;
            const base = Math.floor(pos);
            const rest = pos - base;
            if (s[base + 1] !== undefined) return s[base] + rest * (s[base + 1] - s[base]);
            return s[base];
        };
        return { q25: q(0.25), median: q(0.5), q75: q(0.75) };
    };

    // Единый расчет статистик по ряду
    const computeStatsFromSeries = (series) => {
        const nums = series.map(v => toSafeNumber(v || 0));
        const n = nums.length;
        if (n === 0) {
            return { mean: 0, std: 0, trend: 0, max: 0, min: 0, current: 0, forecast: 0, slope: 0, confidence: 0.95, r2:0, median:0, q25:0, q75:0, iqr:0, cagr:0, maxDrawdown:0, count:0, nonZeroShare:0 };
        }
        const mean = nums.reduce((a, b) => a + b, 0) / n;
        const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const std = Math.sqrt(Math.max(0, variance));
        const first = nums.find(v => v !== 0) ?? 0;
        const last = [...nums].reverse().find(v => v !== 0) ?? nums[nums.length - 1];
        const trend = first !== 0 ? ((last - first) / first) * 100 : 0;
        const { slope, intercept, next } = linearRegressionForecast(nums);
        const confidence = computeConfidence(nums, slope, intercept);
        const r2 = computeR2(nums, slope, intercept);
        const { q25, median, q75 } = computeQuantiles(nums);
        const iqr = q75 - q25;
        const cagr = timeframe === 'yearly' ? computeCAGR(nums) : 0;
        const maxDrawdown = computeMaxDrawdown(nums);
        const count = n;
        const nonZeroShare = (nums.filter(v=>v!==0).length / n) * 100;
        return {
            mean,
            std,
            trend,
            max: Math.max(...nums),
            min: Math.min(...nums),
            current: last,
            forecast: next,
            slope,
            confidence,
            r2,
            median,
            q25,
            q75,
            iqr,
            cagr,
            maxDrawdown,
            count,
            nonZeroShare
        };
    };

    // Рассчитываем прогнозы и статистики для текущего таймфрейма (факт/план) единообразно
    const computeForecastsForCurrentTimeframe = () => {
        if (!analyticsData?.trends || !filters?.years) return { factForecast: 0, planForecast: 0 };
        const trends = analyticsData.trends;
        const yearsSorted = [...(filters.years || [])].sort((a, b) => a - b);

        const collectSeries = (key) => {
            const vals = [];
            if (timeframe === 'yearly') {
                yearsSorted.forEach(y => { const row = trends.yearly?.[y]; vals.push(toSafeNumber(row?.[key] || 0)); });
            } else if (timeframe === 'quarterly') {
                yearsSorted.forEach(y => { const q = trends.quarterly?.[y] || {}; ['Q1','Q2','Q3','Q4'].forEach(qq => { if (q[qq]) vals.push(toSafeNumber(q[qq][key] || 0)); }); });
            } else if (timeframe === 'monthly_metrics') {
                yearsSorted.forEach(y => {
                    const m = trends.monthly?.[y] || {};
                    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                        .slice(Math.max(0, monthStart - 1), Math.max(0, monthEnd))
                        .forEach(mm => { if (m[mm]) vals.push(toSafeNumber(m[mm][key] || 0)); });
                });
            }
            return vals;
        };

        const factSeries = collectSeries('actual');
        const planSeries = collectSeries('plan');
        const factStats = computeStatsFromSeries(factSeries);
        const planStats = computeStatsFromSeries(planSeries);
        return { factStats, planStats, factForecast: factStats.forecast, planForecast: planStats.forecast };
    };

    // Мемоизированные прогнозы и статистики для контейнеров (единый метод)
    const forecasts = useMemo(() => computeForecastsForCurrentTimeframe(), [analyticsData, filters, timeframe, monthStart, monthEnd]);

    // Подготовка данных для трендов
    const trendData = useMemo(() => {
        if (!analyticsData || !analyticsData.trends) return [];
        const trendsData = analyticsData.trends;
        
        let data;
        switch (timeframe) {
            case 'yearly':
                data = prepareYearlyTrends(trendsData, filters);
                break;
            case 'quarterly':
                data = prepareQuarterlyTrends(trendsData, filters);
                break;
            case 'monthly_metrics':
                data = prepareMonthlyTrends(trendsData, filters);
                break;
            default:
                data = [];
        }
        
        // Добавляем прогноз если включен
        return addForecastToData(data);
    }, [analyticsData, filters, timeframe, trendType, monthStart, monthEnd, smoothing, showForecast]);

    // Вспомогательные функции для анализа
    const analyzeSeasonality = (data) => {
        if (data.length < 12) return null;
        
        const monthlyAverages = new Array(12).fill(0);
        const monthlyCounts = new Array(12).fill(0);
        
        data.forEach((value, index) => {
            const month = index % 12;
            monthlyAverages[month] += value;
            monthlyCounts[month] += 1;
        });
        
        const seasonalityIndex = monthlyAverages.map((sum, index) => 
            monthlyCounts[index] > 0 ? sum / monthlyCounts[index] : 0
        );
        
        return seasonalityIndex;
    };

    // Расчет волатильности
    const calculateVolatility = (data) => {
        if (!Array.isArray(data) || data.length < 2) return 0;
        const returns = [];
        for (let i = 1; i < data.length; i++) {
            const prev = data[i - 1];
            const curr = data[i];
            const denom = prev;
            const value = Number.isFinite(denom) && Math.abs(denom) > 0 ? (curr - prev) / denom : 0;
            returns.push(value);
        }
        if (returns.length === 0) return 0;
        const meanReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const variance = returns.reduce((sum, val) => sum + Math.pow(val - meanReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(Math.max(variance, 0));
        return Number.isFinite(stdDev) ? stdDev * 100 : 0; // В процентах
    };

    // Расчет доверительного интервала
    const calculateConfidence = (data, slope, intercept) => {
        if (data.length < 3) return 0.95;
        
        const predicted = data.map((_, index) => slope * index + intercept);
        const residuals = data.map((actual, index) => actual - predicted[index]);
        const mse = residuals.reduce((sum, val) => sum + val * val, 0) / residuals.length;
        
        // Упрощенный расчет доверительного интервала
        const confidence = Math.max(0.5, Math.min(0.99, 1 - (mse / Math.max(...data))));
        return confidence;
    };

    // Расширенная статистика с прогнозированием (с сервера)
    const statistics = useMemo(() => {
        if (!analyticsData?.trendStats) return null;
        const mode = timeframe === 'yearly' ? 'yearly' : timeframe === 'quarterly' ? 'quarterly' : 'monthly';
        return analyticsData.trendStats[mode] || null;
    }, [analyticsData, timeframe]);

    if (isLoading) {
        return (
            <div className="text-center p-4">
                <LoadingSpinner size="large" />
                <p className="mt-2">Загрузка данных трендов...</p>
            </div>
        );
    }

    if (!analyticsData || !trendData) {
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
        <div className="p-3">
            {/* Заголовок и управление */}
            <div className="row mb-4">
                <div className="col-md-8">
                    <h4 className="mb-0">Анализ трендов</h4>
                    <p className="text-muted mb-0">Динамика изменений показателей во времени с прогнозированием</p>
                </div>
                <div className="col-md-4">
                    <div className="d-flex gap-2 justify-content-end">
                        <select 
                            className="form-select form-select-sm"
                            value={timeframe} 
                            onChange={(e) => setTimeframe(e.target.value)}
                        >
                            <option value="yearly">По годам</option>
                            <option value="quarterly">По кварталам</option>
                            <option value="monthly_metrics">По месяцам</option>
                        </select>
                        <select 
                            className="form-select form-select-sm"
                            value={trendType} 
                            onChange={(e) => setTrendType(e.target.value)}
                        >
                            <option value="absolute">Абсолютные</option>
                            <option value="percentage">Проценты</option>
                            <option value="moving_average">Скользящее среднее</option>
                        </select>
                        <select 
                            className="form-select form-select-sm"
                            value={chartType} 
                            onChange={(e) => setChartType(e.target.value)}
                        >
                            <option value="line">Линии</option>
                            <option value="bar">Столбцы</option>
                            <option value="area">Площадь</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Дополнительные настройки */}
            <div className="row mb-3">
                <div className="col-12">
                    <div className="d-flex gap-3 align-items-center">
                        <div className={styles.customToggle}>
                            <label className={styles.toggleSwitch}>
                                <input 
                                    className={styles.toggleInput}
                                    type="checkbox" 
                                    checked={smoothing}
                                    onChange={(e) => setSmoothing(e.target.checked)}
                                />
                                <span className={styles.toggleSlider}></span>
                            </label>
                            <label className={styles.toggleLabel}>
                                Сглаживание
                            </label>
                        </div>
                        <div className={styles.customToggle}>
                            <label className={styles.toggleSwitch}>
                                <input 
                                    className={styles.toggleInput}
                                    type="checkbox" 
                                    checked={showForecast}
                                    onChange={(e) => setShowForecast(e.target.checked)}
                                />
                                <span className={styles.toggleSlider}></span>
                            </label>
                            <label className={styles.toggleLabel}>
                                Показать прогноз
                            </label>
                        </div>
                        {timeframe === 'monthly_metrics' && (
                            <div className="d-flex align-items-center gap-2">
                                <label className="form-label mb-0">Месяцы:</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={monthStart}
                                    onChange={(e) => { const v = Number(e.target.value); setMonthStart(v); onMonthRangeChange?.(v, monthEnd); }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <span>—</span>
                                <select
                                    className="form-select form-select-sm"
                                    value={monthEnd}
                                    onChange={(e) => { const v = Number(e.target.value); setMonthEnd(v); onMonthRangeChange?.(monthStart, v); }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* График трендов */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">Динамика показателей</h5>
                    <div style={{ height: '400px' }}>
                        {trendData && trendData.length > 0 ? (
                            <Chart
                                type={chartType}
                                data={trendData}
                                selectedMetrics={timeframe === 'monthly_metrics' ? (filters.years || []).map(y => String(y)) : (filters.metrics || ['plan', 'actual'])}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                Нет данных для отображения трендов
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Расширенная статистика */}
            {statistics && 
                <div className={styles.statsAndForecastRow}>
                    {/* Основные показатели */}
                    <div className={styles.sectionCard}>
                        <h6 className="card-title mb-3">
                            Статистические показатели
                        </h6>
                                <div className="row text-center mb-3">
                                    <div className="col-md-3 mb-3">
                                        <div className={`${styles.statCard} position-relative`}>
                                            <svg className={styles.infoIconMain} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <title>Последнее измеренное значение в выбранном периоде. Показывает актуальное состояние показателя.</title>
                                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                                <g id="SVGRepo_iconCarrier">
                                                    <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                </g>
                                            </svg>
                                            <div className={`${styles.statValue} text-primary`}>
                                                {statistics.current.toLocaleString('ru-RU')}
                                            </div>
                                            <div className={`${styles.statLabel}`}>Текущее значение</div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <div className={`${styles.statCard} position-relative`}>
                                            <svg className={styles.infoIconMain} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <title>Среднее арифметическое всех значений в периоде. Центральная тенденция данных.</title>
                                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                                <g id="SVGRepo_iconCarrier">
                                                    <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                </g>
                                            </svg>
                                            <div className={`${styles.statValue} text-info`}>
                                                {statistics.mean.toLocaleString('ru-RU')}
                                            </div>
                                            <div className={`${styles.statLabel}`}>Среднее</div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <div className={`${styles.statCard} position-relative`}>
                                            <svg className={styles.infoIconMain} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <title>Общее изменение показателя от первого к последнему значению в процентах. Положительный = рост, отрицательный = падение.</title>
                                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                                <g id="SVGRepo_iconCarrier">
                                                    <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                </g>
                                            </svg>
                                            <div className={`${styles.trendIndicator} ${parseFloat(statistics.trend) >= 0 ? styles.trendUp : styles.trendDown}`}>
                                                {parseFloat(statistics.trend) >= 0 ? '↑' : '↓'} {statistics.trend}%
                                            </div>
                                            <div className={`${styles.statLabel}`}>Общий тренд</div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <div className={`${styles.statCard} position-relative`}>
                                            <svg className={styles.infoIconMain} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <title>Мера изменчивости показателя. Высокая волатильность = большие колебания, низкая = стабильность.</title>
                                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                                <g id="SVGRepo_iconCarrier">
                                                    <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                </g>
                                            </svg>
                                            <div className={`${styles.volatilityIndicator} text-warning`}>
                                                    {statistics.volatility}%
                                            </div>
                                            <div className={`${styles.statLabel}`}>Волатильность</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Новые метрики */}
                                <div className={`${styles.statGrid}`}>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Значение, которое делит упорядоченный ряд данных пополам. 50% значений меньше медианы, 50% - больше.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>Медиана</div>
                                        <div className={`${styles.statMiniValue} ${styles.statInfo}`}>{toSafeNumber(forecasts?.factStats?.median || 0).toLocaleString('ru-RU')}</div>
                                    </div>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Значение, ниже которого находится 25% всех данных. Показывает нижнюю границу основного диапазона значений, исключая выбросы.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>25-й перцентиль</div>
                                        <div className={`${styles.statMiniValue}`}>{toSafeNumber(forecasts?.factStats?.q25 || 0).toLocaleString('ru-RU')}</div>
                                    </div>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Значение, ниже которого находится 75% всех данных. Показывает верхнюю границу основного диапазона значений.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>75-й перцентиль</div>
                                        <div className={`${styles.statMiniValue}`}>{toSafeNumber(forecasts?.factStats?.q75 || 0).toLocaleString('ru-RU')}</div>
                                    </div>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Межквартильный размах (Q75 - Q25). Показывает разброс средних 50% данных, исключая выбросы.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>IQR</div>
                                        <div className={`${styles.statMiniValue}`}>{toSafeNumber(forecasts?.factStats?.iqr || 0).toLocaleString('ru-RU')}</div>
                                    </div>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Коэффициент детерминации. Показывает, насколько хорошо линейная модель описывает данные (0-1, где 1 - идеальное соответствие).</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>R²</div>
                                        <div className={`${styles.statMiniValue} ${styles.statSuccess}`}>{((forecasts?.factStats?.r2 || 0)*100).toFixed(1)}%</div>
                                    </div>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Среднегодовой темп роста. Показывает, на сколько процентов в среднем растёт показатель каждый год.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>CAGR</div>
                                        <div className={`${styles.statMiniValue} ${styles.statSuccess}`}>{toSafeNumber(forecasts?.factStats?.cagr || 0).toFixed(2)}%</div>
                                    </div>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Максимальная просадка. Показывает наибольшее падение показателя от пикового значения в процентах.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>Max Drawdown</div>
                                        <div className={`${styles.statMiniValue} ${styles.statDanger}`}>{toSafeNumber(forecasts?.factStats?.maxDrawdown || 0).toFixed(2)}%</div>
                                    </div>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Общее количество измерений в выбранном периоде. Больше точек = более надёжная статистика.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>Кол-во точек</div>
                                        <div className={`${styles.statMiniValue}`}>{toSafeNumber(forecasts?.factStats?.count || 0).toLocaleString('ru-RU')}</div>
                                    </div>
                                    <div className={`${styles.statMiniCard} position-relative`}>
                                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Процент ненулевых значений от общего количества. Показывает полноту данных.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                        <div className={`${styles.statMiniLabel}`}>Доля ненулевых</div>
                                        <div className={`${styles.statMiniValue} ${styles.statPrimary}`}>{toSafeNumber(forecasts?.factStats?.nonZeroShare || 0).toFixed(1)}%</div>
                                    </div>
                                </div>
                    </div>

                    {/* Прогнозирование */}
                    <div className={styles.sectionCard}>
                        <h6 className="card-title mb-3">
                            Прогнозирование
                        </h6>
                    <div className={`${styles.forecastInnerGrid}`}>
                        <div className={`card ${styles.forecastCard}`}>
                            <div className="card-body">
                                <h6 className="card-title mb-3">
                                    Факт
                                </h6>
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="text-muted">Прогноз на следующий период:</span>
                                        <strong className="text-white">
                                            {toSafeNumber(forecasts?.factStats?.forecast || 0).toLocaleString('ru-RU')}
                                        </strong>
                                    </div>
                                    <div className={`${styles.forecastProgress}`}>
                                        <div 
                                            className={`${styles.forecastProgressBar}`}
                                            style={{width: `${Math.min(100, Math.max(0, (forecasts?.factStats?.confidence || 0.7) * 100))}%`}}
                                        ></div>
                                    </div>
                                    <div className={`${styles.confidenceIndicator} mt-2`}>
                                        <span className={`${styles.confidenceDot} ${(forecasts?.factStats?.confidence || 0.7) > 0.7 ? styles.confidenceHigh : (forecasts?.factStats?.confidence || 0.7) > 0.4 ? styles.confidenceMedium : styles.confidenceLow}`}></span>
                                        <small className="text-muted">
                                            Уверенность: {(((forecasts?.factStats?.confidence) ?? 0.7) * 100).toFixed(1)}%
                                        </small>
                                        <svg className={styles.infoIconInline} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Мера достоверности прогноза. Высокая уверенность = надёжный прогноз, низкая = большая неопределённость.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted">Наклон тренда:</span>
                                        <div className="d-flex align-items-center">
                                            <strong className={(forecasts?.factStats?.slope || 0) >= 0 ? 'text-success' : 'text-danger'}>
                                                {(forecasts?.factStats?.slope || 0) >= 0 ? '+' : ''}{(forecasts?.factStats?.slope || 0).toFixed(4)}
                                            </strong>
                                            <svg className={styles.infoIconInline} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <title>Скорость изменения показателя. Положительный = рост, отрицательный = падение. Чем больше значение, тем быстрее изменение.</title>
                                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                                <g id="SVGRepo_iconCarrier">
                                                    <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                </g>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Максимум:</span>
                                    <strong className="text-success">{toSafeNumber(forecasts?.factStats?.max || 0).toLocaleString('ru-RU')}</strong>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Минимум:</span>
                                    <strong className="text-danger">{toSafeNumber(forecasts?.factStats?.min || 0).toLocaleString('ru-RU')}</strong>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">Текущее:</span>
                                    <strong>{toSafeNumber(forecasts?.factStats?.current || 0).toLocaleString('ru-RU')}</strong>
                                </div>
                            </div>
                        </div>

                        <div className={`card ${styles.forecastCard}`}>
                            <div className="card-body">
                                <h6 className="card-title mb-3">
                                    <i className="fas fa-target me-2"></i>
                                    План
                                </h6>
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="text-muted">Прогноз на следующий период:</span>
                                        <strong className="text-white">
                                            {toSafeNumber(forecasts?.planStats?.forecast || 0).toLocaleString('ru-RU')}
                                        </strong>
                                    </div>
                                    <div className={`${styles.forecastProgress}`}>
                                        <div 
                                            className={`${styles.forecastProgressBar}`}
                                            style={{width: `${Math.min(100, Math.max(0, (forecasts?.planStats?.confidence || 0.7) * 100))}%`}}
                                        ></div>
                                    </div>
                                    <div className={`${styles.confidenceIndicator} mt-2`}>
                                        <span className={`${styles.confidenceDot} ${(forecasts?.planStats?.confidence || 0.7) > 0.7 ? styles.confidenceHigh : (forecasts?.planStats?.confidence || 0.7) > 0.4 ? styles.confidenceMedium : styles.confidenceLow}`}></span>
                                        <small className="text-muted">
                                            Уверенность: {(((forecasts?.planStats?.confidence) ?? 0.7) * 100).toFixed(1)}%
                                        </small>
                                        <svg className={styles.infoIconInline} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Мера достоверности прогноза. Высокая уверенность = надёжный прогноз, низкая = большая неопределённость.</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                        </svg>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted">Наклон тренда:</span>
                                        <div className="d-flex align-items-center">
                                            <strong className={(forecasts?.planStats?.slope || 0) >= 0 ? 'text-success' : 'text-danger'}>
                                                {(forecasts?.planStats?.slope || 0) >= 0 ? '+' : ''}{(forecasts?.planStats?.slope || 0).toFixed(4)}
                                            </strong>
                                            <svg className={styles.infoIconInline} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <title>Скорость изменения показателя. Положительный = рост, отрицательный = падение. Чем больше значение, тем быстрее изменение.</title>
                                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                                <g id="SVGRepo_iconCarrier">
                                                    <path d="M12 17V11" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="#000000"></circle>
                                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round"></path>
                                                </g>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Максимум:</span>
                                    <strong className="text-success">{toSafeNumber(forecasts?.planStats?.max || 0).toLocaleString('ru-RU')}</strong>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Минимум:</span>
                                    <strong className="text-danger">{toSafeNumber(forecasts?.planStats?.min || 0).toLocaleString('ru-RU')}</strong>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">Текущее:</span>
                                    <strong>{toSafeNumber(forecasts?.planStats?.current || 0).toLocaleString('ru-RU')}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            }

            {/* Анализ сезонности (только для месячных данных) */}
            {statistics && statistics.seasonality && timeframe === 'monthly_metrics' && (
                <div className={`card mt-3 ${styles.seasonalityChart}`}>
                    <div className="card-body">
                        <h6 className="card-title mb-3">
                            <i className="fas fa-calendar-alt me-2"></i>
                            Анализ сезонности
                        </h6>
                        <div className="row">
                            {statistics.seasonality.map((value, index) => {
                                const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 
                                                   'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                                const maxSeasonality = Math.max(...statistics.seasonality);
                                const percentage = maxSeasonality > 0 ? (value / maxSeasonality) * 100 : 0;
                                
                                return (
                                    <div key={index} className="col-md-1 mb-2">
                                        <div className="text-center">
                                            <div className="mb-1">
                                                <small className="text-muted">{monthNames[index]}</small>
                                            </div>
                                            <div className="progress" style={{height: '60px'}}>
                                                <div 
                                                    className={`progress-bar ${styles.seasonalityBar}`}
                                                    style={{
                                                        height: `${percentage}%`,
                                                        transform: 'rotate(180deg)',
                                                        transformOrigin: 'bottom'
                                                    }}
                                                ></div>
                                            </div>
                                            <small className="text-muted d-block mt-1">
                                                {value.toFixed(0)}
                                            </small>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsTrends; 
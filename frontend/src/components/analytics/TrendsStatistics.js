import React, { useMemo } from 'react';
import { toSafeNumber } from '../charts/utils/chartDataUtils';
import styles from './AnalyticsTrends.module.css';

/**
 * Компонент статистики и прогнозирования для трендов
 * Отделен от графика для независимого обновления
 */
const TrendsStatistics = ({ 
    data, 
    trendStats, 
    timeframe = 'yearly',
    animationKey = 0 
}) => {
    
    // Дополнительная статистика
    const additionalStats = useMemo(() => {
        // Если есть данные с сервера, используем их
        if (trendStats) {
            return {
                rSquared: (trendStats.r2 * 100).toFixed(2),
                median: trendStats.median.toLocaleString('ru-RU'),
                q25: trendStats.q25.toLocaleString('ru-RU'),
                q75: trendStats.q75.toLocaleString('ru-RU'),
                cagr: trendStats.cagr.toFixed(2),
                maxDrawdown: Math.abs(trendStats.maxDrawdown).toFixed(2),
                count: trendStats.count,
                nonZeroShare: trendStats.nonZeroShare.toFixed(1)
            };
        }
        
        // Иначе вычисляем локально
        if (!data || data.length === 0) return {};
        
        const values = data.map(item => toSafeNumber(item.actual || 0));
        const sortedValues = [...values].sort((a, b) => a - b);
        const n = values.length;
        
        // R² (коэффициент детерминации)
        const mean = values.reduce((sum, val) => sum + val, 0) / n;
        const ssRes = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
        const ssTot = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
        const rSquared = ssTot > 0 ? (1 - ssRes / ssTot) * 100 : 0;
        
        // Медиана
        const median = n % 2 === 0 
            ? (sortedValues[n/2 - 1] + sortedValues[n/2]) / 2
            : sortedValues[Math.floor(n/2)];
        
        // Квантили (25% и 75%)
        const q25 = sortedValues[Math.floor(n * 0.25)];
        const q75 = sortedValues[Math.floor(n * 0.75)];
        
        // CAGR (Compound Annual Growth Rate)
        const firstValue = values[0];
        const lastValue = values[n - 1];
        const cagr = firstValue > 0 ? Math.pow(lastValue / firstValue, 1 / (n - 1)) - 1 : 0;
        
        // Max Drawdown
        let maxDrawdown = 0;
        let peak = values[0];
        for (let i = 1; i < values.length; i++) {
            if (values[i] > peak) {
                peak = values[i];
            }
            const drawdown = (peak - values[i]) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        return {
            rSquared: rSquared.toFixed(2),
            median: median.toLocaleString('ru-RU'),
            q25: q25.toLocaleString('ru-RU'),
            q75: q75.toLocaleString('ru-RU'),
            cagr: (cagr * 100).toFixed(2),
            maxDrawdown: (maxDrawdown * 100).toFixed(2),
            count: n,
            nonZeroShare: ((data.filter(item => toSafeNumber(item.actual) > 0).length / n) * 100).toFixed(1)
        };
    }, [data, trendStats]);
    
    // Прогноз на следующий период
    const forecast = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        const actualValues = data.map(item => toSafeNumber(item.actual || 0));
        const planValues = data.map(item => toSafeNumber(item.plan || 0));
        const n = actualValues.length;
        
        // Функция для вычисления линейной регрессии
        const calculateRegression = (values) => {
            if (n === 1) {
                // Если только одна точка, просто возвращаем её значение
                return {
                    value: values[0],
                    confidence: 50,
                    slope: 0
                };
            }
            
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
            const forecastValue = slope * n + intercept;
            
            // Уверенность в прогнозе (на основе R²)
            const mean = sumY / n;
            const ssRes = values.reduce((sum, val, i) => sum + Math.pow(val - (slope * i + intercept), 2), 0);
            const ssTot = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
            const confidence = ssTot > 0 ? Math.max(0, Math.min(100, (1 - ssRes / ssTot) * 100)) : 50;
            
            return {
                value: forecastValue,
                confidence: confidence,
                slope: slope
            };
        };
        
        const actualForecast = calculateRegression(actualValues);
        const planForecast = calculateRegression(planValues);
        
        return {
            value: actualForecast.value.toLocaleString('ru-RU'),
            planValue: planForecast.value.toLocaleString('ru-RU'),
            confidence: actualForecast.confidence.toFixed(1),
            slope: actualForecast.slope.toFixed(4),
            planSlope: planForecast.slope.toFixed(4),
            change: ((actualForecast.value - actualValues[n-1]) / actualValues[n-1] * 100).toFixed(1)
        };
    }, [data]);
    
    if (!data || data.length === 0) {
        return null;
    }
    
    return (
        <div className={`${styles.statsAndForecastRow} ${styles.fadeInUp}`} key={`stats-${animationKey}`}>
            {/* Основные показатели */}
            <div className={styles.sectionCard}>
                <h6 className="card-title mb-3">
                    Статистические показатели
                </h6>
                <div className="row text-center mb-3">
                    <div className="col-md-3 mb-3">
                        <div className={`${styles.statCard} position-relative`}>
                            <svg className={styles.infoIconMain} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <title>Текущее значение показателя на последний период</title>
                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                <g id="SVGRepo_iconCarrier">
                                    <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                </g>
                                <div className={styles.infoTooltip}>
                                    Текущее значение показателя на последний период
                                </div>
                            </svg>
                            <div className={`${styles.statValue} text-primary`}>
                                {trendStats?.current ? 
                                    trendStats.current.toLocaleString('ru-RU') :
                                    (data && data.length > 0 ? 
                                        (data[data.length - 1]?.actual || 0).toLocaleString('ru-RU') : 
                                        '0'
                                    )
                                }
                            </div>
                            <div className={`${styles.statLabel}`}>Текущее значение</div>
                        </div>
                    </div>
                    <div className="col-md-3 mb-3">
                        <div className={`${styles.statCard} position-relative`}>
                            <svg className={styles.infoIconMain} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <title>Среднее арифметическое значение за весь период</title>
                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                <g id="SVGRepo_iconCarrier">
                                    <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                </g>
                                <div className={styles.infoTooltip}>
                                    Среднее арифметическое значение за весь период
                                </div>
                            </svg>
                            <div className={`${styles.statValue} text-info`}>
                                {trendStats?.mean ? 
                                    trendStats.mean.toLocaleString('ru-RU') :
                                    (data && data.length > 0 ? 
                                        (data.reduce((sum, item) => sum + toSafeNumber(item.actual), 0) / data.length).toLocaleString('ru-RU') :
                                        '0'
                                    )
                                }
                            </div>
                            <div className={`${styles.statLabel}`}>Среднее</div>
                        </div>
                    </div>
                    <div className="col-md-3 mb-3">
                        <div className={`${styles.statCard} position-relative`}>
                            <svg className={styles.infoIconMain} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <title>Общее изменение показателя от первого к последнему периоду в процентах</title>
                                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                <g id="SVGRepo_iconCarrier">
                                    <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                </g>
                                <div className={styles.infoTooltip}>
                                    Общее изменение показателя от первого к последнему периоду в процентах
                                </div>
                            </svg>
                            <div className={`${styles.trendIndicator} ${(() => {
                                const trend = trendStats?.trend || (data && data.length > 1 ? 
                                    (() => {
                                        const first = toSafeNumber(data[0]?.actual || 0);
                                        const last = toSafeNumber(data[data.length - 1]?.actual || 0);
                                        return first > 0 ? ((last - first) / first) * 100 : 0;
                                    })() : 0
                                );
                                return parseFloat(trend) >= 0 ? styles.trendUp : styles.trendDown;
                            })()}`}>
                                {(() => {
                                    const trend = trendStats?.trend || (data && data.length > 1 ? 
                                        (() => {
                                            const first = toSafeNumber(data[0]?.actual || 0);
                                            const last = toSafeNumber(data[data.length - 1]?.actual || 0);
                                            return first > 0 ? ((last - first) / first) * 100 : 0;
                                        })() : 0
                                    );
                                    return `${parseFloat(trend) >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(trend)).toFixed(2)}%`;
                                })()}
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
                                    <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                    <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                </g>
                                <div className={styles.infoTooltip}>
                                    Мера изменчивости показателя (стандартное отклонение относительно среднего)
                                </div>
                            </svg>
                            <div className={`${styles.volatilityIndicator} text-warning`}>
                                {trendStats?.volatility ? 
                                    `${trendStats.volatility}%` :
                                    (data && data.length > 1 ? 
                                        (() => {
                                            const values = data.map(item => toSafeNumber(item.actual || 0));
                                            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
                                            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                                            const volatility = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;
                                            return `${volatility.toFixed(2)}%`;
                                        })() : '0%'
                                    )
                                }
                            </div>
                            <div className={`${styles.statLabel}`}>Волатильность</div>
                        </div>
                    </div>
                </div>
                
                {/* Дополнительные мини-карточки статистики */}
                <div className={styles.statGrid}>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>Значение, которое делит данные пополам (50% значений выше, 50% ниже)</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                Значение, которое делит данные пополам (50% значений выше, 50% ниже)
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statInfo}`}>
                            {additionalStats.median}
                        </div>
                        <div className={styles.statMiniLabel}>Медиана</div>
                    </div>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>25% значений ниже этого показателя</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                25% значений ниже этого показателя
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statSuccess}`}>
                            {additionalStats.q25}
                        </div>
                        <div className={styles.statMiniLabel}>25-й перцентиль</div>
                    </div>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>75% значений ниже этого показателя</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                75% значений ниже этого показателя
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statWarning}`}>
                            {additionalStats.q75}
                        </div>
                        <div className={styles.statMiniLabel}>75-й перцентиль</div>
                    </div>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>Межквартильный размах (разность между 75-м и 25-м перцентилями)</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                Межквартильный размах (разность между 75-м и 25-м перцентилями)
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statPrimary}`}>
                            {(toSafeNumber(additionalStats.q75) - toSafeNumber(additionalStats.q25)).toLocaleString('ru-RU')}
                        </div>
                        <div className={styles.statMiniLabel}>IQR</div>
                    </div>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>Коэффициент детерминации (качество линейной регрессии)</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                Коэффициент детерминации (качество линейной регрессии)
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statPrimary}`}>
                            {additionalStats.rSquared}%
                        </div>
                        <div className={styles.statMiniLabel}>R²</div>
                    </div>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>Среднегодовой темп роста (Compound Annual Growth Rate)</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                Среднегодовой темп роста (Compound Annual Growth Rate)
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statPrimary}`}>
                            {additionalStats.cagr}%
                        </div>
                        <div className={styles.statMiniLabel}>CAGR</div>
                    </div>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>Максимальное падение от пика до минимума</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                Максимальное падение от пика до минимума
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statDanger}`}>
                            {additionalStats.maxDrawdown}%
                        </div>
                        <div className={styles.statMiniLabel}>Max Drawdown</div>
                    </div>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>Общее количество периодов в анализе</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                Общее количество периодов в анализе
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statInfo}`}>
                            {additionalStats.count || data.length}
                        </div>
                        <div className={styles.statMiniLabel}>Кол-во точек</div>
                    </div>
                    <div className={styles.statMiniCard}>
                        <svg className={styles.infoIconMini} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>Процент периодов с ненулевыми значениями</title>
                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                            <g id="SVGRepo_iconCarrier">
                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                            </g>
                            <div className={styles.infoTooltip}>
                                Процент периодов с ненулевыми значениями
                            </div>
                        </svg>
                        <div className={`${styles.statMiniValue} ${styles.statSuccess}`}>
                            {additionalStats.nonZeroShare || ((data.filter(item => toSafeNumber(item.actual) > 0).length / data.length) * 100).toFixed(1)}%
                        </div>
                        <div className={styles.statMiniLabel}>Доля ненулевых</div>
                    </div>
                </div>
            </div>
            
            {/* Карточки прогнозирования */}
            {forecast && (
                <div className={styles.sectionCard}>
                    <h6 className="card-title mb-3">Прогнозирование</h6>
                    <div className={styles.forecastInnerGrid}>
                        {/* Карточка Факт */}
                        <div className={`${styles.forecastCard} card`}>
                            <div className="card-body">
                                <h6 className="card-title">Факт</h6>
                                
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Прогноз на следующий период</div>
                                    <div className="h5 text-white">
                                        <strong>{forecast.value}</strong>
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="text-muted">Уверенность</div>
                                        <div className="text-white">
                                            <strong>{forecast.confidence}%</strong>
                                        </div>
                                    </div>
                                    <div className={styles.forecastProgress}>
                                        <div 
                                            className={styles.forecastProgressBar}
                                            style={{ width: `${forecast.confidence}%` }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Наклон тренда</div>
                                    <div className="text-white d-flex align-items-center">
                                        <strong>+{forecast.slope}</strong>
                                        <svg className={styles.infoIconInline} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Скорость изменения показателя (положительный наклон = рост)</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                            <div className={styles.infoTooltip}>
                                                Скорость изменения показателя (положительный наклон = рост)
                                            </div>
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Максимум</div>
                                    <div className="text-white">
                                        <strong>{Math.max(...data.map(item => toSafeNumber(item.actual))).toLocaleString('ru-RU')}</strong>
                                    </div>
                                </div>
                                
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Минимум</div>
                                    <div className="text-white">
                                        <strong>{Math.min(...data.map(item => toSafeNumber(item.actual))).toLocaleString('ru-RU')}</strong>
                                    </div>
                                </div>
                                
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Текущее</div>
                                    <div className="text-white">
                                        <strong>{data[data.length - 1]?.actual?.toLocaleString('ru-RU') || '0'}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Карточка План */}
                        <div className={`${styles.forecastCard} card`}>
                            <div className="card-body">
                                <h6 className="card-title">План</h6>
                                
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Прогноз на следующий период</div>
                                    <div className="h5 text-white">
                                        <strong>{forecast.planValue || '0'}</strong>
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="text-muted">Уверенность</div>
                                        <div className="text-white">
                                            <strong>{forecast.confidence}%</strong>
                                        </div>
                                    </div>
                                    <div className={styles.forecastProgress}>
                                        <div 
                                            className={styles.forecastProgressBar}
                                            style={{ width: `${forecast.confidence}%` }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Наклон тренда</div>
                                    <div className="text-white d-flex align-items-center">
                                        <strong>+{forecast.planSlope || '0'}</strong>
                                        <svg className={styles.infoIconInline} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <title>Скорость изменения планового показателя (положительный наклон = рост)</title>
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                                <path d="M12 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"></circle>
                                                <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                                            </g>
                                            <div className={styles.infoTooltip}>
                                                Скорость изменения планового показателя (положительный наклон = рост)
                                            </div>
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Максимум</div>
                                    <div className="text-white">
                                        <strong>{Math.max(...data.map(item => toSafeNumber(item.plan))).toLocaleString('ru-RU')}</strong>
                                    </div>
                                </div>
                                
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Минимум</div>
                                    <div className="text-white">
                                        <strong>{Math.min(...data.map(item => toSafeNumber(item.plan))).toLocaleString('ru-RU')}</strong>
                                    </div>
                                </div>
                                
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="text-muted">Текущее</div>
                                    <div className="text-white">
                                        <strong>{data[data.length - 1]?.plan?.toLocaleString('ru-RU') || '0'}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrendsStatistics;



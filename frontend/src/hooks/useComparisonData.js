import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from './index.js';

/**
 * Хук для загрузки данных сравнения для слайдов отчетов.
 * Использует существующий API analytics/comprehensive
 */
export const useComparisonData = (filters = {}, enabled = true) => {
    const { showError } = useNotifications();
    
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetchTime, setLastFetchTime] = useState(null);

    // Кэширование данных на 5 минут (как в других компонентах отчетов)
    const CACHE_DURATION = 5 * 60 * 1000;

    // Проверка необходимости обновления данных
    const shouldRefetch = useMemo(() => {
        if (!lastFetchTime) return true;
        return Date.now() - lastFetchTime > CACHE_DURATION;
    }, [lastFetchTime]);

    // Формирование параметров запроса
    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        
        if (filters.years?.length > 0) {
            params.append('years', filters.years.join(','));
        }
        if (filters.categories?.length > 0) {
            params.append('categories', filters.categories.join(','));
        }
        if (filters.shops?.length > 0) {
            params.append('shops', filters.shops.join(','));
        }
        if (filters.metrics?.length > 0) {
            params.append('metrics', filters.metrics.join(','));
        }
        
        return params.toString();
    }, [filters]);

    // Загрузка данных сравнения
    const fetchComparisonData = useCallback(async () => {
        if (!enabled || !queryParams) return;

        try {
            setIsLoading(true);
            setError(null);

            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Токен авторизации не найден');
            }

            const url = `/api/v1/finance/analytics/comprehensive?${queryParams}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Обработка и структурирование данных для графиков
            const processedData = processComparisonData(result, filters);
            
            setData(processedData);
            setLastFetchTime(Date.now());
            
        } catch (err) {
            const errorMessage = err.message || 'Ошибка загрузки данных сравнения';
            setError(errorMessage);
            showError('Ошибка загрузки', errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [enabled, queryParams, filters, showError]);

    // Обработка данных для графиков
    const processComparisonData = useCallback((rawData, currentFilters) => {
        if (!rawData) return null;

        const { comparison, planVsActual, trends } = rawData;
        
        // Подготавливаем данные для разных типов графиков
        const chartData = {
            // Данные для сравнения по годам
            yearlyComparison: prepareYearlyComparisonData(comparison?.yearly, currentFilters),
            
            // Данные для сравнения по категориям
            categoryComparison: prepareCategoryComparisonData(comparison?.categories, currentFilters),
            
            // Данные для сравнения по магазинам
            shopComparison: prepareShopComparisonData(comparison?.shops, currentFilters),
            
            // Данные план vs факт
            planVsActual: preparePlanVsActualData(planVsActual, currentFilters),
            
            // Данные трендов
            trends: prepareTrendsData(trends, currentFilters),
            
            // Метаданные
            metadata: {
                totalYears: currentFilters.years?.length || 0,
                totalCategories: currentFilters.categories?.length || 0,
                totalShops: currentFilters.shops?.length || 0,
                totalMetrics: currentFilters.metrics?.length || 0,
                lastUpdated: new Date().toISOString()
            }
        };

        return chartData;
    }, []);

    // Подготовка данных для сравнения по годам
    const prepareYearlyComparisonData = useCallback((yearlyData, filters) => {
        if (!yearlyData || !filters.years?.length) return [];

        return filters.years
            .sort((a, b) => a - b)
            .map(year => {
                const yearData = yearlyData[year] || {};
                return {
                    label: year.toString(),
                    plan: yearData.plan || 0,
                    fact: yearData.actual || 0,
                    deviation: yearData.deviation || 0,
                    percentage: yearData.percentage || 0
                };
            });
    }, []);

    // Подготовка данных для сравнения по категориям
    const prepareCategoryComparisonData = useCallback((categoryData, filters) => {
        if (!categoryData) return [];

        if (filters.categories?.length) {
            // Фильтруем по выбранным категориям
            return Object.entries(categoryData)
                .filter(([categoryId]) => filters.categories.includes(categoryId))
                .map(([categoryName, data]) => ({
                    label: categoryName,
                    plan: data.plan || 0,
                    fact: data.actual || 0,
                    deviation: data.deviation || 0,
                    percentage: data.percentage || 0
                }));
        }

        // Возвращаем все категории
        return Object.entries(categoryData).map(([categoryName, data]) => ({
            label: categoryName,
            plan: data.plan || 0,
            fact: data.actual || 0,
            deviation: data.deviation || 0,
            percentage: data.percentage || 0
        }));
    }, []);

    // Подготовка данных для сравнения по магазинам
    const prepareShopComparisonData = useCallback((shopData, filters) => {
        if (!shopData) return [];

        if (filters.shops?.length) {
            // Фильтруем по выбранным магазинам
            return Object.entries(shopData)
                .filter(([shopId]) => filters.shops.includes(shopId))
                .map(([shopName, data]) => ({
                    label: shopName,
                    plan: data.plan || 0,
                    fact: data.actual || 0,
                    deviation: data.deviation || 0,
                    percentage: data.percentage || 0
                }));
        }

        // Возвращаем все магазины
        return Object.entries(shopData).map(([shopName, data]) => ({
            label: shopName,
            plan: data.plan || 0,
            fact: data.actual || 0,
            deviation: data.deviation || 0,
            percentage: data.percentage || 0
        }));
    }, []);

    // Подготовка данных план vs факт
    const preparePlanVsActualData = useCallback((planVsActualData, filters) => {
        if (!planVsActualData) return {};

        const result = {};

        // Фильтруем по выбранным категориям
        if (filters.categories?.length) {
            result.categories = Object.entries(planVsActualData.categories || {})
                .filter(([categoryId]) => filters.categories.includes(categoryId))
                .reduce((acc, [categoryId, data]) => {
                    acc[categoryId] = data;
                    return acc;
                }, {});
        } else {
            result.categories = planVsActualData.categories || {};
        }

        // Фильтруем по выбранным магазинам
        if (filters.shops?.length) {
            result.shops = Object.entries(planVsActualData.shops || {})
                .filter(([shopId]) => filters.shops.includes(shopId))
                .reduce((acc, [shopId, data]) => {
                    acc[shopId] = data;
                    return acc;
                }, {});
        } else {
            result.shops = planVsActualData.shops || {};
        }

        result.metrics = planVsActualData.metrics || {};

        return result;
    }, []);

    // Подготовка данных трендов
    const prepareTrendsData = useCallback((trendsData, filters) => {
        if (!trendsData) return {};

        return {
            yearly: trendsData.yearly || {},
            quarterly: trendsData.quarterly || {},
            monthly: trendsData.monthly || {}
        };
    }, []);

    // Автоматическая загрузка при изменении фильтров
    useEffect(() => {
        if (enabled && shouldRefetch) {
            fetchComparisonData();
        }
    }, [enabled, shouldRefetch, fetchComparisonData]);

    // Принудительное обновление данных
    const refresh = useCallback(() => {
        setLastFetchTime(null); // Сбрасываем кэш
        fetchComparisonData();
    }, [fetchComparisonData]);

    // Проверка валидности фильтров
    const hasValidFilters = useMemo(() => {
        return filters.years?.length > 0 || 
               filters.categories?.length > 0 || 
               filters.shops?.length > 0;
    }, [filters]);

    return {
        data,
        isLoading,
        error,
        hasValidFilters,
        refresh,
        lastFetchTime
    };
};


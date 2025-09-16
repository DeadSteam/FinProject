import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNotifications } from '../../hooks';
import { useAnalyticsService } from '../../services/index.js';
import { getMonthKey, buildPlanVsActualTable } from '../charts/utils/chartDataUtils';
import { dev } from '../../utils/env';

// Контекст для данных отчетов
const ReportDataContext = createContext();

/**
 * Провайдер данных для системы отчетов.
 * Управляет загрузкой и кэшированием данных из Analytics и FinanceDetails.
 */
export const ReportDataProvider = ({ children }) => {
    const { showError } = useNotifications();
    const analyticsService = useAnalyticsService();
    
    // Состояние данных с мемоизацией
    const [analyticsData, setAnalyticsData] = useState(null);
    const [financeData, setFinanceData] = useState(null);
    const [availableLists, setAvailableLists] = useState({
        years: [],
        categories: [],
        subcategories: [],
        shops: [],
        metrics: []
    });
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
    const [isLoadingFinance, setIsLoadingFinance] = useState(false);
    
    // Кэш данных для оптимизации - используем useRef для предотвращения сбросов
    const dataCache = useRef(new Map());
    const pendingRequests = useRef(new Map()); // Дедупликация запросов
    /**
     * Загрузка справочных списков (годы/категории/магазины)
     * Повторяет поведение страницы аналитики, чтобы фильтры были реальными
     */
    const loadReferenceLists = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            const [yearsRes, categoriesRes, shopsRes] = await Promise.all([
                fetch('/api/v1/finance/years', { headers }),
                fetch('/api/v1/finance/categories', { headers }),
                fetch('/api/v1/finance/shops', { headers })
            ]);
            
            // Загружаем метрики отдельно, так как они могут быть пустыми
            let metricsRes;
            try {
                // Пробуем загрузить метрики с категориями
                metricsRes = await fetch('/api/v1/finance/metrics/search?limit=100', { headers });
            } catch (e) {
                if (dev) console.warn('Не удалось загрузить метрики:', e);
                metricsRes = { ok: false };
            }

            if (!yearsRes.ok || !categoriesRes.ok || !shopsRes.ok) {
                throw new Error('Failed to load reference lists');
            }
            
            // Метрики не критичны, если не загрузились - продолжаем

            const [years, categories, shops, metrics] = await Promise.all([
                yearsRes.json(),
                categoriesRes.json(),
                shopsRes.json(),
                metricsRes.ok ? metricsRes.json() : Promise.resolve([])
            ]);

            setAvailableLists(prev => ({
                years: Array.isArray(years) ? years : (years?.items || []),
                categories: Array.isArray(categories) ? categories : (categories?.items || []),
                subcategories: prev.subcategories,
                shops: Array.isArray(shops) ? shops : (shops?.items || []),
                metrics: Array.isArray(metrics) ? metrics : (metrics?.items || [])
            }));
            
        } catch (e) {
            if (dev) console.warn('Не удалось загрузить справочные списки:', e);
        }
    }, []);

    // Загрузка подкатегорий больше не требуется — используем единый список категорий

    // Инициализационная загрузка справочников (только один раз)
    useEffect(() => {
        // Проверяем, не загружены ли уже справочники
        if (availableLists.years.length === 0 && availableLists.categories.length === 0) {
            loadReferenceLists();
        }
    }, []); // Убираем зависимость от loadReferenceLists


    /**
     * Загрузка данных аналитики с дедупликацией запросов
     */
    const loadAnalyticsData = useCallback(async (filters = {}) => {
        const normalized = {
            startDate: filters.startDate,
            endDate: filters.endDate,
            years: Array.isArray(filters.years) ? filters.years.map(y => (y?.value ?? y?.id ?? y)) : [],
            categories: Array.isArray(filters.categories) ? filters.categories.map(c => (c?.value ?? c?.id ?? c)) : [],
            shops: Array.isArray(filters.shops) ? filters.shops.map(s => (s?.value ?? s?.id ?? s)) : [],
            metrics: Array.isArray(filters.metrics) ? filters.metrics.map(m => (m?.value ?? m?.id ?? m)) : [],
            periodType: filters.periodType || 'years'
        };
        
        // Добавляем поддержку прямых UUID из SlideEditor
        if (filters.category && !normalized.categories.includes(filters.category)) {
            normalized.categories.push(filters.category);
        }
        if (filters.shop && !normalized.shops.includes(filters.shop)) {
            normalized.shops.push(filters.shop);
        }
        if (filters.year && !normalized.years.includes(filters.year)) {
            normalized.years.push(filters.year);
        }
        const cacheKey = `analytics_${JSON.stringify(normalized)}`;
        
        // Проверяем кэш
        if (dataCache.current.has(cacheKey)) {
            const cachedData = dataCache.current.get(cacheKey);
            if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 минут
                setAnalyticsData(cachedData.data);
                return cachedData.data;
            }
        }

        // Проверяем, есть ли уже выполняющийся запрос с такими же параметрами
        if (pendingRequests.current.has(cacheKey)) {
            return pendingRequests.current.get(cacheKey);
        }

        setIsLoadingAnalytics(true);
        
        const requestPromise = (async () => {
            try {
                // Используем правильную функцию аналитики  
                const data = await analyticsService.getAnalytics(normalized);
                
                // Кэшируем данные
                dataCache.current.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
                
                setAnalyticsData(data);
                
                return data;
            } catch (error) {
                if (dev) console.error('Error loading analytics data:', error);
                showError('Ошибка загрузки данных аналитики');
                return null;
            } finally {
                setIsLoadingAnalytics(false);
                // Удаляем из pending запросов
                pendingRequests.current.delete(cacheKey);
            }
        })();

        // Сохраняем промис для дедупликации
        pendingRequests.current.set(cacheKey, requestPromise);
        
        return requestPromise;
    }, [analyticsService, showError]);

    /**
     * Загрузка финансовых данных с дедупликацией запросов
     */
    const loadFinanceData = useCallback(async (filters = {}) => {
        const cacheKey = `finance_${JSON.stringify(filters)}`;
        
        // Проверяем кэш
        if (dataCache.current.has(cacheKey)) {
            const cachedData = dataCache.current.get(cacheKey);
            if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 минут
                setFinanceData(cachedData.data);
                return cachedData.data;
            }
        }

        // Проверяем, есть ли уже выполняющийся запрос с такими же параметрами
        if (pendingRequests.current.has(cacheKey)) {
            return pendingRequests.current.get(cacheKey);
        }

        setIsLoadingFinance(true);
        
        const requestPromise = (async () => {
            try {
                // Используем прямой GET к сводной аналитике (совместимо с backend)
                const token = localStorage.getItem('authToken');
                const headers = {
                    'Authorization': `Bearer ${token}`
                };

                const params = new URLSearchParams();
                if (filters.startDate) params.set('start_date', filters.startDate);
                if (filters.endDate) params.set('end_date', filters.endDate);
                if (filters.category) params.set('category', filters.category);
                if (filters.operationType) params.set('operation_type', filters.operationType);

                // Совместимые с аналитикой фильтры: годы/категории/магазины/метрики
                const years = Array.isArray(filters.years) ? filters.years.map(y => (y?.value ?? y?.id ?? y)) : [];
                const categories = Array.isArray(filters.categories) ? filters.categories.map(c => (c?.value ?? c?.id ?? c)) : [];
                const shops = Array.isArray(filters.shops) ? filters.shops.map(s => (s?.value ?? s?.id ?? s)) : [];
                
                // Добавляем поддержку прямых UUID из SlideEditor
                if (filters.category && !categories.includes(filters.category)) {
                    categories.push(filters.category);
                }
                if (filters.shop && !shops.includes(filters.shop)) {
                    shops.push(filters.shop);
                }
                const metrics = Array.isArray(filters.metrics) ? filters.metrics.map(m => (m?.value ?? m?.id ?? m)) : [];
                const subcategory = filters.subcategory ?? (Array.isArray(filters.subcategories) ? filters.subcategories[0] : undefined);

                if (years.length) params.set('years', years.join(','));
                if (categories.length) params.set('categories', categories.join(','));
                if (shops.length) params.set('shops', shops.join(','));
                if (metrics.length) params.set('metrics', metrics.join(','));
                if (subcategory && subcategory !== 'all') params.set('subcategory', subcategory);
                // Передаем тип периода чтобы backend мог вернуть monthly/quarterly
                if (filters.periodType) params.set('period_type', filters.periodType);

                // cache buster
                params.set('_', Date.now().toString());

                const analyticsResponse = await fetch(`/api/v1/finance/analytics/comprehensive?${params.toString()}`, {
                    method: 'GET',
                    headers
                });

                if (!analyticsResponse.ok) {
                    throw new Error('Ошибка получения финансовой аналитики');
                }

                const analytics = await analyticsResponse.json();

                // Попытаемся извлечь справочники, если backend их возвращает рядом
                if (analytics?.lists) {
                    const lists = analytics.lists;
                    setAvailableLists({
                        years: lists.years || [],
                        categories: lists.categories || [],
                        shops: lists.shops || [],
                        metrics: lists.metrics || []
                    });
                } else {
                    // Если бэкенд не вернул lists в этом эндпоинте — подгружаем справочники отдельно
                    if ((availableLists.years?.length || 0) === 0 || (availableLists.categories?.length || 0) === 0 || (availableLists.shops?.length || 0) === 0) {
                        loadReferenceLists();
                    }
                }

                const data = {
                    analytics: analytics,
                    summary: {
                        totalIncome: analytics.total_income || 0,
                        totalExpense: analytics.total_expense || 0,
                        transactionsCount: analytics.transactions_count || 0
                    },
                    transactions: analytics.recent_transactions || []
                };
                
                // Кэшируем данные
                dataCache.current.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
                
                setFinanceData(data);
                
                return data;
            } catch (error) {
                if (dev) console.error('Error loading finance data:', error);
                showError('Ошибка загрузки финансовых данных');
                return null;
            } finally {
                setIsLoadingFinance(false);
                // Удаляем из pending запросов
                pendingRequests.current.delete(cacheKey);
            }
        })();

        // Сохраняем промис для дедупликации
        pendingRequests.current.set(cacheKey, requestPromise);
        
        return requestPromise;
    }, [availableLists, loadReferenceLists, showError]);

    /**
     * Преобразует название месяца в ключ для periods_value
     */
    // перенесено в utils/chartDataUtils

    /**
     * Детальные финансовые метрики для FinanceDetails-подобных графиков
     */
    const loadFinanceDetails = async (filters = {}) => {
        try {
            // Улучшенная логика извлечения UUID из фильтров
            let categoryId = filters.category || filters.categoryId;
            let shopId = filters.shop || filters.shopId;
            
            // Если categoryId/shopId не найдены, пробуем извлечь из массивов
            if (!categoryId && Array.isArray(filters.categories) && filters.categories.length > 0) {
                categoryId = filters.categories[0]?.value ?? filters.categories[0]?.id ?? filters.categories[0];
            }
            if (!shopId && Array.isArray(filters.shops) && filters.shops.length > 0) {
                shopId = filters.shops[0]?.value ?? filters.shops[0]?.id ?? filters.shops[0];
            }
            
            const year = (filters.year || (Array.isArray(filters.years) ? (filters.years[0]?.value ?? filters.years[0]?.id ?? filters.years[0]) : undefined)) ?? new Date().getFullYear();


            if (!categoryId || !shopId) {
                if (dev) console.log('[ReportDataProvider] loadFinanceDetails: missing categoryId or shopId', { categoryId, shopId });
                return null;
            }

            // Дедупликация и кэширование детальных метрик
            const normalized = { categoryId, shopId, year, periodType: filters.periodType || 'quarters', metric: filters.metric || 'all' };
            const cacheKey = `finance_details_${JSON.stringify(normalized)}`;
            if (dataCache.current.has(cacheKey)) {
                const cached = dataCache.current.get(cacheKey);
                if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
                    return cached.data;
                }
            }

            // Используем тот же сервис, что и FinanceDetails
            const details = await analyticsService.getDetailedCategoryMetrics(categoryId, shopId, year);
            
            if (dev) console.log('[ReportDataProvider] loadFinanceDetails result:', details);
            if (dev) console.log('[ReportDataProvider] loadFinanceDetails metrics structure:', details?.metrics?.[0]);
            
            // Возвращаем данные в формате, совместимом с DataTable
            if (details && details.metrics && Array.isArray(details.metrics) && details.metrics.length > 0) {
                // API уже возвращает данные в правильном формате periods_value
                const transformedMetrics = details.metrics.map(metric => ({
                    id: metric.metric_id || metric.id,
                    name: metric.metric_name || metric.name,
                    unit: metric.unit || 'руб.',
                    periods_value: metric.periods_value || {
                        quarters: {},
                        months: {}
                    }
                }));

                // Создаем chartData для графиков из первой метрики
                let chartData = [];
                if (transformedMetrics.length > 0) {
                    const firstMetric = transformedMetrics[0];
                    const periodsValue = firstMetric.periods_value || {};
                    const periodType = filters.periodType === 'months' ? 'months' : 'quarters';

                    const buildQuarterData = () => {
                        const labels = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'];
                        const keys = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'];
                        return keys.map((key, index) => {
                            const q = periodsValue.quarters?.[key] || {};
                            const plan = Number(q.plan ?? 0) || 0;
                            const actual = Number(q.actual ?? q.fact ?? 0) || 0;
                            const deviation = Number(q.deviation ?? q.difference ?? 0) || 0;
                            const percentage = Number(q.percentage ?? 0) || 0;
                            return { label: labels[index], plan, actual, deviation, percentage };
                        });
                    };

                    const buildMonthData = () => {
                        const labels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                        const keys = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
                        return keys.map((key, index) => {
                            const m = periodsValue.months?.[key] || {};
                            const plan = Number(m.plan ?? 0) || 0;
                            const actual = Number(m.actual ?? m.fact ?? 0) || 0;
                            const deviation = Number(m.deviation ?? m.difference ?? 0) || 0;
                            const percentage = Number(m.percentage ?? 0) || 0;
                            return { label: labels[index], plan, actual, deviation, percentage };
                        });
                    };

                    chartData = periodType === 'months' ? buildMonthData() : buildQuarterData();
                }

                const result = {
                    metrics: transformedMetrics,
                    periods: [], // Для FinanceDataTable periods не нужны
                    categoryName: details.category_name || 'Финансовые данные',
                    chartData, // Добавляем chartData для графиков
                    isFinanceData: true // Флаг для определения типа данных
                };
                dataCache.current.set(cacheKey, { data: result, timestamp: Date.now() });
                return result;
            }
            
            // Возвращаем результат с правильной структурой данных
            return result;
        } catch (error) {
            if (dev) console.error('[ReportDataProvider] loadFinanceDetails error:', error);
            return null;
        }
    };

    /**
     * Загрузка данных для слайда на основе его типа и фильтров
     */
    const loadSlideData = async (slideType, filters = {}, settings = {}) => {
        try {
            // Убеждаемся, что slideType - это строка
            const slideTypeStr = String(slideType || '');
            
            if (slideTypeStr.includes('analytics-chart') || slideTypeStr.includes('analytics-table')) {
                const analyticsData = await loadAnalyticsData(filters);
                
                // Если данные не загрузились, возвращаем пустой результат
                if (!analyticsData || !analyticsData.metrics) {
                    return { 
                        metrics: [],
                        chartData: []
                    };
                }
                
                return analyticsData;
            }

            if (slideTypeStr.includes('finance-chart') || slideTypeStr.includes('finance-table')) {
                // Для финансовых слайдов используем детальные метрики в формате DataTable
                const details = await loadFinanceDetails(filters);
                if (details && details.isFinanceData) {
                    // Возвращаем данные в формате, совместимом с DataTable
                    return details;
                }
                
                // Fallback на сводную аналитику
                const financeData = await loadFinanceData(filters);
                
                // Если данные не загрузились, возвращаем пустой результат
                if (!financeData || !financeData.chartData) {
                    // Сформируем хотя бы таблицу из план vs факт, если есть аналитика
                    const pva = generatePlanVsActualAnalysis(financeData);
                    const { tableData, tableColumns } = buildPlanVsActualTable(pva);
                    return { chartData: [], tableData, tableColumns };
                }
                
                // Попробуем добавить таблицу из plan vs actual
                const pva = generatePlanVsActualAnalysis(financeData);
                const { tableData, tableColumns } = buildPlanVsActualTable(pva);
                return { ...financeData, tableData, tableColumns };
            }

            if (slideTypeStr.includes('comparison')) {
                // Загружаем данные для сравнения (без подставных данных)
                const [analyticsData, financeData] = await Promise.all([
                    loadAnalyticsData(filters),
                    loadFinanceData(filters)
                ]);
                
                return {
                    analytics: analyticsData || null,
                    finance: financeData || null,
                    comparisonType: filters.comparisonType || 'period'
                };
            }

            if (slideTypeStr.includes('trends')) {
                // Отдаём данные в формате, ожидаемом TrendsChart/ BaseChart
                const analytics = await analyticsService.getAnalytics({
                    years: filters.years,
                    categories: filters.categories,
                    shops: filters.shops,
                    metrics: filters.metrics,
                    periodType: filters.periodType
                });
                return analytics;
            }

            if (slideTypeStr.includes('plan-vs-actual')) {
                // Загружаем данные для сравнения план vs факт
                if (dev) console.log('[ReportDataProvider] plan-vs-actual: загрузка данных');
                const data = await loadFinanceData(filters);
                if (dev) console.log('[ReportDataProvider] plan-vs-actual: данные получены');
                
                const result = {
                    ...data,
                    planVsActual: generatePlanVsActualAnalysis(data)
                };
                if (dev) console.log('[ReportDataProvider] plan-vs-actual: результат готов');
                return result;
            }
            
            return null;
        } catch (error) {
            if (dev) console.error('Error loading slide data:', error);
            showError('Ошибка загрузки данных слайда');
            return null;
        }
    };

    // Генерация трендов больше не требуется на клиенте (используется готовая аналитика)

    /**
     * Генерация анализа план vs факт
     */
    const generatePlanVsActualAnalysis = (data) => {
        if (dev) console.log('[ReportDataProvider] generatePlanVsActualAnalysis входные данные');
        
        if (!data || !data.analytics) {
            if (dev) console.log('[ReportDataProvider] generatePlanVsActualAnalysis: нет данных или analytics');
            return {};
        }

        // Используем данные из аналитики для создания план vs факт
        const analytics = data.analytics;
        if (dev) console.log('[ReportDataProvider] generatePlanVsActualAnalysis analytics готовы');
        
        // Создаем структуру данных для план vs факт
        const planVsActual = {
            categories: {},
            shops: {},
            metrics: {},
            summary: {
                totalPlan: 0,
                totalActual: 0,
                totalDeviation: 0,
                averagePercentage: 0
            }
        };

        // Используем данные из analytics.planVsActual, если они есть
        if (analytics.planVsActual) {
            const planVsActualData = analytics.planVsActual;
            
            // Копируем данные по категориям
            if (planVsActualData.categories) {
                Object.entries(planVsActualData.categories).forEach(([categoryName, categoryData]) => {
                    const plan = categoryData.plan || 0;
                    const actual = categoryData.actual || categoryData.fact || 0;
                    const deviation = categoryData.deviation || 0;
                    const percentage = categoryData.percentage || 0;

                    planVsActual.categories[categoryName] = {
                        plan,
                        actual,
                        deviation,
                        percentage
                    };

                    planVsActual.summary.totalPlan += plan;
                    planVsActual.summary.totalActual += actual;
                });
            }

            // Копируем данные по магазинам
            if (planVsActualData.shops) {
                Object.entries(planVsActualData.shops).forEach(([shopName, shopData]) => {
                    const plan = shopData.plan || 0;
                    const actual = shopData.actual || shopData.fact || 0;
                    const deviation = shopData.deviation || 0;
                    const percentage = shopData.percentage || 0;

                    planVsActual.shops[shopName] = {
                        plan,
                        actual,
                        deviation,
                        percentage
                    };
                });
            }

            // Копируем данные по метрикам
            if (planVsActualData.metrics) {
                Object.entries(planVsActualData.metrics).forEach(([metricName, metricData]) => {
                    const plan = metricData.plan || 0;
                    const actual = metricData.actual || metricData.fact || 0;
                    const deviation = metricData.deviation || 0;
                    const percentage = metricData.percentage || 0;

                    planVsActual.metrics[metricName] = {
                        plan,
                        actual,
                        deviation,
                        percentage
                    };
                });
            }
        }

        // Используем данные из backend
        planVsActual.summary.totalDeviation = analytics.planVsActualStats?.totalDeviation || 0;
        planVsActual.summary.averagePercentage = analytics.planVsActualStats?.totalPercentage || 0;

        if (dev) console.log('[ReportDataProvider] generatePlanVsActualAnalysis финальный результат готов');
        return planVsActual;
    };

    // Подготовка данных выполняется в компонентах графиков и utils

    /**
     * Очистка кэша данных
     */
    const clearCache = () => {
        dataCache.current.clear();
        setAnalyticsData(null);
        setFinanceData(null);
    };

    // Значение контекста с мемоизацией
    // Мемо-обертки для стабильности ссылок в контексте — чтобы потребители не перерендеривались от локальных фильтров
    const memoStats = useMemo(() => {
        // Простейшая проекция; оставляем место для расширения, но ссылка стабильна, пока не поменяются данные
        return financeData?.analytics || analyticsData || null;
    }, [analyticsData, financeData]);

    const contextValue = useMemo(() => ({
        // Данные (мемоизированные ссылки)
        analyticsData: memoStats,
        financeData,
        availableLists,
        
        // Состояние загрузки
        isLoadingAnalytics,
        isLoadingFinance,
        isLoading: isLoadingAnalytics || isLoadingFinance,
        
        // Методы загрузки (стабильные useCallback)
        loadAnalyticsData,
        loadFinanceData,
        loadSlideData,
        
        // Утилиты
        clearCache
    }), [
        memoStats,
        financeData,
        availableLists,
        isLoadingAnalytics,
        isLoadingFinance,
        loadAnalyticsData,
        loadFinanceData,
        loadSlideData,
        clearCache
    ]);

    return (
        <ReportDataContext.Provider value={contextValue}>
            {children}
        </ReportDataContext.Provider>
    );
};

/**
 * Хук для использования данных отчетов
 */
export const useReportData = () => {
    const context = useContext(ReportDataContext);
    
    if (!context) {
        throw new Error('useReportData must be used within ReportDataProvider');
    }
    
    return context;
};

export default ReportDataProvider;



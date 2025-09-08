import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNotifications } from '../../hooks';
import { useAnalyticsService } from '../../services/index.js';
import reportsService from '../../services/reportsService';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

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
    const lastFetchTime = useRef(new Map());
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

    // Загрузка подкатегорий по выбранной категории
    const loadSubcategories = useCallback(async (categoryId) => {
        if (!categoryId || categoryId === 'all') {
            setAvailableLists(prev => ({ ...prev, subcategories: [] }));
            return;
        }
        try {
            const token = localStorage.getItem('authToken');
            const headers = { 'Authorization': `Bearer ${token}` };
            const resp = await fetch(`/api/v1/finance/categories/${categoryId}/subcategories`, { headers });
            if (!resp.ok) return;
            const data = await resp.json();
            setAvailableLists(prev => ({ ...prev, subcategories: Array.isArray(data) ? data : (data?.items || []) }));
        } catch (e) {
            if (dev) console.warn('Не удалось загрузить подкатегории:', e);
        }
    }, []);

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
        const cacheKey = `analytics_${JSON.stringify(filters)}`;
        
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
                const data = await analyticsService.getAnalytics({
                    startDate: filters.startDate,
                    endDate: filters.endDate
                });
                
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
     * Детальные финансовые метрики для FinanceDetails-подобных графиков
     */
    const loadFinanceDetails = async (filters = {}) => {
        try {
            const categoryId = filters.category || filters.categoryId || (Array.isArray(filters.categories) ? filters.categories[0] : undefined);
            const shopId = filters.shop || filters.shopId || (Array.isArray(filters.shops) ? filters.shops[0] : undefined);
            const year = (filters.year || (Array.isArray(filters.years) ? filters.years[0] : undefined)) ?? new Date().getFullYear();

            if (!categoryId || !shopId) {
                return null;
            }

            // Используем тот же сервис, что и FinanceDetails
            const details = await analyticsService.getDetailedCategoryMetrics(categoryId, shopId, year);
            
            
            // Находим конкретную метрику по ID, если указана
            let metric = null;
            if (filters.metric && filters.metric !== 'all' && Array.isArray(details?.metrics)) {
                // Пробуем найти метрику по разным полям
                metric = details.metrics.find(m => 
                    m.id === filters.metric || 
                    m.value === filters.metric || 
                    m.metric_id === filters.metric ||
                    m.metricId === filters.metric
                );
            }
            
            // Если метрика не найдена или не указана, берем первую доступную
            if (!metric && Array.isArray(details?.metrics) && details.metrics.length > 0) {
                metric = details.metrics[0];
            }
            
            const periodsValue = metric?.periods_value || {};
            

            const periodType = filters.periodType === 'months' ? 'months' : 'quarters';

            const buildQuarterData = () => {
                const labels = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'];
                const keys = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'];
                return keys.map((key, index) => {
                    const q = periodsValue.quarters?.[key] || {};
                    const plan = Number(q.plan ?? 0) || 0;
                    const actual = Number(q.actual ?? q.fact ?? 0) || 0;
                    const deviation = Number(q.deviation ?? q.difference ?? (actual - plan)) || 0;
                    return { label: labels[index], plan, fact: actual, deviation, percentage: plan ? (actual / plan) * 100 : 0 };
                });
            };

            const buildMonthData = () => {
                const labels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                const keys = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
                return keys.map((key, index) => {
                    const m = periodsValue.months?.[key] || {};
                    const plan = Number(m.plan ?? 0) || 0;
                    const actual = Number(m.actual ?? m.fact ?? 0) || 0;
                    const deviation = Number(m.deviation ?? m.difference ?? (actual - plan)) || 0;
                    return { label: labels[index], plan, fact: actual, deviation, percentage: plan ? (actual / plan) * 100 : 0 };
                });
            };

            const chartData = periodType === 'months' ? buildMonthData() : buildQuarterData();

            // Подготовим структуры для таблицы
            const processedMetrics = Array.isArray(details?.metrics)
                ? details.metrics.map((m) => ({
                    id: m.metric_id ?? m.id,
                    name: m.metric_name ?? m.name,
                    unit: m.unit,
                    periods_value: m.periods_value || {}
                }))
                : [];

            // Сгенерируем периоды по выбранному году
            const yearInt = parseInt(year);
            const periods = [];
            if (!Number.isNaN(yearInt)) {
                periods.push({ id: `year-${yearInt}`, year: yearInt, quarter: null, month: null });
                for (let q = 1; q <= 4; q++) {
                    periods.push({ id: `quarter-${yearInt}-${q}`, year: yearInt, quarter: q, month: null });
                }
                for (let m = 1; m <= 12; m++) {
                    periods.push({ id: `month-${yearInt}-${m}`, year: yearInt, quarter: Math.ceil(m / 3), month: m });
                }
            }

            return { chartData, metrics: processedMetrics, periods };
        } catch (error) {
            if (dev) console.error('Error loading finance details:', error);
            showError('Ошибка загрузки финансовых метрик');
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
            
            if (slideTypeStr.includes('analytics')) {
                const analyticsData = await loadAnalyticsData(filters);
                
                // Если данные не загрузились, создаем тестовые данные
                if (!analyticsData || !analyticsData.metrics) {
                    const testChartData = [
                        { label: 'Январь', plan: 150000, fact: 145000, deviation: -5000, percentage: 96.7 },
                        { label: 'Февраль', plan: 180000, fact: 190000, deviation: 10000, percentage: 105.6 },
                        { label: 'Март', plan: 200000, fact: 195000, deviation: -5000, percentage: 97.5 },
                        { label: 'Апрель', plan: 220000, fact: 230000, deviation: 10000, percentage: 104.5 },
                        { label: 'Май', plan: 250000, fact: 245000, deviation: -5000, percentage: 98 },
                        { label: 'Июнь', plan: 280000, fact: 290000, deviation: 10000, percentage: 103.6 }
                    ];
                    
                    
                    return { 
                        metrics: testChartData,
                        chartData: testChartData
                    };
                }
                
                return analyticsData;
            } else if (slideTypeStr.includes('finance')) {
                // Для финансовых слайдов попробуем использовать детальные метрики,
                // если заданы год/категория/магазин; иначе fallback на сводную аналитику
                const details = await loadFinanceDetails(filters);
                if (details && details.chartData && details.chartData.length > 0) {
                    if (dev) console.log('[ReportDataProvider] using finance details for slide', { filters, detailsKeys: Object.keys(details) });
                    return details;
                }

                const financeData = await loadFinanceData(filters);
                if (dev) console.log('[ReportDataProvider] using finance summary for slide', { filters, hasChartData: !!financeData?.chartData, analyticsKeys: Object.keys(financeData?.analytics || {}) });

                // Сформируем минимальные metrics/periods для таблицы, если они отсутствуют
                const currentYear = (Array.isArray(filters.years) ? (filters.years[0]) : filters.year) || new Date().getFullYear();
                const yearInt = parseInt(currentYear);
                const periods = [];
                if (!Number.isNaN(yearInt)) {
                    periods.push({ id: `year-${yearInt}`, year: yearInt, quarter: null, month: null });
                    for (let q = 1; q <= 4; q++) periods.push({ id: `quarter-${yearInt}-${q}`, year: yearInt, quarter: q, month: null });
                    for (let m = 1; m <= 12; m++) periods.push({ id: `month-${yearInt}-${m}`, year: yearInt, quarter: Math.ceil(m/3), month: m });
                }

                // Если нет метрик — создадим пустой список, иначе попробуем привести к ожидаемому виду
                const metrics = Array.isArray(financeData?.analytics?.metrics)
                    ? financeData.analytics.metrics.map((m, idx) => ({
                        id: m.id ?? m.metric_id ?? (idx + 1),
                        name: m.name ?? m.metric_name ?? `Метрика ${idx + 1}`,
                        unit: m.unit ?? '₽',
                        periods_value: m.periods_value ?? {}
                    }))
                    : [];

                // Если нет chartData — подставим заглушку
                const chartData = Array.isArray(financeData?.chartData) && financeData.chartData.length
                    ? financeData.chartData
                    : [
                        { label: 'I квартал', plan: 0, fact: 0, deviation: 0, percentage: 0 },
                        { label: 'II квартал', plan: 0, fact: 0, deviation: 0, percentage: 0 },
                        { label: 'III квартал', plan: 0, fact: 0, deviation: 0, percentage: 0 },
                        { label: 'IV квартал', plan: 0, fact: 0, deviation: 0, percentage: 0 }
                    ];

                const result = { chartData, metrics, periods };
                if (dev) console.log('[ReportDataProvider] prepared finance fallback result', { metricsLen: metrics.length, periodsLen: periods.length });
                return result;
            } else if (slideTypeStr.includes('comparison')) {
                // Загружаем данные для сравнения
                const [analyticsData, financeData] = await Promise.all([
                    loadAnalyticsData(filters),
                    loadFinanceData(filters)
                ]);
                
                // Создаем данные в формате, ожидаемом AnalyticsComparison
                const comparisonData = {
                    yearly: {
                        [new Date().getFullYear()]: {
                            plan: 1000000,
                            actual: 950000,
                            deviation: -50000,
                            percentage: 95
                        },
                        [new Date().getFullYear() - 1]: {
                            plan: 900000,
                            actual: 850000,
                            deviation: -50000,
                            percentage: 94.4
                        }
                    },
                    categories: {
                        'Электроника': {
                            plan: 300000,
                            actual: 280000,
                            deviation: -20000,
                            percentage: 93.3
                        },
                        'Одежда': {
                            plan: 200000,
                            actual: 190000,
                            deviation: -10000,
                            percentage: 95
                        },
                        'Продукты': {
                            plan: 150000,
                            actual: 160000,
                            deviation: 10000,
                            percentage: 106.7
                        }
                    },
                    shops: {
                        'Центральный': {
                            plan: 400000,
                            actual: 380000,
                            deviation: -20000,
                            percentage: 95
                        },
                        'Северный': {
                            plan: 300000,
                            actual: 290000,
                            deviation: -10000,
                            percentage: 96.7
                        },
                        'Южный': {
                            plan: 200000,
                            actual: 210000,
                            deviation: 10000,
                            percentage: 105
                        }
                    }
                };
                
                return {
                    analytics: {
                        ...financeData?.analytics,
                        comparison: comparisonData
                    },
                    finance: financeData,
                    comparisonType: filters.comparisonType || 'period'
                };
            } else if (slideTypeStr.includes('trends')) {
                // Загружаем данные для анализа трендов
                const data = await loadFinanceData(filters);
                return {
                    ...data,
                    trends: generateTrendsAnalysis(data)
                };
            } else if (slideTypeStr.includes('plan-vs-actual')) {
                // Загружаем данные для сравнения план vs факт
                const data = await loadFinanceData(filters);
                return {
                    ...data,
                    planVsActual: generatePlanVsActualAnalysis(data)
                };
            }
            
            return null;
        } catch (error) {
            if (dev) console.error('Error loading slide data:', error);
            showError('Ошибка загрузки данных слайда');
            return null;
        }
    };

    /**
     * Генерация анализа трендов
     */
    const generateTrendsAnalysis = (data) => {
        if (!data || !data.transactions) return {};

        const transactions = data.transactions;
        
        // Группируем транзакции по месяцам
        const monthlyData = {};
        transactions.forEach(transaction => {
            const date = new Date(transaction.created_at || transaction.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    income: 0,
                    expense: 0,
                    count: 0
                };
            }
            
            if (transaction.amount > 0) {
                monthlyData[monthKey].income += transaction.amount;
            } else {
                monthlyData[monthKey].expense += Math.abs(transaction.amount);
            }
            monthlyData[monthKey].count += 1;
        });

        // Преобразуем в массив для графиков
        const trends = Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                label: month,
                income: data.income,
                expense: data.expense,
                profit: data.income - data.expense,
                transactions: data.count
            }));

        return {
            monthly: trends,
            summary: {
                totalIncome: trends.reduce((sum, item) => sum + item.income, 0),
                totalExpense: trends.reduce((sum, item) => sum + item.expense, 0),
                averageProfit: trends.reduce((sum, item) => sum + item.profit, 0) / trends.length || 0
            }
        };
    };

    /**
     * Генерация анализа план vs факт
     */
    const generatePlanVsActualAnalysis = (data) => {
        if (!data || !data.analytics) return {};

        // Пока используем заглушку, в реальной реализации здесь будут плановые данные
        const mockPlanData = [
            { period: 'Q1 2024', plan: 1000000, actual: data.summary?.totalIncome || 950000 },
            { period: 'Q2 2024', plan: 1200000, actual: data.summary?.totalIncome || 1150000 },
            { period: 'Q3 2024', plan: 1100000, actual: data.summary?.totalIncome || 1080000 },
            { period: 'Q4 2024', plan: 1300000, actual: data.summary?.totalIncome || 1250000 }
        ];

        const analysis = mockPlanData.map(item => ({
            ...item,
            deviation: item.actual - item.plan,
            percentage: ((item.actual / item.plan) * 100).toFixed(1),
            status: item.actual >= item.plan ? 'success' : 'warning'
        }));

        return {
            quarters: analysis,
            summary: {
                totalPlan: analysis.reduce((sum, item) => sum + item.plan, 0),
                totalActual: analysis.reduce((sum, item) => sum + item.actual, 0),
                averagePerformance: analysis.reduce((sum, item) => sum + parseFloat(item.percentage), 0) / analysis.length
            }
        };
    };

    /**
     * Преобразование данных для использования в графиках
     */
    const transformDataForChart = (rawData, slideType, selectedMetrics = []) => {
        if (!rawData) {
            return [];
        }


        let result = [];
        
        switch (slideType) {
            case 'analytics-chart':
            case 'analytics-table':
                result = transformAnalyticsData(rawData, selectedMetrics);
                break;
                
            case 'finance-chart':
            case 'finance-table':
                result = transformFinanceData(rawData, selectedMetrics);
                break;
                
            case 'comparison':
                result = transformComparisonData(rawData, selectedMetrics);
                break;
                
            case 'trends':
                result = transformTrendsData(rawData, selectedMetrics);
                break;
                
            case 'plan-vs-actual':
                result = transformPlanVsActualData(rawData, selectedMetrics);
                break;
                
            default:
                result = [];
        }
        
        
        return result;
    };

    const transformAnalyticsData = (data, metrics) => {
        if (!data.metrics) return [];
        
        return data.metrics.map(item => ({
            label: item.period || item.name,
            value: item.value || 0,
            metric: item.metric || '',
            ...item
        }));
    };

    /**
     * Фильтрация данных по выбранным метрикам
     */
    const filterDataByMetrics = (data, metrics) => {
        if (!Array.isArray(data) || !metrics || metrics.length === 0) {
            return data;
        }
        
        return data.map(item => {
            const filteredItem = {
                label: item.label,
                type: item.type
            };
            
            // Добавляем только выбранные метрики
            if (metrics.includes('plan') && item.plan !== undefined) {
                filteredItem.plan = item.plan;
            }
            if ((metrics.includes('fact') || metrics.includes('actual')) && item.fact !== undefined) {
                filteredItem.fact = item.fact;
            }
            if (metrics.includes('deviation') && item.deviation !== undefined) {
                filteredItem.deviation = item.deviation;
            }
            if (metrics.includes('percentage') && item.percentage !== undefined) {
                filteredItem.percentage = item.percentage;
            }
            
            // Сохраняем другие свойства (например, isForecast)
            Object.keys(item).forEach(key => {
                if (!['plan', 'fact', 'deviation', 'percentage', 'label', 'type'].includes(key)) {
                    filteredItem[key] = item[key];
                }
            });
            
            return filteredItem;
        });
    };

    const transformFinanceData = (data, metrics) => {
        
        // Если данные уже в правильном формате (из loadFinanceDetails)
        if (data.chartData && Array.isArray(data.chartData)) {
            // Фильтруем существующие данные по выбранным метрикам
            return filterDataByMetrics(data.chartData, metrics);
        }
        
        // Данные по метрикам (подкатегориям) или общие расходы
        if (data.metrics && Array.isArray(data.metrics) && data.metrics.length > 0) {
            const transformed = data.metrics.map(metric => {
                const item = {
                    label: metric.name || metric.metric_name || 'Без названия',
                    type: 'expense' // Пока только расходы
                };
                
                // Добавляем только выбранные метрики
                if (metrics.includes('plan')) {
                    item.plan = Math.abs(metric.plan_value || metric.plan || 0);
                }
                if (metrics.includes('fact') || metrics.includes('actual')) {
                    item.fact = Math.abs(metric.fact_value || metric.fact || metric.actual || 0);
                }
                if (metrics.includes('deviation')) {
                    item.deviation = metric.deviation || (metric.fact_value || metric.fact || metric.actual || 0) - (metric.plan_value || metric.plan || 0);
                }
                if (metrics.includes('percentage')) {
                    item.percentage = metric.plan_value || metric.plan ? 
                        ((metric.fact_value || metric.fact || metric.actual || 0) / (metric.plan_value || metric.plan)) * 100 : 0;
                }
                
                return item;
            });
            
            return transformed;
        }
        
        // Если нет детальных метрик - показываем общие данные
        const fallback = {
            label: 'Общие расходы', 
            type: 'expense'
        };
        
        // Добавляем только выбранные метрики
        if (metrics.includes('plan')) {
            fallback.plan = Math.abs(data.summary?.plan || data.summary?.totalPlan || 0);
        }
        if (metrics.includes('fact') || metrics.includes('actual')) {
            fallback.fact = Math.abs(data.summary?.totalExpense || data.summary?.totalFact || 0);
        }
        if (metrics.includes('deviation')) {
            fallback.deviation = data.summary?.deviation || 0;
        }
        if (metrics.includes('percentage')) {
            fallback.percentage = data.summary?.plan || data.summary?.totalPlan ? 
                ((data.summary?.totalExpense || data.summary?.totalFact || 0) / (data.summary?.plan || data.summary?.totalPlan)) * 100 : 0;
        }
        
        return [fallback];
    };

    const transformComparisonData = (data, metrics) => {
        if (!data.analytics && !data.finance) return [];
        
        // Если у нас есть данные comparison, используем их
        if (data.analytics?.comparison) {
            const comparisonData = data.analytics.comparison;
            const result = [];
            
            // Преобразуем данные по годам
            if (comparisonData.yearly) {
                Object.entries(comparisonData.yearly).forEach(([year, yearData]) => {
                    const item = {
                        label: year,
                        type: 'comparison'
                    };
                    
                    if (yearData.plan !== undefined) item.plan = yearData.plan;
                    if (yearData.actual !== undefined) item.fact = yearData.actual;
                    if (yearData.deviation !== undefined) item.deviation = yearData.deviation;
                    if (yearData.percentage !== undefined) item.percentage = yearData.percentage;
                    
                    result.push(item);
                });
            }
            
            // Преобразуем данные по категориям
            if (comparisonData.categories) {
                Object.entries(comparisonData.categories).forEach(([category, categoryData]) => {
                    const item = {
                        label: category,
                        type: 'comparison'
                    };
                    
                    if (categoryData.plan !== undefined) item.plan = categoryData.plan;
                    if (categoryData.actual !== undefined) item.fact = categoryData.actual;
                    if (categoryData.deviation !== undefined) item.deviation = categoryData.deviation;
                    if (categoryData.percentage !== undefined) item.percentage = categoryData.percentage;
                    
                    result.push(item);
                });
            }
            
            // Преобразуем данные по магазинам
            if (comparisonData.shops) {
                Object.entries(comparisonData.shops).forEach(([shop, shopData]) => {
                    const item = {
                        label: shop,
                        type: 'comparison'
                    };
                    
                    if (shopData.plan !== undefined) item.plan = shopData.plan;
                    if (shopData.actual !== undefined) item.fact = shopData.actual;
                    if (shopData.deviation !== undefined) item.deviation = shopData.deviation;
                    if (shopData.percentage !== undefined) item.percentage = shopData.percentage;
                    
                    result.push(item);
                });
            }
            
            
            return result;
        }
        
        // Fallback на старую логику
        const currentAnalytics = data.analytics?.summary?.value || 0;
        const currentFinance = data.finance?.summary?.totalIncome || 0;
        const previousAnalytics = currentAnalytics * 0.9;
        const previousFinance = currentFinance * 0.95;
        
        const result = [];
        
        // Добавляем данные в зависимости от выбранных метрик
        if (metrics.includes('plan')) {
            result.push({
                label: 'Текущий период',
                plan: currentFinance,
                type: 'comparison'
            });
            result.push({
                label: 'Предыдущий период', 
                plan: previousFinance,
                type: 'comparison'
            });
        }
        
        if (metrics.includes('fact') || metrics.includes('actual')) {
            if (result.length === 0) {
                result.push({
                    label: 'Текущий период',
                    fact: currentAnalytics,
                    type: 'comparison'
                });
                result.push({
                    label: 'Предыдущий период',
                    fact: previousAnalytics,
                    type: 'comparison'
                });
            } else {
                result[0].fact = currentAnalytics;
                result[1].fact = previousAnalytics;
            }
        }
        
        if (metrics.includes('deviation')) {
            const currentDeviation = currentAnalytics - currentFinance;
            const previousDeviation = previousAnalytics - previousFinance;
            
            if (result.length === 0) {
                result.push({
                    label: 'Текущий период',
                    deviation: currentDeviation,
                    type: 'comparison'
                });
                result.push({
                    label: 'Предыдущий период',
                    deviation: previousDeviation,
                    type: 'comparison'
                });
            } else {
                result[0].deviation = currentDeviation;
                result[1].deviation = previousDeviation;
            }
        }
        
        if (metrics.includes('percentage')) {
            const currentPercentage = currentFinance ? (currentAnalytics / currentFinance) * 100 : 0;
            const previousPercentage = previousFinance ? (previousAnalytics / previousFinance) * 100 : 0;
            
            if (result.length === 0) {
                result.push({
                    label: 'Текущий период',
                    percentage: currentPercentage,
                    type: 'comparison'
                });
                result.push({
                    label: 'Предыдущий период',
                    percentage: previousPercentage,
                    type: 'comparison'
                });
            } else {
                result[0].percentage = currentPercentage;
                result[1].percentage = previousPercentage;
            }
        }
        
        // Если нет выбранных метрик, показываем план и факт по умолчанию
        if (result.length === 0) {
            result.push({
                label: 'Текущий период',
                plan: currentFinance,
                fact: currentAnalytics,
                type: 'comparison'
            });
            result.push({
                label: 'Предыдущий период',
                plan: previousFinance,
                fact: previousAnalytics,
                type: 'comparison'
            });
        }
        
        
        return result;
    };

    const transformTrendsData = (data, metrics) => {
        if (!data.trends || !data.trends.monthly) return [];
        
        return data.trends.monthly;
    };

    const transformPlanVsActualData = (data, metrics) => {
        if (!data.planVsActual || !data.planVsActual.quarters) return [];
        
        return data.planVsActual.quarters;
    };

    /**
     * Очистка кэша данных
     */
    const clearCache = () => {
        dataCache.current.clear();
        setAnalyticsData(null);
        setFinanceData(null);
    };

    // Значение контекста с мемоизацией
    const contextValue = useMemo(() => ({
        // Данные
        analyticsData,
        financeData,
        availableLists,
        
        // Состояние загрузки
        isLoadingAnalytics,
        isLoadingFinance,
        isLoading: isLoadingAnalytics || isLoadingFinance,
        
        // Методы загрузки
        loadAnalyticsData,
        loadFinanceData,
        loadSlideData,
        
        // Преобразование данных
        transformDataForChart,
        
        // Утилиты
        clearCache
    }), [
        analyticsData,
        financeData,
        availableLists,
        isLoadingAnalytics,
        isLoadingFinance,
        loadAnalyticsData,
        loadFinanceData,
        transformDataForChart
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

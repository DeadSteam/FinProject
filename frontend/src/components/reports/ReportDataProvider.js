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
     * Преобразует название месяца в ключ для periods_value
     */
    const getMonthKey = (monthName) => {
        const monthMap = {
            'Январь': 'январь',
            'Февраль': 'февраль',
            'Март': 'март',
            'Апрель': 'апрель',
            'Май': 'май',
            'Июнь': 'июнь',
            'Июль': 'июль',
            'Август': 'август',
            'Сентябрь': 'сентябрь',
            'Октябрь': 'октябрь',
            'Ноябрь': 'ноябрь',
            'Декабрь': 'декабрь',
            'Янв': 'январь',
            'Фев': 'февраль',
            'Мар': 'март',
            'Апр': 'апрель',
            'Июн': 'июнь',
            'Июл': 'июль',
            'Авг': 'август',
            'Сен': 'сентябрь',
            'Окт': 'октябрь',
            'Ноя': 'ноябрь',
            'Дек': 'декабрь'
        };

        return monthMap[monthName] || monthName.toLowerCase();
    };

    /**
     * Детальные финансовые метрики для FinanceDetails-подобных графиков
     */
    const loadFinanceDetails = async (filters = {}) => {
        try {
            const categoryId = filters.category || filters.categoryId || (Array.isArray(filters.categories) ? filters.categories[0] : undefined);
            const shopId = filters.shop || filters.shopId || (Array.isArray(filters.shops) ? filters.shops[0] : undefined);
            const year = (filters.year || (Array.isArray(filters.years) ? filters.years[0] : undefined)) ?? new Date().getFullYear();

            if (dev) console.log('[ReportDataProvider] loadFinanceDetails filters:', { categoryId, shopId, year });

            if (!categoryId || !shopId) {
                if (dev) console.log('[ReportDataProvider] loadFinanceDetails: missing categoryId or shopId');
                return null;
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
                            const deviation = Number(q.deviation ?? q.difference ?? (actual - plan)) || 0;
                            return { label: labels[index], plan, actual, deviation, percentage: plan ? (actual / plan) * 100 : 0 };
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
                            return { label: labels[index], plan, actual, deviation, percentage: plan ? (actual / plan) * 100 : 0 };
                        });
                    };

                    chartData = periodType === 'months' ? buildMonthData() : buildQuarterData();
                }

                return {
                    metrics: transformedMetrics,
                    periods: [], // Для FinanceDataTable periods не нужны
                    categoryName: details.category_name || 'Финансовые данные',
                    chartData, // Добавляем chartData для графиков
                    isFinanceData: true // Флаг для определения типа данных
                };
            }
            
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
                    return { label: labels[index], plan, actual, deviation, percentage: plan ? (actual / plan) * 100 : 0 };
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
                    return { label: labels[index], plan, actual, deviation, percentage: plan ? (actual / plan) * 100 : 0 };
                });
            };

            const chartData = periodType === 'months' ? buildMonthData() : buildQuarterData();

            // Если есть метрика, возвращаем её в формате DataTable
            if (metric) {
                return {
                    metrics: [metric],
                    periods: [],
                    categoryName: details.categoryName || 'Финансовые данные',
                    chartData,
                    isFinanceData: true
                };
            }

            // Если нет детальных метрик, но есть данные, создаем фиктивную метрику
            if (chartData && chartData.length > 0) {
                const fallbackMetric = {
                    id: 1,
                    name: 'Финансовые показатели',
                    unit: 'руб.',
                    periods_value: {
                        quarters: {},
                        months: {}
                    }
                };

                // Заполняем periods_value из chartData
                chartData.forEach((item, index) => {
                    const isQuarter = item.label.includes('квартал');
                    if (isQuarter) {
                        fallbackMetric.periods_value.quarters[item.label] = {
                            plan: item.plan || 0,
                            actual: item.actual || 0,
                            deviation: item.deviation || 0,
                            procent: item.percentage || 0
                        };
                    } else {
                        const monthKey = getMonthKey(item.label);
                        fallbackMetric.periods_value.months[monthKey] = {
                            plan: item.plan || 0,
                            actual: item.actual || 0,
                            deviation: item.deviation || 0,
                            procent: item.percentage || 0
                        };
                    }
                });

                return {
                    metrics: [fallbackMetric],
                    periods: [],
                    categoryName: details.categoryName || 'Финансовые данные',
                    chartData,
                    isFinanceData: true
                };
            }

            if (dev) console.log('[ReportDataProvider] loadFinanceDetails: no data found');
            return { chartData: [] };
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
                
                // Если данные не загрузились, возвращаем пустой результат
                if (!analyticsData || !analyticsData.metrics) {
                    return { 
                        metrics: [],
                        chartData: []
                    };
                }
                
                return analyticsData;
            } else if (slideTypeStr.includes('finance')) {
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
                console.log('[ReportDataProvider] Загружаем данные для plan-vs-actual, filters:', filters);
                const data = await loadFinanceData(filters);
                console.log('[ReportDataProvider] Данные loadFinanceData:', data);
                
                const result = {
                    ...data,
                    planVsActual: generatePlanVsActualAnalysis(data)
                };
                console.log('[ReportDataProvider] Результат для plan-vs-actual:', result);
                return result;
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
        console.log('[ReportDataProvider] generatePlanVsActualAnalysis входные данные:', data);
        
        if (!data || !data.analytics) {
            console.log('[ReportDataProvider] generatePlanVsActualAnalysis: нет данных или analytics');
            return {};
        }

        // Используем данные из аналитики для создания план vs факт
        const analytics = data.analytics;
        console.log('[ReportDataProvider] generatePlanVsActualAnalysis analytics:', analytics);
        console.log('[ReportDataProvider] generatePlanVsActualAnalysis analytics.planVsActual:', analytics.planVsActual);
        
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
                    const deviation = actual - plan;
                    const percentage = plan > 0 ? (actual / plan) * 100 : 0;

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
                    const deviation = actual - plan;
                    const percentage = plan > 0 ? (actual / plan) * 100 : 0;

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
                    const deviation = actual - plan;
                    const percentage = plan > 0 ? (actual / plan) * 100 : 0;

                    planVsActual.metrics[metricName] = {
                        plan,
                        actual,
                        deviation,
                        percentage
                    };
                });
            }
        }

        // Рассчитываем общие показатели
        planVsActual.summary.totalDeviation = planVsActual.summary.totalActual - planVsActual.summary.totalPlan;
        planVsActual.summary.averagePercentage = planVsActual.summary.totalPlan > 0 ? 
            (planVsActual.summary.totalActual / planVsActual.summary.totalPlan) * 100 : 0;

        console.log('[ReportDataProvider] generatePlanVsActualAnalysis финальный результат:', planVsActual);
        return planVsActual;
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
            if (metrics.includes('actual') && (item.actual !== undefined || item.fact !== undefined)) {
                filteredItem.actual = item.actual || item.fact;
            }
            if (metrics.includes('deviation') && item.deviation !== undefined) {
                filteredItem.deviation = item.deviation;
            }
            if (metrics.includes('percentage') && item.percentage !== undefined) {
                filteredItem.percentage = item.percentage;
            }
            
            // Сохраняем другие свойства (например, isForecast)
            Object.keys(item).forEach(key => {
                if (!['plan', 'actual', 'fact', 'deviation', 'percentage', 'label', 'type'].includes(key)) {
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
                if (metrics.includes('actual')) {
                    item.actual = Math.abs(metric.actual || metric.fact_value || metric.fact || 0);
                }
                if (metrics.includes('deviation')) {
                    item.deviation = metric.deviation || (metric.actual || metric.fact_value || metric.fact || 0) - (metric.plan_value || metric.plan || 0);
                }
                if (metrics.includes('percentage')) {
                    item.percentage = metric.plan_value || metric.plan ? 
                        ((metric.actual || metric.fact_value || metric.fact || 0) / (metric.plan_value || metric.plan)) * 100 : 0;
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
        if (metrics.includes('actual')) {
            fallback.actual = Math.abs(data.summary?.totalExpense || data.summary?.totalFact || 0);
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
        
        if (metrics.includes('actual')) {
            if (result.length === 0) {
                result.push({
                    label: 'Текущий период',
                    actual: currentAnalytics,
                    type: 'comparison'
                });
                result.push({
                    label: 'Предыдущий период',
                    actual: previousAnalytics,
                    type: 'comparison'
                });
            } else {
                result[0].actual = currentAnalytics;
                result[1].actual = previousAnalytics;
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

    // Строим универсальную таблицу для план vs факт
    const buildPlanVsActualTable = (planVsActual) => {
        try {
            const cols = [
                { key: 'period', header: 'Период', sticky: true, align: 'left', width: '220px' },
                { key: 'plan', header: 'План', align: 'right', width: '120px' },
                { key: 'actual', header: 'Факт', align: 'right', width: '120px' },
                { key: 'deviation', header: 'Отклонение', align: 'right', width: '120px' },
                { key: 'percentage', header: '% выполнения', align: 'right', width: '120px' }
            ];

            const rows = [];

            // Приоритет: категории → магазины → метрики
            const source = planVsActual?.categories && Object.keys(planVsActual.categories).length
                ? planVsActual.categories
                : planVsActual?.shops && Object.keys(planVsActual.shops).length
                ? planVsActual.shops
                : planVsActual?.metrics || {};

            Object.entries(source).forEach(([label, item]) => {
                rows.push({
                    period: label,
                    plan: item.plan ?? 0,
                    actual: item.actual ?? item.fact ?? 0,
                    deviation: item.deviation ?? ((item.actual ?? item.fact ?? 0) - (item.plan ?? 0)),
                    percentage: item.percentage ?? ((item.plan ?? 0) ? (((item.actual ?? item.fact ?? 0) / (item.plan ?? 0)) * 100) : 0)
                });
            });

            return { tableData: rows, tableColumns: cols };
        } catch (e) {
            return { tableData: [], tableColumns: [] };
        }
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
        
        // Преобразование данных
        transformDataForChart,
        
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
        transformDataForChart,
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



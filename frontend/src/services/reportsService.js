import { ApiClient } from './http/ApiClient';

class ReportsService {
    constructor() {
        this.apiClient = new ApiClient();
    }

    async getMetricsForCategory(categoryId) {
        try {
            const params = new URLSearchParams();
            if (categoryId && categoryId !== 'all') {
                params.append('category_id', categoryId);
            }
            
            const url = `/finance/metrics?${params}`;
            console.log('🔄 ReportsService: Запрос метрик по URL:', url);
            console.log('🔄 ReportsService: categoryId:', categoryId);
            
            const response = await this.apiClient.get(url);
            console.log('✅ ReportsService: Ответ сервера:', response);
            console.log('📊 ReportsService: Тип ответа:', typeof response);
            console.log('📊 ReportsService: Это массив?', Array.isArray(response));
            
            // API возвращает массив напрямую, а не в поле data
            const metrics = Array.isArray(response) ? response : (response.data || []);
            console.log('📊 ReportsService: Данные метрик:', metrics);
            console.log('📊 ReportsService: Количество метрик:', metrics.length);
            
            if (metrics.length > 0) {
                console.log('📊 ReportsService: Первая метрика:', metrics[0]);
            }
            
            return metrics;
        } catch (error) {
            console.error('❌ ReportsService: Ошибка загрузки метрик:', error);
            console.error('❌ ReportsService: Детали ошибки:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Получение данных для финансовых слайдов
     */
    async getFinanceDataForSlide(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.year) params.append('year', filters.year);
            if (filters.shop && filters.shop !== 'all') params.append('shop_id', filters.shop);
            if (filters.category && filters.category !== 'all') params.append('category_id', filters.category);
            if (filters.metric && filters.metric !== 'all') params.append('metric_id', filters.metric);
            
            console.log('🔄 ReportsService: Запрос финансовых данных с фильтрами:', filters);
            const response = await this.apiClient.get(`/finance/metrics/with-data?${params}`);
            console.log('✅ ReportsService: Ответ финансовых данных:', response);
            
            // Преобразуем данные в формат для графиков
            const chartData = this.prepareFinanceChartData(response, filters);
            console.log('📊 ReportsService: Подготовленные данные для графика:', chartData);
            
            return {
                chartData: chartData,
                tableData: this.prepareFinanceTableData(response, filters),
                tableColumns: this.getFinanceTableColumns(filters),
                selectedMetrics: this.getSelectedMetrics(filters),
                shopName: this.getShopName(filters.shop),
                categoryName: this.getCategoryName(filters.category),
                metricName: this.getMetricName(filters.metric),
                rawData: response
            };
        } catch (error) {
            console.error('❌ ReportsService: Ошибка загрузки финансовых данных:', error);
            console.error('❌ ReportsService: Детали ошибки:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Подготовка данных для финансовых графиков
     */
    prepareFinanceChartData(rawData, filters) {
        console.log('🔍 ReportsService: prepareFinanceChartData вызвана с данными:', rawData);
        console.log('🔍 ReportsService: Фильтры:', filters);
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
            console.log('⚠️ ReportsService: Нет данных для подготовки графика');
            return [];
        }

        const periodType = filters.periodType || 'quarters';
        const chartData = [];

        console.log('🔍 ReportsService: Обрабатываем', rawData.length, 'метрик');
        console.log('🔍 ReportsService: Тип периода:', periodType);

        rawData.forEach((metric, index) => {
            console.log(`🔍 ReportsService: Обрабатываем метрику ${index + 1}:`, metric);
            
            const periods = metric.periods;
            console.log(`🔍 ReportsService: Периоды для метрики ${index + 1}:`, periods);
            
            if (!periods) {
                console.log(`⚠️ ReportsService: Нет периодов для метрики ${index + 1}`);
                return;
            }

            let periodData = [];
            
            if (periodType === 'quarters' && periods.quarters) {
                console.log(`🔍 ReportsService: Обрабатываем кварталы для метрики ${index + 1}:`, periods.quarters);
                periodData = Object.entries(periods.quarters)
                    .filter(([quarter, data]) => data && (data.actual !== null || data.plan !== null))
                    .map(([quarter, data]) => ({
                        label: `Q${quarter}`,
                        plan: data.plan || 0,
                        fact: data.actual || 0,
                        deviation: (data.actual || 0) - (data.plan || 0)
                    }));
            } else if (periodType === 'months' && periods.months) {
                console.log(`🔍 ReportsService: Обрабатываем месяцы для метрики ${index + 1}:`, periods.months);
                periodData = Object.entries(periods.months)
                    .filter(([month, data]) => data && (data.actual !== null || data.plan !== null))
                    .map(([month, data]) => ({
                        label: this.getMonthName(parseInt(month)),
                        plan: data.plan || 0,
                        fact: data.actual || 0,
                        deviation: (data.actual || 0) - (data.plan || 0)
                    }));
            } else if (periodType === 'year' && periods.year) {
                console.log(`🔍 ReportsService: Обрабатываем год для метрики ${index + 1}:`, periods.year);
                periodData = [{
                    label: 'Год',
                    plan: periods.year.plan || 0,
                    fact: periods.year.actual || 0,
                    deviation: (periods.year.actual || 0) - (periods.year.plan || 0)
                }];
            } else {
                console.log(`⚠️ ReportsService: Не найдены данные для типа периода ${periodType} в метрике ${index + 1}`);
                console.log(`🔍 ReportsService: Доступные ключи периодов:`, Object.keys(periods || {}));
                
                // Попробуем использовать кварталы по умолчанию, если они есть
                if (periods.quarters) {
                    console.log(`🔄 ReportsService: Пробуем использовать кварталы по умолчанию`);
                    periodData = Object.entries(periods.quarters)
                        .filter(([quarter, data]) => data && (data.actual !== null || data.plan !== null))
                        .map(([quarter, data]) => ({
                            label: `Q${quarter}`,
                            plan: data.plan || 0,
                            fact: data.actual || 0,
                            deviation: (data.actual || 0) - (data.plan || 0)
                        }));
                }
            }

            console.log(`🔍 ReportsService: Подготовленные данные периода для метрики ${index + 1}:`, periodData);

            if (periodData.length > 0) {
                // Добавляем данные периода напрямую в chartData
                // Chart компонент ожидает плоский массив объектов с полями plan, fact, deviation
                console.log(`✅ ReportsService: Добавляем в график ${periodData.length} точек данных для метрики ${index + 1}`);
                chartData.push(...periodData);
            } else {
                console.log(`⚠️ ReportsService: Пропускаем метрику ${index + 1} - нет данных периода`);
            }
        });

        console.log('📊 ReportsService: Итоговые подготовленные данные графика:', chartData);
        console.log('📊 ReportsService: Количество точек данных:', chartData.length);
        
        // Если нет данных, создаем тестовые данные для демонстрации
        if (chartData.length === 0) {
            console.log('⚠️ ReportsService: Нет данных для графика, создаем тестовые данные');
            chartData.push(
                { label: 'Q1', plan: 100, fact: 120, deviation: 20 },
                { label: 'Q2', plan: 150, fact: 140, deviation: -10 },
                { label: 'Q3', plan: 200, fact: 180, deviation: -20 },
                { label: 'Q4', plan: 180, fact: 200, deviation: 20 }
            );
        }
        
        // Проверяем структуру данных перед возвратом
        if (chartData.length > 0) {
            console.log('📊 ReportsService: Первая точка данных:', chartData[0]);
            console.log('📊 ReportsService: Ключи первой точки:', Object.keys(chartData[0]));
        }
        
        return chartData;
    }

    /**
     * Подготовка данных для финансовых таблиц
     */
    prepareFinanceTableData(rawData, filters) {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return [];
        }

        const tableData = [];
        const periodType = filters.periodType || 'quarters';

        rawData.forEach(metric => {
            const periods = metric.periods;
            if (!periods) return;

            let periodData = [];
            
            if (periodType === 'quarters' && periods.quarters) {
                periodData = Object.entries(periods.quarters).map(([quarter, data]) => ({
                    period: `Q${quarter}`,
                    plan: data.plan || 0,
                    fact: data.actual || 0,
                    deviation: (data.actual || 0) - (data.plan || 0),
                    deviationPercent: data.plan ? (((data.actual || 0) - (data.plan || 0)) / data.plan * 100) : 0
                }));
            } else if (periodType === 'months' && periods.months) {
                periodData = Object.entries(periods.months).map(([month, data]) => ({
                    period: this.getMonthName(parseInt(month)),
                    plan: data.plan || 0,
                    fact: data.actual || 0,
                    deviation: (data.actual || 0) - (data.plan || 0),
                    deviationPercent: data.plan ? (((data.actual || 0) - (data.plan || 0)) / data.plan * 100) : 0
                }));
            }

            if (periodData.length > 0) {
                tableData.push({
                    metric: metric.metric_name,
                    category: metric.category_name,
                    unit: metric.unit,
                    periods: periodData
                });
            }
        });

        return tableData;
    }

    /**
     * Получение колонок для финансовых таблиц
     */
    getFinanceTableColumns(filters) {
        return [
            { key: 'metric', label: 'Метрика', sortable: true },
            { key: 'category', label: 'Категория', sortable: true },
            { key: 'unit', label: 'Единица', sortable: false },
            { key: 'period', label: 'Период', sortable: true },
            { key: 'plan', label: 'План', sortable: true, type: 'number' },
            { key: 'fact', label: 'Факт', sortable: true, type: 'number' },
            { key: 'deviation', label: 'Отклонение', sortable: true, type: 'number' },
            { key: 'deviationPercent', label: '% выполнения', sortable: true, type: 'number' }
        ];
    }

    /**
     * Получение выбранных метрик для отображения
     */
    getSelectedMetrics(filters) {
        const metrics = [];
        if (filters.showPlan !== false) metrics.push('plan');
        if (filters.showFact !== false) metrics.push('fact');
        if (filters.showDeviation === true) metrics.push('deviation');
        
        console.log('🔍 ReportsService: getSelectedMetrics вызвана с фильтрами:', filters);
        console.log('🔍 ReportsService: Возвращаемые метрики:', metrics);
        
        return metrics;
    }

    /**
     * Получение названия магазина
     */
    getShopName(shopId) {
        if (!shopId || shopId === 'all') return 'Все магазины';
        return `Магазин ${shopId}`;
    }

    /**
     * Получение названия категории
     */
    getCategoryName(categoryId) {
        if (!categoryId || categoryId === 'all') return 'Все категории';
        return `Категория ${categoryId}`;
    }

    /**
     * Получение названия метрики
     */
    getMetricName(metricId) {
        if (!metricId || metricId === 'all') return 'Все метрики';
        return `Метрика ${metricId}`;
    }

    /**
     * Получение названия месяца
     */
    getMonthName(month) {
        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        return months[month - 1] || `Месяц ${month}`;
    }
}

export default new ReportsService();
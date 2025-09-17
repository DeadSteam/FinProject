/**
 * Сервис аналитики и отчетности
 * Отвечает за получение аналитических данных и статистики
 */
export class AnalyticsService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Получение общей аналитики
     * @param {Object} filters - Фильтры для аналитики
     * @returns {Promise<Object>} - Аналитические данные
     */
    async getAnalytics(filters = {}) {
        // Используем comprehensive эндпоинт для получения всей аналитики
        const params = new URLSearchParams();
        if (filters.years) params.append('years', Array.isArray(filters.years) ? filters.years.join(',') : filters.years);
        if (filters.categories) params.append('categories', Array.isArray(filters.categories) ? filters.categories.join(',') : filters.categories);  
        if (filters.shops) params.append('shops', Array.isArray(filters.shops) ? filters.shops.join(',') : filters.shops);
        if (filters.metrics) params.append('metrics', Array.isArray(filters.metrics) ? filters.metrics.join(',') : filters.metrics);
        
        return this.api.get(`/finance/analytics/comprehensive?${params.toString()}`);
    }

    /**
     * Получение агрегированных данных для дашборда
     * @returns {Promise<Object>} - Данные дашборда
     */
    async getDashboardAnalytics() {
        return this.api.get('/finance/analytics/dashboard/aggregate');
    }

    /**
     * Получение статистики бюджета
     * @param {Object} filters - Фильтры (категория, магазин, период)
     * @returns {Promise<Object>} - Статистика бюджета
     */
    async getBudgetStatistics(filters = {}) {
        return this.api.get('/finance/analytics/budget-statistics', filters);
    }

    /**
     * Получение детальных метрик категории
     * @param {string} categoryId - ID категории
     * @param {string} shopId - ID магазина
     * @param {number} year - Год
     * @returns {Promise<Object>} - Детальные метрики
     */
    async getDetailedCategoryMetrics(categoryId, shopId, year) {
        return this.api.get(`/finance/analytics/metrics/details/${categoryId}/${shopId}/${year}`);
    }

    /**
     * Получение сравнительной аналитики
     * @param {Object} compareParams - Параметры сравнения
     * @returns {Promise<Object>} - Данные сравнения
     */
    async getComparativeAnalytics(compareParams) {
        return this.api.get('/finance/analytics/comparative', compareParams);
    }

    /**
     * Получение трендов по периодам
     * @param {Object} trendParams - Параметры трендов
     * @returns {Promise<Object>} - Данные трендов
     */
    async getTrendAnalytics(trendParams) {
        return this.api.get('/finance/analytics/trends', trendParams);
    }

    /**
     * Получение аналитики отклонений
     * @param {Object} deviationParams - Параметры отклонений
     * @returns {Promise<Object>} - Данные отклонений
     */
    async getDeviationAnalytics(deviationParams) {
        return this.api.get('/finance/analytics/deviations', deviationParams);
    }

    /**
     * Экспорт аналитических данных
     * @param {Object} exportParams - Параметры экспорта
     * @returns {Promise<Blob>} - Файл для скачивания
     */
    async exportAnalytics(exportParams) {
        return this.api.get('/finance/analytics/export', exportParams, {
            responseType: 'blob'
        });
    }

    /**
     * Получение прогнозных данных
     * @param {Object} forecastParams - Параметры прогноза
     * @returns {Promise<Object>} - Прогнозные данные
     */
    async getForecastAnalytics(forecastParams) {
        return this.api.get('/finance/analytics/forecast', forecastParams);
    }
} 


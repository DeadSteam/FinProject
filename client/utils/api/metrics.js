import { apiClient } from './index.js';

// API для работы с метриками
class MetricsApi {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.endpoint = '/finance/metrics';
    }

    // Получение списка всех метрик
    async getAllMetrics(params = {}) {
        return this.apiClient.get(this.endpoint, params);
    }
    
    // Поиск и фильтрация метрик
    async searchMetrics(search = null, categoryId = null) {
        const params = {};
        if (search) params.search = search;
        if (categoryId) params.category_id = categoryId;
        
        return this.apiClient.get(`${this.endpoint}/search`, params);
    }

    // Получение метрики по ID
    async getMetricById(id) {
        return this.apiClient.get(`${this.endpoint}/${id}`);
    }

    // Создание новой метрики
    async createMetric(metricData) {
        return this.apiClient.post(this.endpoint, metricData);
    }

    // Обновление метрики
    async updateMetric(id, metricData) {
        return this.apiClient.put(`${this.endpoint}/${id}`, metricData);
    }

    // Удаление метрики
    async deleteMetric(id) {
        return this.apiClient.delete(`${this.endpoint}/${id}`);
    }

    // Получение метрик по категории
    async getMetricsByCategory(categoryId) {
        return this.apiClient.get(`${this.endpoint}`, { category_id: categoryId });
    }

    // Получение всех категорий
    async getAllCategories() {
        return this.apiClient.get('/finance/categories');
    }
    
    // Получение бюджетной статистики
    async getBudgetStatistics(shopId = null, year = null, month = null) {
        const params = {};
        if (shopId) params.shop_id = shopId;
        if (year) params.year = year;
        if (month) params.month = month;
        
        return this.apiClient.get('/finance/budget-statistics', params);
    }
    
    // Получение периодов, сгруппированных по типу
    async getPeriodsGrouped(year = null) {
        const params = {};
        if (year) params.year = year;
        
        return this.apiClient.get('/finance/periods/grouped', params);
    }
}

// Экспортируем экземпляр API для метрик
export const metricsApi = new MetricsApi(apiClient); 
import { ICategoryService } from '../interfaces/ICategoryService.js';

/**
 * Сервис управления категориями
 * Отвечает за CRUD операции с финансовыми категориями
 * Реализует ICategoryService интерфейс (DIP принцип)
 */
export class CategoryService extends ICategoryService {
    constructor(apiClient) {
        super();
        this.api = apiClient;
    }

    /**
     * Получение списка всех категорий
     * @param {Object} filters - Фильтры для поиска
     * @returns {Promise<Array>} - Список категорий
     */
    async getCategories(filters = {}) {
        return this.api.get('/finance/categories', filters);
    }

    /**
     * Получение категории по ID
     * @param {string} categoryId - ID категории
     * @returns {Promise<Object>} - Данные категории
     */
    async getCategoryById(categoryId) {
        return this.api.get(`/finance/categories/${categoryId}`);
    }

    /**
     * Создание новой категории
     * @param {Object} categoryData - Данные категории
     * @returns {Promise<Object>} - Созданная категория
     */
    async createCategory(categoryData) {
        return this.api.post('/finance/categories', categoryData);
    }

    /**
     * Обновление категории
     * @param {string} categoryId - ID категории
     * @param {Object} categoryData - Обновленные данные
     * @returns {Promise<Object>} - Обновленная категория
     */
    async updateCategory(categoryId, categoryData) {
        return this.api.put(`/finance/categories/${categoryId}`, categoryData);
    }

    /**
     * Удаление категории
     * @param {string} categoryId - ID категории
     * @returns {Promise<Object>} - Результат удаления
     */
    async deleteCategory(categoryId) {
        return this.api.delete(`/finance/categories/${categoryId}`);
    }

    /**
     * Получение статистики по категории
     * @param {string} categoryId - ID категории
     * @param {Object} params - Параметры (год, месяц, квартал)
     * @returns {Promise<Object>} - Статистика категории
     */
    async getCategoryStatistics(categoryId, params = {}) {
        return this.api.get(`/finance/categories/${categoryId}/statistics`, params);
    }

    /**
     * Получение метрик категории
     * @param {string} categoryId - ID категории
     * @returns {Promise<Array>} - Метрики категории
     */
    async getCategoryMetrics(categoryId) {
        return this.api.get(`/finance/categories/${categoryId}/metrics`);
    }

    /**
     * Получение списка изображений для категорий
     * @returns {Promise<Array>} - Список изображений
     */
    async getImages() {
        return this.api.get('/finance/images');
    }
} 
/**
 * Сервис управления магазинами
 * Отвечает за CRUD операции с магазинами
 */
export class ShopService {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Получение списка всех магазинов
     * @param {Object} filters - Фильтры для поиска
     * @returns {Promise<Array>} - Список магазинов
     */
    async getShops(filters = {}) {
        return this.api.get('/finance/shops', filters);
    }

    /**
     * Получение магазина по ID
     * @param {string} shopId - ID магазина
     * @returns {Promise<Object>} - Данные магазина
     */
    async getShopById(shopId) {
        return this.api.get(`/finance/shops/${shopId}`);
    }

    /**
     * Создание нового магазина
     * @param {Object} shopData - Данные магазина
     * @returns {Promise<Object>} - Созданный магазин
     */
    async createShop(shopData) {
        return this.api.post('/finance/shops', shopData);
    }

    /**
     * Обновление магазина
     * @param {string} shopId - ID магазина
     * @param {Object} shopData - Обновленные данные
     * @returns {Promise<Object>} - Обновленный магазин
     */
    async updateShop(shopId, shopData) {
        return this.api.put(`/finance/shops/${shopId}`, shopData);
    }

    /**
     * Удаление магазина
     * @param {string} shopId - ID магазина
     * @returns {Promise<Object>} - Результат удаления
     */
    async deleteShop(shopId) {
        return this.api.delete(`/finance/shops/${shopId}`);
    }

    /**
     * Получение статистики по магазину
     * @param {string} shopId - ID магазина
     * @param {Object} params - Параметры (год, месяц, квартал)
     * @returns {Promise<Object>} - Статистика магазина
     */
    async getShopStatistics(shopId, params = {}) {
        return this.api.get(`/finance/shops/${shopId}/statistics`, params);
    }

    /**
     * Получение метрик магазина
     * @param {string} shopId - ID магазина
     * @returns {Promise<Array>} - Метрики магазина
     */
    async getShopMetrics(shopId) {
        return this.api.get(`/finance/shops/${shopId}/metrics`);
    }
} 
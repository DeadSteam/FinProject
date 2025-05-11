import { apiClient } from './index.js';

// API для работы с магазинами
class ShopsApi {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.endpoint = '/finance/shops';
    }

    // Получение списка всех магазинов
    async getAllShops(params = {}) {
        return this.apiClient.get(this.endpoint, params);
    }

    // Поиск и фильтрация магазинов
    async searchShops(search = null, status = null) {
        const params = {};
        if (search) params.search = search;
        if (status !== null) params.status = status;
        
        return this.apiClient.get(`${this.endpoint}/search`, params);
    }

    // Получение магазина по ID
    async getShopById(id) {
        return this.apiClient.get(`${this.endpoint}/${id}`);
    }

    // Создание нового магазина
    async createShop(shopData) {
        return this.apiClient.post(this.endpoint, shopData);
    }

    // Обновление магазина
    async updateShop(id, shopData) {
        return this.apiClient.put(`${this.endpoint}/${id}`, shopData);
    }

    // Удаление магазина
    async deleteShop(id) {
        return this.apiClient.delete(`${this.endpoint}/${id}`);
    }
}

// Экспортируем экземпляр API для магазинов
export const shopsApi = new ShopsApi(apiClient); 
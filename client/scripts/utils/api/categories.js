import { apiClient } from './index.js';

class CategoriesApi {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.endpoint = '/finance/categories';
    }

     async getAll (params) {
        return this.apiClient.get(`${this.endpoint}/with-images`, params);
     }

    async getById(id) {
        return await this.apiClient.get(`${this.endpoint}/${id}`);
    }

    async getImages() {
        return await this.apiClient.get('/finance/images');
    }

    async create(data) {
        return await this.apiClient.post(this.endpoint, data);
    }

    async update(id, data) {
        return await this.apiClient.put(`${this.endpoint}/${id}`, data);
    }

    async delete(id) {
        return await this.apiClient.delete(`${this.endpoint}/${id}`);
    }
}

export const categoriesApi = new CategoriesApi(apiClient);
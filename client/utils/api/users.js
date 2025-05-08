import { apiClient } from './index.js';

// API для работы с пользователями
class UsersApi {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.endpoint = '/users';
    }

    // Получение списка всех пользователей
    async getAllUsers(params = {}) {
        return this.apiClient.get(this.endpoint, params);
    }

    // Поиск и фильтрация пользователей
    async searchUsers(search = null, status = null, roleId = null) {
        const params = {};
        if (search) params.search = search;
        if (status !== null) params.status = status;
        if (roleId) params.role_id = roleId;
        
        return this.apiClient.get(`${this.endpoint}/search`, params);
    }

    // Получение пользователя по ID
    async getUserById(id) {
        return this.apiClient.get(`${this.endpoint}/${id}`);
    }

    // Создание нового пользователя
    async createUser(userData) {
        return this.apiClient.post(this.endpoint, userData);
    }

    // Обновление пользователя
    async updateUser(id, userData) {
        return this.apiClient.put(`${this.endpoint}/${id}`, userData);
    }

    // Удаление пользователя
    async deleteUser(id) {
        return this.apiClient.delete(`${this.endpoint}/${id}`);
    }

    // Получение всех ролей
    async getAllRoles() {
        return this.apiClient.get(`${this.endpoint}/roles`);
    }

    // Создание новой роли
    async createRole(roleData) {
        return this.apiClient.post(`${this.endpoint}/roles`, roleData);
    }

    // Получение роли по ID
    async getRoleById(id) {
        return this.apiClient.get(`${this.endpoint}/roles/${id}`);
    }

    // Обновление роли
    async updateRole(id, roleData) {
        return this.apiClient.put(`${this.endpoint}/roles/${id}`, roleData);
    }

    // Удаление роли
    async deleteRole(id) {
        return this.apiClient.delete(`${this.endpoint}/roles/${id}`);
    }
}

// Экспортируем экземпляр API для пользователей
export const usersApi = new UsersApi(apiClient); 
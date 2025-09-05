import { IUserService } from '../interfaces/IUserService.js';

/**
 * Сервис управления пользователями
 * Отвечает за CRUD операции с пользователями
 * Реализует IUserService интерфейс (DIP принцип)
 */
export class UserService extends IUserService {
    constructor(apiClient) {
        super();
        this.api = apiClient;
    }

    /**
     * Получение списка всех пользователей
     * @param {Object} filters - Фильтры для поиска
     * @returns {Promise<Array>} - Список пользователей
     */
    async getUsers(filters = {}) {
        return this.api.get('/users', filters);
    }

    /**
     * Получение пользователя по ID
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} - Данные пользователя
     */
    async getUserById(userId) {
        return this.api.get(`/users/${userId}`);
    }

    /**
     * Создание нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} - Созданный пользователь
     */
    async createUser(userData) {
        return this.api.post('/users', userData);
    }

    /**
     * Обновление пользователя
     * @param {string} userId - ID пользователя
     * @param {Object} userData - Обновленные данные
     * @returns {Promise<Object>} - Обновленный пользователь
     */
    async updateUser(userId, userData) {
        return this.api.put(`/users/${userId}`, userData);
    }

    /**
     * Удаление пользователя
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} - Результат удаления
     */
    async deleteUser(userId) {
        return this.api.delete(`/users/${userId}`);
    }

    /**
     * Получение профиля текущего пользователя
     * @returns {Promise<Object>} - Профиль пользователя
     */
    async getUserProfile() {
        return this.api.get('/users/me');
    }

    /**
     * Обновление профиля текущего пользователя
     * @param {Object} profileData - Данные профиля
     * @returns {Promise<Object>} - Обновленный профиль
     */
    async updateUserProfile(profileData) {
        return this.api.put('/users/me', profileData);
    }

    /**
     * Получение списка ролей пользователей
     * @returns {Promise<Array>} - Список ролей
     */
    async getUserRoles() {
        return this.api.get('/users/roles');
    }

    /**
     * Изменение статуса пользователя (активация/деактивация)
     * @param {string} userId - ID пользователя
     * @param {boolean} isActive - Новый статус
     * @returns {Promise<Object>} - Результат изменения
     */
    async changeUserStatus(userId, isActive) {
        return this.api.patch(`/users/${userId}/status`, { is_active: isActive });
    }

    /**
     * Получение статистики пользователей
     * @returns {Promise<Object>} - Статистика пользователей
     */
    async getUserStatistics() {
        return this.api.get('/users/statistics');
    }
} 
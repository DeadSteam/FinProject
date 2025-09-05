/**
 * @interface IAuthService
 * Абстракция для сервиса аутентификации.
 * Определяет контракт, которому должны следовать все реализации.
 */
export default class IAuthService {
    /**
     * @param {string} username
     * @param {string} password
     * @returns {Promise<Object>}
     */
    async login(username, password) {
        throw new Error("Method 'login' must be implemented.");
    }

    /**
     * Выход из системы
     * @returns {Promise<Object>} - Результат выхода
     */
    async logout() {
        throw new Error("Method 'logout' must be implemented.");
    }

    /**
     * Обновление токена
     * @returns {Promise<Object>} - Новый токен
     */
    async refreshToken() {
        throw new Error("Method 'refreshToken' must be implemented.");
    }

    /**
     * @returns {Promise<Object>}
     */
    async getCurrentUser() {
        throw new Error("Method 'getCurrentUser' must be implemented.");
    }

    /**
     * Регистрация нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} - Результат регистрации
     */
    async register(userData) {
        throw new Error('Method "register" must be implemented');
    }

    /**
     * Запрос на сброс пароля
     * @param {string} email - Email пользователя
     * @returns {Promise<Object>} - Результат запроса
     */
    async requestPasswordReset(email) {
        throw new Error('Method "requestPasswordReset" must be implemented');
    }

    /**
     * Подтверждение сброса пароля
     * @param {string} token - Токен сброса
     * @param {string} newPassword - Новый пароль
     * @returns {Promise<Object>} - Результат сброса
     */
    async confirmPasswordReset(token, newPassword) {
        throw new Error('Method "confirmPasswordReset" must be implemented');
    }

    /**
     * Изменение пароля текущего пользователя
     * @param {string} currentPassword - Текущий пароль
     * @param {string} newPassword - Новый пароль
     * @returns {Promise<Object>} - Результат изменения
     */
    async changePassword(currentPassword, newPassword) {
        throw new Error('Method "changePassword" must be implemented');
    }

    /**
     * Обновление профиля текущего пользователя
     * @param {Object} userData - Данные для обновления
     * @returns {Promise<Object>} - Обновленные данные пользователя
     */
    async updateProfile(userData) {
        throw new Error('Method "updateProfile" must be implemented');
    }
} 
import IAuthService from '../interfaces/IAuthService.js';

/**
 * Сервис авторизации
 * Отвечает только за операции, связанные с авторизацией пользователя
 * Реализует IAuthService интерфейс (DIP принцип)
 */
export class AuthService extends IAuthService {
    constructor(apiClient) {
        super();
        this.api = apiClient;
    }

    /**
     * Авторизация пользователя
     * @param {Object} credentials - Данные для входа
     * @returns {Promise<Object>} - Данные авторизации
     */
    async login(credentials) {
        return this.api.postPublic('/auth/login', credentials);
    }

    /**
     * Выход из системы
     * @returns {Promise<Object>} - Результат выхода
     */
    async logout() {
        return this.api.post('/auth/logout');
    }

    /**
     * Обновление токена
     * @returns {Promise<Object>} - Новый токен
     */
    async refreshToken() {
        return this.api.post('/auth/refresh');
    }

    /**
     * Получение информации о текущем пользователе
     * @returns {Promise<Object>} - Данные пользователя
     */
    async getCurrentUser() {
        return this.api.get('/users/me');
    }

    /**
     * Регистрация нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} - Результат регистрации
     */
    async register(userData) {
        return this.api.postPublic('/auth/register', userData);
    }

    /**
     * Запрос на сброс пароля
     * @param {string} email - Email пользователя
     * @returns {Promise<Object>} - Результат запроса
     */
    async requestPasswordReset(email) {
        return this.api.postPublic('/auth/reset-password', { email });
    }

    /**
     * Подтверждение сброса пароля
     * @param {string} token - Токен сброса
     * @param {string} newPassword - Новый пароль
     * @returns {Promise<Object>} - Результат сброса
     */
    async confirmPasswordReset(token, newPassword) {
        return this.api.postPublic('/auth/reset-password/confirm', {
            token,
            new_password: newPassword
        });
    }

    /**
     * Изменение пароля текущего пользователя
     * @param {string} currentPassword - Текущий пароль
     * @param {string} newPassword - Новый пароль
     * @returns {Promise<Object>} - Результат изменения
     */
    async changePassword(currentPassword, newPassword) {
        return this.api.post('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword
        });
    }

    /**
     * Обновление профиля текущего пользователя
     * @param {Object} userData - Данные для обновления
     * @returns {Promise<Object>} - Обновленные данные пользователя
     */
    async updateProfile(userData) {
        return this.api.put('/users/me', userData);
    }

    /**
     * Загрузка аватара пользователя
     * @param {File} file - Файл аватара
     * @returns {Promise<Object>} - Результат загрузки
     */
    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Получаем ID текущего пользователя
        const currentUser = await this.getCurrentUser();
        
        return this.api.post(`/avatars/upload?user_id=${currentUser.id}`, formData);
    }

    /**
     * Удаление аватара пользователя
     * @returns {Promise<Object>} - Результат удаления
     */
    async removeAvatar() {
        // Получаем ID текущего пользователя
        const currentUser = await this.getCurrentUser();
        
        // Получаем текущий аватар
        const avatar = await this.api.get(`/avatars/user/${currentUser.id}`);
        
        if (avatar) {
            return this.api.delete(`/avatars/${avatar.id}`);
        }
        
        throw new Error('Аватар не найден');
    }
}
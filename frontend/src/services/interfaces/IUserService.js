/**
 * Интерфейс для сервиса пользователей
 * Определяет контракт для всех реализаций пользовательского сервиса
 * Соблюдение принципов ISP (Interface Segregation) и DIP (Dependency Inversion)
 */

/**
 * @typedef {import('../../context/interfaces/IAuthStateContext.js').UserProfile} UserProfile
 */

/**
 * @typedef {object} IUserService
 * @property {() => Promise<UserProfile[]>} getAllUsers - Fetches all users.
 * @property {(id: number) => Promise<UserProfile>} getUserById - Fetches a single user by their ID.
 * @property {(userData: Omit<UserProfile, 'id'>) => Promise<UserProfile>} createUser - Creates a new user.
 * @property {(id: number, userData: Partial<UserProfile>) => Promise<UserProfile>} updateUser - Updates an existing user.
 * @property {(id: number) => Promise<void>} deleteUser - Deletes a user.
 */

export class IUserService {
    /**
     * Получение списка пользователей
     * @param {Object} params - Параметры запроса (page, limit, search)
     * @returns {Promise<Object>} - Список пользователей с пагинацией
     */
    async getUsers(params = {}) {
        throw new Error('Method "getUsers" must be implemented');
    }

    /**
     * Получение пользователя по ID
     * @param {number} id - ID пользователя
     * @returns {Promise<Object>} - Данные пользователя
     */
    async getUserById(id) {
        throw new Error('Method "getUserById" must be implemented');
    }

    /**
     * Создание нового пользователя
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} - Созданный пользователь
     */
    async createUser(userData) {
        throw new Error('Method "createUser" must be implemented');
    }

    /**
     * Обновление пользователя
     * @param {number} id - ID пользователя
     * @param {Object} userData - Обновленные данные
     * @returns {Promise<Object>} - Обновленный пользователь
     */
    async updateUser(id, userData) {
        throw new Error('Method "updateUser" must be implemented');
    }

    /**
     * Удаление пользователя
     * @param {number} id - ID пользователя
     * @returns {Promise<Object>} - Результат удаления
     */
    async deleteUser(id) {
        throw new Error('Method "deleteUser" must be implemented');
    }

    /**
     * Изменение роли пользователя
     * @param {number} id - ID пользователя
     * @param {string} role - Новая роль
     * @returns {Promise<Object>} - Обновленный пользователь
     */
    async changeUserRole(id, role) {
        throw new Error('Method "changeUserRole" must be implemented');
    }

    /**
     * Изменение статуса пользователя (активен/неактивен)
     * @param {number} id - ID пользователя
     * @param {boolean} isActive - Статус активности
     * @returns {Promise<Object>} - Обновленный пользователь
     */
    async changeUserStatus(id, isActive) {
        throw new Error('Method "changeUserStatus" must be implemented');
    }
} 
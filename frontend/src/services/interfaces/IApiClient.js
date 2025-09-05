/**
 * Интерфейс для API клиента
 * Определяет контракт для всех реализаций HTTP клиента
 * Соблюдение принципов ISP (Interface Segregation) и DIP (Dependency Inversion)
 */
export class IApiClient {
    /**
     * GET запрос
     * @param {string} url - URL запроса
     * @param {Object} params - Параметры запроса
     * @param {Object} config - Дополнительная конфигурация
     * @returns {Promise<Object>} - Данные ответа
     */
    async get(url, params = {}, config = {}) {
        throw new Error('Method "get" must be implemented');
    }

    /**
     * POST запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async post(url, data = null, config = {}) {
        throw new Error('Method "post" must be implemented');
    }

    /**
     * PUT запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async put(url, data = null, config = {}) {
        throw new Error('Method "put" must be implemented');
    }

    /**
     * DELETE запрос
     * @param {string} url - URL запроса
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async delete(url, config = {}) {
        throw new Error('Method "delete" must be implemented');
    }

    /**
     * PATCH запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async patch(url, data = null, config = {}) {
        throw new Error('Method "patch" must be implemented');
    }

    /**
     * POST запрос без авторизации
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async postPublic(url, data = null, config = {}) {
        throw new Error('Method "postPublic" must be implemented');
    }

    /**
     * Добавление интерцептора запроса
     * @param {Function} interceptor - Функция интерцептор
     * @returns {void}
     */
    addRequestInterceptor(interceptor) {
        throw new Error('Method "addRequestInterceptor" must be implemented');
    }

    /**
     * Добавление интерцептора ответа
     * @param {Function} interceptor - Функция интерцептор
     * @returns {void}
     */
    addResponseInterceptor(interceptor) {
        throw new Error('Method "addResponseInterceptor" must be implemented');
    }

    /**
     * Проверка доступности API
     * @returns {Promise<boolean>} - Доступность API
     */
    async healthCheck() {
        throw new Error('Method "healthCheck" must be implemented');
    }
} 
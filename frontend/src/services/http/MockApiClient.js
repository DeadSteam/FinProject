import { HTTP_STATUS, TIME_INTERVALS } from '../../config/magic-numbers.js';
import { IApiClient } from '../interfaces/IApiClient.js';

/**
 * Mock API клиент для тестирования и разработки
 * Реализует IApiClient интерфейс
 * Соблюдение принципа LSP (Liskov Substitution Principle)
 */
export class MockApiClient extends IApiClient {
    constructor() {
        super();
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.mockData = this.initializeMockData();
        this.delay = 300; // Имитация сетевой задержки
    }

    /**
     * Инициализация моковых данных
     * @returns {Object} - Объект с моковыми данными
     */
    initializeMockData() {
        return {
            users: [
                {
                    id: 1,
                    email: 'admin@example.com',
                    first_name: 'Admin',
                    last_name: 'User',
                    role: 'admin',
                    is_active: true,
                    phone_number: '+1234567890'
                },
                {
                    id: 2,
                    email: 'user@example.com',
                    first_name: 'Regular',
                    last_name: 'User',
                    role: 'user',
                    is_active: true,
                    phone_number: '+0987654321'
                }
            ],
            categories: [
                { id: 1, name: 'Продукты', description: 'Продукты питания' },
                { id: 2, name: 'Транспорт', description: 'Расходы на транспорт' },
                { id: 3, name: 'Развлечения', description: 'Развлечения и досуг' }
            ],
            shops: [
                { id: 1, name: 'Магазин 1', address: 'Адрес 1' },
                { id: 2, name: 'Магазин 2', address: 'Адрес 2' }
            ],
            auth: {
                access_token: 'mock_access_token_12345',
                refresh_token: 'mock_refresh_token_67890',
                token_type: 'Bearer',
                user: {
                    id: 1,
                    email: 'admin@example.com',
                    first_name: 'Admin',
                    last_name: 'User',
                    role: 'admin'
                }
            }
        };
    }

    /**
     * Имитация сетевой задержки
     * @param {number} ms - Задержка в миллисекундах
     * @returns {Promise} - Promise с задержкой
     */
    async simulateDelay(ms = this.delay) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Создание мокового ответа
     * @param {Object} data - Данные ответа
     * @param {number} status - HTTP статус
     * @returns {Object} - Моковый ответ
     */
    createMockResponse(data, status = HTTP_STATUS.OK) {
        return {
            ok: status >= HTTP_STATUS.OK && status < HTTP_STATUS.MULTIPLE_CHOICES,
            status,
            data,
            json: async () => data
        };
    }

    /**
     * GET запрос (мок)
     * @param {string} url - URL запроса
     * @param {Object} params - Параметры запроса
     * @param {Object} config - Дополнительная конфигурация
     * @returns {Promise<Object>} - Данные ответа
     */
    async get(url, params = {}, config = {}) {
        await this.simulateDelay();

        // Простая маршрутизация для мока
        if (url.includes('/users')) {
            if (url.match(/\/users\/\d+$/)) {
                const id = parseInt(url.split('/').pop());
                const user = this.mockData.users.find(u => u.id === id);
                return user || { error: 'User not found' };
            }
            return { users: this.mockData.users, total: this.mockData.users.length };
        }

        if (url.includes('/categories')) {
            return { categories: this.mockData.categories, total: this.mockData.categories.length };
        }

        if (url.includes('/shops')) {
            return { shops: this.mockData.shops, total: this.mockData.shops.length };
        }

        if (url.includes('/auth/me')) {
            return this.mockData.auth.user;
        }

        if (url.includes('/health')) {
            return { status: 'healthy', timestamp: new Date().toISOString() };
        }

        return { message: 'Mock endpoint not implemented', url };
    }

    /**
     * POST запрос (мок)
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async post(url, data = null, config = {}) {
        await this.simulateDelay();

        if (url.includes('/users')) {
            const newUser = {
                id: this.mockData.users.length + 1,
                ...data,
                is_active: true
            };
            this.mockData.users.push(newUser);
            return newUser;
        }

        if (url.includes('/categories')) {
            const newCategory = {
                id: this.mockData.categories.length + 1,
                ...data
            };
            this.mockData.categories.push(newCategory);
            return newCategory;
        }

        if (url.includes('/shops')) {
            const newShop = {
                id: this.mockData.shops.length + 1,
                ...data
            };
            this.mockData.shops.push(newShop);
            return newShop;
        }

        return { message: 'Created successfully', data };
    }

    /**
     * PUT запрос (мок)
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async put(url, data = null, config = {}) {
        await this.simulateDelay();

        if (url.match(/\/users\/\d+$/)) {
            const id = parseInt(url.split('/').pop());
            const userIndex = this.mockData.users.findIndex(u => u.id === id);
            if (userIndex !== -1) {
                this.mockData.users[userIndex] = { ...this.mockData.users[userIndex], ...data };
                return this.mockData.users[userIndex];
            }
        }

        return { message: 'Updated successfully', data };
    }

    /**
     * DELETE запрос (мок)
     * @param {string} url - URL запроса
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async delete(url, config = {}) {
        await this.simulateDelay();

        if (url.match(/\/users\/\d+$/)) {
            const id = parseInt(url.split('/').pop());
            const userIndex = this.mockData.users.findIndex(u => u.id === id);
            if (userIndex !== -1) {
                this.mockData.users.splice(userIndex, 1);
                return { message: 'User deleted successfully' };
            }
        }

        return { message: 'Deleted successfully' };
    }

    /**
     * PATCH запрос (мок)
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async patch(url, data = null, config = {}) {
        return this.put(url, data, config);
    }

    /**
     * POST запрос без авторизации (мок)
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async postPublic(url, data = null, config = {}) {
        await this.simulateDelay();

        if (url.includes('/auth/login')) {
            // Простая проверка логина
            if (data.email === 'admin@example.com' && data.password === 'admin') {
                return this.mockData.auth;
            } else {
                throw new Error('Invalid credentials');
            }
        }

        if (url.includes('/auth/register')) {
            const newUser = {
                id: this.mockData.users.length + 1,
                ...data,
                role: 'user',
                is_active: true
            };
            this.mockData.users.push(newUser);
            return {
                ...this.mockData.auth,
                user: newUser
            };
        }

        return this.post(url, data, config);
    }

    /**
     * Добавление интерцептора запроса (мок)
     * @param {Function} interceptor - Функция интерцептор
     * @returns {void}
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Добавление интерцептора ответа (мок)
     * @param {Function} interceptor - Функция интерцептор
     * @returns {void}
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Проверка доступности API (мок)
     * @returns {Promise<boolean>} - Доступность API
     */
    async healthCheck() {
        await this.simulateDelay(100);
        return true;
    }

    /**
     * Сброс моковых данных к изначальному состоянию
     * @returns {void}
     */
    resetMockData() {
        this.mockData = this.initializeMockData();
    }

    /**
     * Установка задержки для имитации сети
     * @param {number} ms - Задержка в миллисекундах
     * @returns {void}
     */
    setDelay(ms) {
        this.delay = ms;
    }
}
import { API_BASE_URL, REQUEST_CONFIG } from '../../config/api.js';
import { STORAGE_KEYS } from '../../config/constants.js';
import { IApiClient } from '../interfaces/IApiClient.js';

import { HttpClient } from './HttpClient.js';

/**
 * Специализированный API клиент для нашего приложения
 * Расширяет базовый HttpClient добавляя логику авторизации и специфичные настройки
 * Реализует IApiClient интерфейс (DIP принцип)
 */
export class ApiClient extends HttpClient {
    constructor() {
        super(API_BASE_URL, REQUEST_CONFIG);
        
        // Добавляем интерцепторы для авторизации
        this.addRequestInterceptor(this.authRequestInterceptor.bind(this));
        this.addResponseInterceptor(this.authResponseInterceptor.bind(this));
    }

    /**
     * Получение заголовка авторизации
     * @returns {string|null} - Заголовок авторизации
     */
    getAuthHeader() {
        // Используем тот же ключ, что и TokenManager
        const token = localStorage.getItem('authToken');
        const tokenType = 'Bearer'; // Фиксированный тип токена
        
        if (!token) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('ApiClient: Токен не найден в localStorage');
            }
            return null;
        }
        
        if (process.env.NODE_ENV === 'development') {
            console.log('ApiClient: Используется токен:', token.substring(0, 20) + '...');
        }
        return `${tokenType} ${token}`;
    }

    /**
     * Интерцептор запроса для добавления авторизации
     * @param {Object} config - Конфигурация запроса
     * @returns {Object} - Обработанная конфигурация
     */
    async authRequestInterceptor(config) {
        // Создаем базовые заголовки
        const headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...config.headers
        };

        // Устанавливаем Content-Type только если он не переопределен
        if (!headers['Content-Type'] && !(config.data instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        // Добавляем авторизацию, если не отключена явно
        if (config.includeAuth !== false) {
            const authHeader = this.getAuthHeader();
            if (authHeader) {
                headers.Authorization = authHeader;
            }
        }

        return {
            ...config,
            headers
        };
    }

    /**
     * Интерцептор ответа для обработки авторизации
     * @param {Response} response - Ответ сервера
     * @returns {Response} - Обработанный ответ
     */
    async authResponseInterceptor(response) {
        // Если получили 401, возможно токен истек
        if (response.status === 401) {
            // Можно добавить логику обновления токена
            this.clearAuthData();
        }

        return response;
    }

    /**
     * Очистка данных авторизации
     */
    clearAuthData() {
        // Используем те же ключи, что и TokenManager
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
    }

    /**
     * GET запрос с поддержкой параметров
     * @param {string} url - URL запроса
     * @param {Object} params - Параметры запроса
     * @param {Object} config - Дополнительная конфигурация
     * @returns {Promise<Object>} - Данные ответа
     */
    async get(url, params = {}, config = {}) {
        let fullUrl = url;
        
        // Добавляем параметры к URL, если они есть
        const queryString = new URLSearchParams(params).toString();
        if (queryString) {
            fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
        }
        
        return super.get(fullUrl, config);
    }

    /**
     * POST запрос без авторизации (для логина)
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async postPublic(url, data = null, config = {}) {
        return this.post(url, data, { ...config, includeAuth: false });
    }

    /**
     * Проверка доступности API
     * @returns {Promise<boolean>} - Доступность API
     */
    async healthCheck() {
        try {
            await this.get('/health', {}, { includeAuth: false });
            return true;
        } catch {
            return false;
        }
    }
} 
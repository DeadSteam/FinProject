import { TIME_INTERVALS, APP_CONSTANTS } from '../../config/magic-numbers.js';

/**
 * Базовый HTTP клиент
 * Реализует базовые HTTP операции без привязки к конкретному API
 */
export class HttpClient {
    constructor(baseURL, config = {}) {
        this.baseURL = baseURL;
        this.timeout = config.timeout || TIME_INTERVALS.TIMEOUT_DEFAULT;
        this.retryAttempts = config.retryAttempts || APP_CONSTANTS.RETRY_ATTEMPTS;
        this.retryDelay = config.retryDelay || 1000;
        this.interceptors = {
            request: [],
            response: []
        };
    }

    /**
     * Добавление интерцептора запроса
     * @param {Function} interceptor - Функция интерцептора
     */
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }

    /**
     * Добавление интерцептора ответа
     * @param {Function} interceptor - Функция интерцептора
     */
    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }

    /**
     * Применение интерцепторов запроса
     * @param {Object} config - Конфигурация запроса
     * @returns {Object} - Обработанная конфигурация
     */
    async applyRequestInterceptors(config) {
        let processedConfig = config;
        
        for (const interceptor of this.interceptors.request) {
            processedConfig = await interceptor(processedConfig);
        }
        
        return processedConfig;
    }

    /**
     * Применение интерцепторов ответа
     * @param {Response} response - Ответ сервера
     * @returns {Response} - Обработанный ответ
     */
    async applyResponseInterceptors(response) {
        let processedResponse = response;
        
        for (const interceptor of this.interceptors.response) {
            processedResponse = await interceptor(processedResponse);
        }
        
        return processedResponse;
    }

    /**
     * Добавление query параметров к URL
     * @param {string} url - Исходный URL
     * @param {Object} params - Параметры для добавления
     * @returns {string} - URL с параметрами
     */
    addQueryParams(url, params) {
        if (!params || Object.keys(params).length === 0) {
            return url;
        }

        const urlObj = new URL(url, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                urlObj.searchParams.set(key, params[key]);
            }
        });

        return urlObj.toString();
    }

    /**
     * Добавление timestamp к URL для предотвращения кэширования
     * @param {string} url - Исходный URL
     * @returns {string} - URL с timestamp
     */
    addTimestamp(url) {
        const timestamp = Date.now();
        return url.includes('?') 
            ? `${url}&_=${timestamp}` 
            : `${url}?_=${timestamp}`;
    }

    /**
     * Задержка для retry логики
     * @param {number} ms - Миллисекунды задержки
     * @returns {Promise} - Promise с задержкой
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Проверка, можно ли повторить запрос при данной ошибке
     * @param {Error} error - Ошибка
     * @returns {boolean} - Можно ли повторить
     */
    isRetryableError(error) {
        // Повторяем только сетевые ошибки, не HTTP ошибки
        return error.name === 'TypeError' || error.message.includes('fetch');
    }

    /**
     * Выполнение HTTP запроса с retry логикой
     * @param {string} method - HTTP метод
     * @param {string} url - URL запроса
     * @param {Object} config - Конфигурация запроса
     * @param {number} attempt - Номер попытки
     * @returns {Promise<Response>} - Ответ сервера
     */
    async makeRequest(method, url, config = {}, attempt = 1) {
        let fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        
        // Добавляем query параметры если они есть
        if (config.params) {
            fullUrl = this.addQueryParams(fullUrl, config.params);
        }
        
        const urlWithTimestamp = this.addTimestamp(fullUrl);

        // Применяем интерцепторы запроса
        const { params, ...configWithoutParams } = config;
        const processedConfig = await this.applyRequestInterceptors({
            method,
            url: urlWithTimestamp,
            ...configWithoutParams,
            credentials: 'include'
        });

        // Флаг для отключения HTTP логов в консоли
        const httpLogsEnabled = typeof window !== 'undefined' && window.__ENABLE_HTTP_LOGS__;
        try {
            if (httpLogsEnabled) {
                console.log(`HttpClient: ${processedConfig.method} ${processedConfig.url}`);
                if (processedConfig.headers?.Authorization) {
                    console.log('HttpClient: Заголовок авторизации присутствует');
                }
            }
            
            const response = await fetch(processedConfig.url, {
                method: processedConfig.method,
                headers: processedConfig.headers,
                body: processedConfig.body,
                credentials: processedConfig.credentials
            });

            if (httpLogsEnabled) {
                console.log(`HttpClient: Ответ ${response.status} ${response.statusText}`);
            }

            // Применяем интерцепторы ответа
            return await this.applyResponseInterceptors(response);
        } catch (error) {
            // Retry логика для сетевых ошибок
            if (attempt < this.retryAttempts && this.isRetryableError(error)) {
                await this.delay(this.retryDelay * attempt); // Экспоненциальная задержка
                return this.makeRequest(method, url, config, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Обработка ответа сервера
     * @param {Response} response - Ответ сервера
     * @returns {Promise<Object>} - Обработанные данные
     */
    async handleResponse(response) {
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.log('Ошибка сервера:', errorData); // Добавляем логирование
                console.log('Детали ошибки:', JSON.stringify(errorData, null, 2)); // Полная структура
            } catch {
                errorData = { detail: `HTTP Error ${response.status}` };
            }
            
            const error = new Error(errorData.detail || `HTTP Error ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        // Попытка парсинга JSON
        try {
            return await response.json();
        } catch {
            // Если не JSON, возвращаем пустой объект
            return {};
        }
    }

    /**
     * GET запрос
     * @param {string} url - URL запроса
     * @param {Object} params - Query параметры
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async get(url, params = {}, config = {}) {
        // Если params это объект конфигурации (обратная совместимость)
        if (params && typeof params === 'object' && !Array.isArray(params) && 
            (params.headers || params.body || params.method)) {
            config = params;
            params = {};
        }
        
        const requestConfig = { ...config, params };
        const response = await this.makeRequest('GET', url, requestConfig);
        return this.handleResponse(response);
    }

    /**
     * POST запрос
     * @param {string} url - URL запроса
     * @param {Object|FormData|null} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async post(url, data = null, config = {}) {
        let body = null;
        let headers = { ...config.headers };

        if (data instanceof FormData) {
            body = data;
            // Не указываем Content-Type — браузер сам выставит boundary
        } else if (data) {
            body = JSON.stringify(data);
            headers['Content-Type'] = 'application/json';
        }

        const requestConfig = {
            ...config,
            body,
            headers
        };

        const response = await this.makeRequest('POST', url, requestConfig);
        return this.handleResponse(response);
    }

    /**
     * PUT запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async put(url, data = null, config = {}) {
        const requestConfig = {
            ...config,
            body: data ? JSON.stringify(data) : null
        };
        
        const response = await this.makeRequest('PUT', url, requestConfig);
        return this.handleResponse(response);
    }

    /**
     * DELETE запрос
     * @param {string} url - URL запроса
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async delete(url, config = {}) {
        const response = await this.makeRequest('DELETE', url, config);
        return this.handleResponse(response);
    }

    /**
     * PATCH запрос
     * @param {string} url - URL запроса
     * @param {Object} data - Данные для отправки
     * @param {Object} config - Конфигурация запроса
     * @returns {Promise<Object>} - Данные ответа
     */
    async patch(url, data = null, config = {}) {
        const requestConfig = {
            ...config,
            body: data ? JSON.stringify(data) : null
        };
        
        const response = await this.makeRequest('PATCH', url, requestConfig);
        return this.handleResponse(response);
    }
}
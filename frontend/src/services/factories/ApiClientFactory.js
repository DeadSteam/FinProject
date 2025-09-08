import { ApiClient } from '../http/ApiClient.js';
import { MockApiClient } from '../http/MockApiClient.js';

/**
 * Типы API клиентов
 */
export const ApiClientType = {
    REAL: 'real',
    MOCK: 'mock'
};

/**
 * Конфигурация окружений
 */
export const ApiEnvironment = {
    DEVELOPMENT: 'development',
    TESTING: 'testing',
    PRODUCTION: 'production'
};

/**
 * Фабрика для создания API клиентов
 * Соблюдение принципов OCP (Open/Closed) и Factory Pattern
 * Позволяет легко добавлять новые типы клиентов без изменения существующего кода
 */
export class ApiClientFactory {
    /**
     * Настройки по умолчанию для разных окружений
     */
    static defaultConfigurations = {
        [ApiEnvironment.DEVELOPMENT]: {
            clientType: ApiClientType.REAL,
            enableLogging: true,
            enableMockFallback: true,
            timeout: 10000
        },
        [ApiEnvironment.TESTING]: {
            clientType: ApiClientType.MOCK,
            enableLogging: false,
            enableMockFallback: false,
            timeout: 5000
        },
        [ApiEnvironment.PRODUCTION]: {
            clientType: ApiClientType.REAL,
            enableLogging: false,
            enableMockFallback: false,
            timeout: 15000
        }
    };

    /**
     * Создание API клиента
     * @param {Object} options - Опции создания
     * @param {string} options.type - Тип клиента (real|mock)
     * @param {string} options.environment - Окружение
     * @param {Object} options.config - Дополнительная конфигурация
     * @returns {IApiClient} - Экземпляр API клиента
     */
    static create(options = {}) {
        const {
            type = this.detectClientType(),
            environment = this.detectEnvironment(),
            config = {}
        } = options;

        const defaultConfig = this.defaultConfigurations[environment] || 
                            this.defaultConfigurations[ApiEnvironment.DEVELOPMENT];

        const finalConfig = {
            ...defaultConfig,
            ...config,
            clientType: type || defaultConfig.clientType
        };

        return this.createClientByType(finalConfig.clientType, finalConfig);
    }

    /**
     * Создание клиента по типу
     * @param {string} type - Тип клиента
     * @param {Object} config - Конфигурация
     * @returns {IApiClient} - Экземпляр клиента
     */
    static createClientByType(type, config) {
        switch (type) {
            case ApiClientType.MOCK:
                return this.createMockClient(config);
            
            case ApiClientType.REAL:
                return this.createRealClient(config);
            
            default:
                console.warn(`Unknown API client type: ${type}. Falling back to real client.`);
                return this.createRealClient(config);
        }
    }

    /**
     * Создание реального API клиента
     * @param {Object} config - Конфигурация
     * @returns {ApiClient} - Экземпляр реального клиента
     */
    static createRealClient(config) {
        const client = new ApiClient();
        
        if (config.enableLogging) {
            this.addLoggingInterceptors(client);
        }

        if (config.timeout) {
            this.addTimeoutSupport(client, config.timeout);
        }

        return client;
    }

    /**
     * Создание mock API клиента
     * @param {Object} config - Конфигурация
     * @returns {MockApiClient} - Экземпляр mock клиента
     */
    static createMockClient(config) {
        const client = new MockApiClient();
        
        if (config.mockDelay !== undefined) {
            client.setDelay(config.mockDelay);
        }

        if (config.enableLogging) {
            this.addLoggingInterceptors(client);
        }

        return client;
    }

    /**
     * Создание клиента для тестирования
     * @param {Object} mockData - Кастомные mock данные
     * @returns {MockApiClient} - Клиент для тестирования
     */
    static createTestClient(mockData = null) {
        const client = this.createMockClient({
            mockDelay: 0, // Без задержки в тестах
            enableLogging: false
        });

        if (mockData) {
            client.mockData = { ...client.mockData, ...mockData };
        }

        return client;
    }

    /**
     * Автоматическое определение типа клиента
     * @returns {string} - Тип клиента
     */
    static detectClientType() {
        // Проверяем переменные окружения или URL параметры
        const urlParams = new URLSearchParams(window.location.search);
        const mockParam = urlParams.get('mock');
        
        if (mockParam === 'true') {
            return ApiClientType.MOCK;
        }

        // Проверяем localStorage для разработчиков
        const storedType = localStorage.getItem('api_client_type');
        if (storedType && Object.values(ApiClientType).includes(storedType)) {
            return storedType;
        }

        // По умолчанию определяем по окружению
        const environment = this.detectEnvironment();
        return this.defaultConfigurations[environment]?.clientType || ApiClientType.REAL;
    }

    /**
     * Автоматическое определение окружения
     * @returns {string} - Окружение
     */
    static detectEnvironment() {
        // Проверяем переменные окружения браузера
        if (typeof process !== 'undefined' && process.env) {
            const nodeEnv = process.env.NODE_ENV;
            if (nodeEnv === 'test') return ApiEnvironment.TESTING;
            if (nodeEnv === 'production') return ApiEnvironment.PRODUCTION;
            if (nodeEnv === 'development') return ApiEnvironment.DEVELOPMENT;
        }

        // Проверяем по hostname
        const {hostname} = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return ApiEnvironment.DEVELOPMENT;
        }

        // Проверяем по протоколу и порту
        if (window.location.protocol === 'http:' && window.location.port) {
            return ApiEnvironment.DEVELOPMENT;
        }

        return ApiEnvironment.PRODUCTION;
    }

    /**
     * Добавление логирующих интерцепторов
     * @param {IApiClient} client - API клиент
     * @returns {void}
     */
    static addLoggingInterceptors(client) {
        // Логирование запросов
        client.addRequestInterceptor(async (config) => {
            return config;
        });

        // Логирование ответов
        client.addResponseInterceptor(async (response) => {
            const isSuccess = response.ok || response.status < 400;
            const icon = isSuccess ? '✅' : '❌';
            
            
            return response;
        });
    }

    /**
     * Добавление поддержки timeout
     * @param {IApiClient} client - API клиент
     * @param {number} timeout - Таймаут в миллисекундах
     * @returns {void}
     */
    static addTimeoutSupport(client, timeout) {
        client.addRequestInterceptor(async (config) => {
            return {
                ...config,
                timeout
            };
        });
    }

    /**
     * Переключение типа клиента (для разработки)
     * @param {string} type - Новый тип клиента
     * @returns {void}
     */
    static switchClientType(type) {
        if (Object.values(ApiClientType).includes(type)) {
            localStorage.setItem('api_client_type', type);
        } else {
            console.error(`Invalid client type: ${type}`);
        }
    }

    /**
     * Получение информации о текущем клиенте
     * @returns {Object} - Информация о клиенте
     */
    static getClientInfo() {
        return {
            detectedType: this.detectClientType(),
            detectedEnvironment: this.detectEnvironment(),
            availableTypes: Object.values(ApiClientType),
            availableEnvironments: Object.values(ApiEnvironment)
        };
    }
} 
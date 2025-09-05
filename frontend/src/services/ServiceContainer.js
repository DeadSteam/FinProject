import { AnalyticsService } from './api/AnalyticsService.js';
import { AuthService } from './api/AuthService.js';
import { CategoryService } from './api/CategoryService.js';
import { MetricService } from './api/MetricService.js';
import { ShopService } from './api/ShopService.js';
import { UserService } from './api/UserService.js';
import { ApiClientFactory } from './factories/ApiClientFactory.js';
import { ApiClient } from './http/ApiClient.js';

/**
 * Service Container (DI Container) v2.0
 * Управляет зависимостями и обеспечивает инверсию зависимостей
 * Обновлен для поддержки интерфейсов и фабрик (Phase 4: IoC)
 */
export class ServiceContainer {
    constructor(config = {}) {
        this.services = new Map();
        this.factories = new Map();
        this.singletons = new Map();
        this.interfaces = new Map();
        this.config = config;
        
        // Auto-register default services on init
        if (!config.manual) {
            this.registerDefaultServices();
        }
    }

    /**
     * Регистрация всех сервисов в контейнере
     */
    registerDefaultServices() {
        // Регистрируем API клиент через фабрику как синглтон
        this.registerSingleton('IApiClient', () => {
            return ApiClientFactory.create(this.config.apiClient);
        });
        
        // Альтернативная регистрация для обратной совместимости
        this.registerSingleton('apiClient', (container) => 
            container.get('IApiClient')
        );
        
        // Регистрируем сервисы с зависимостью от API клиента
        this.registerFactory('IAuthService', (container) => 
            new AuthService(container.get('IApiClient'))
        );
        
        this.registerFactory('IUserService', (container) => 
            new UserService(container.get('IApiClient'))
        );
        
        this.registerFactory('ICategoryService', (container) => 
            new CategoryService(container.get('IApiClient'))
        );
        
        this.registerFactory('shopService', (container) => 
            new ShopService(container.get('IApiClient'))
        );
        
        this.registerFactory('metricService', (container) => 
            new MetricService(container.get('IApiClient'))
        );
        
        this.registerFactory('analyticsService', (container) => 
            new AnalyticsService(container.get('IApiClient'))
        );

        // Backward compatibility aliases
        this.registerFactory('authService', (container) => 
            container.get('IAuthService')
        );
        
        this.registerFactory('userService', (container) => 
            container.get('IUserService')
        );
        
        this.registerFactory('categoryService', (container) => 
            container.get('ICategoryService')
        );
    }

    /**
     * Регистрация фабрики для создания сервиса
     * @param {string} name - Имя сервиса
     * @param {Function} factory - Фабричная функция
     */
    registerFactory(name, factory) {
        this.factories.set(name, factory);
    }

    /**
     * Регистрация синглтона
     * @param {string} name - Имя сервиса
     * @param {Function} factory - Фабричная функция
     */
    registerSingleton(name, factory) {
        this.factories.set(name, factory);
        this.singletons.set(name, null);
    }

    /**
     * Регистрация готового экземпляра
     * @param {string} name - Имя сервиса
     * @param {Object} instance - Экземпляр сервиса
     */
    registerInstance(name, instance) {
        this.services.set(name, instance);
    }

    /**
     * Получение сервиса из контейнера
     * @param {string} name - Имя сервиса
     * @returns {Object} - Экземпляр сервиса
     */
    get(name) {
        // Check instances first
        if (this.services.has(name)) {
            return this.services.get(name);
        }

        const factory = this.factories.get(name);
        if (!factory) {
            throw new Error(`Service '${name}' not found`);
        }

        // Handle singletons
        if (this.singletons.has(name)) {
            let singletonInstance = this.singletons.get(name);
            if (singletonInstance === null) {
                singletonInstance = factory(this);
                this.singletons.set(name, singletonInstance);
            }
            return singletonInstance;
        }

        // Create new instance from factory
        return factory(this);
    }

    /**
     * Проверка существования сервиса
     * @param {string} name - Имя сервиса
     * @returns {boolean} - Существует ли сервис
     */
    has(name) {
        return this.services.has(name) || 
               this.factories.has(name) || 
               this.singletons.has(name);
    }

    /**
     * Удаление сервиса из контейнера
     * @param {string} name - Имя сервиса
     */
    remove(name) {
        this.services.delete(name);
        this.factories.delete(name);
        this.singletons.delete(name);
    }

    /**
     * Очистка всех сервисов
     */
    clear() {
        this.services.clear();
        this.factories.clear();
        this.singletons.clear();
    }

    /**
     * Получение списка всех зарегистрированных сервисов
     * @returns {Array<string>} - Список имен сервисов
     */
    getServiceNames() {
        const names = new Set([
            ...this.services.keys(),
            ...this.factories.keys(),
            ...this.singletons.keys(),
            ...this.interfaces.keys()
        ]);
        return Array.from(names);
    }

    /**
     * Регистрация интерфейса (DIP поддержка)
     * @param {string} interfaceName - Имя интерфейса
     * @param {Function} implementationFactory - Фабрика реализации
     * @returns {void}
     */
    registerInterface(interfaceName, implementationFactory) {
        this.interfaces.set(interfaceName, implementationFactory);
    }

    /**
     * Замена реализации интерфейса (для тестирования/мокинга)
     * @param {string} interfaceName - Имя интерфейса
     * @param {Object|Function} mockImplementation - Мок реализация
     * @returns {void}
     */
    mockInterface(interfaceName, mockImplementation) {
        const originalFactory = this.interfaces.get(interfaceName) || 
                              this.factories.get(interfaceName);
        
        if (!originalFactory) {
            throw new Error(`Interface '${interfaceName}' not found for mocking`);
        }

        // Сохраняем оригинальную фабрику для восстановления
        if (!this._originalFactories) {
            this._originalFactories = new Map();
        }
        
        if (!this._originalFactories.has(interfaceName)) {
            this._originalFactories.set(interfaceName, originalFactory);
        }

        // Заменяем на мок
        const mockFactory = typeof mockImplementation === 'function' 
            ? mockImplementation 
            : () => mockImplementation;

        this.registerFactory(interfaceName, mockFactory);
        
        // Очищаем синглтон кэш для этого интерфейса
        if (this.singletons.has(interfaceName)) {
            this.singletons.set(interfaceName, null);
        }
    }

    /**
     * Восстановление оригинальной реализации интерфейса
     * @param {string} interfaceName - Имя интерфейса
     * @returns {void}
     */
    restoreInterface(interfaceName) {
        if (!this._originalFactories || !this._originalFactories.has(interfaceName)) {
            throw new Error(`No original factory found for '${interfaceName}'`);
        }

        const originalFactory = this._originalFactories.get(interfaceName);
        this.registerFactory(interfaceName, originalFactory);
        this._originalFactories.delete(interfaceName);

        // Очищаем синглтон кэш
        if (this.singletons.has(interfaceName)) {
            this.singletons.set(interfaceName, null);
        }
    }

    /**
     * Восстановление всех оригинальных реализаций
     * @returns {void}
     */
    restoreAllInterfaces() {
        if (!this._originalFactories) return;

        for (const [interfaceName] of this._originalFactories) {
            this.restoreInterface(interfaceName);
        }
    }

    /**
     * Создание дочернего контейнера (для изоляции тестов)
     * @param {Object} overrides - Переопределения сервисов
     * @returns {ServiceContainer} - Дочерний контейнер
     */
    createChildContainer(overrides = {}) {
        const childContainer = new ServiceContainer(this.config);
        
        // Копируем все регистрации из родительского контейнера
        for (const [name, factory] of this.factories) {
            childContainer.registerFactory(name, factory);
        }
        
        for (const [name, factory] of this.singletons) {
            childContainer.registerSingleton(name, this.factories.get(name));
        }

        // Применяем переопределения
        for (const [name, override] of Object.entries(overrides)) {
            if (typeof override === 'function') {
                childContainer.registerFactory(name, override);
            } else {
                childContainer.registerInstance(name, override);
            }
        }

        return childContainer;
    }

    /**
     * Настройка контейнера для тестирования
     * @param {Object} mocks - Объект с мок сервисами
     * @returns {void}
     */
    setupForTesting(mocks = {}) {
        // Автоматически заменяем API клиент на мок версию
        if (!mocks.IApiClient) {
            this.mockInterface('IApiClient', () => {
                const { MockApiClient } = require('./http/MockApiClient.js');
                return new MockApiClient();
            });
        }

        // Применяем пользовательские моки
        for (const [serviceName, mockImplementation] of Object.entries(mocks)) {
            this.mockInterface(serviceName, mockImplementation);
        }
    }

    /**
     * Проверка зависимостей сервисов
     * @returns {Array} - Массив с результатами проверки
     */
    validateDependencies() {
        const results = [];
        
        for (const [serviceName, factory] of this.factories) {
            try {
                const service = factory(this);
                results.push({
                    service: serviceName,
                    status: 'success',
                    instance: typeof service
                });
            } catch (error) {
                results.push({
                    service: serviceName,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Получение информации о контейнере для отладки
     * @returns {Object} - Информация о контейнере
     */
    getDebugInfo() {
        return {
            totalServices: this.getServiceNames().length,
            factories: Array.from(this.factories.keys()),
            singletons: Array.from(this.singletons.keys()),
            instances: Array.from(this.services.keys()),
            interfaces: Array.from(this.interfaces.keys()),
            config: this.config,
            dependencyValidation: this.validateDependencies()
        };
    }

    /**
     * Регистрация сервиса (фабрики или экземпляра)
     * @param {string} name - Имя сервиса/интерфейса
     * @param {Function|Object} factoryOrInstance - Фабрика или экземпляр
     * @param {Object} options - Опции
     * @param {boolean} options.singleton - Создавать как синглтон (по умолчанию false)
     */
    register(name, factoryOrInstance, options = {}) {
        const { singleton = false } = options;

        if (typeof factoryOrInstance === 'function') {
            // Register as factory
            this.factories.set(name, factoryOrInstance);
            if (singleton) {
                this.singletons.set(name, null); // Mark as singleton
            }
        } else {
            // Register as instance
            this.services.set(name, factoryOrInstance);
        }
    }
}

// Создаем глобальный экземпляр контейнера
const serviceContainer = new ServiceContainer();

// Экспортируем контейнер и функции-хелперы
export default serviceContainer;

/**
 * Хелпер для получения сервиса
 * @param {string} serviceName - Имя сервиса
 * @returns {Object} - Экземпляр сервиса
 */
export const getService = (serviceName) => {
    return serviceContainer.get(serviceName);
};

/**
 * Хелпер для регистрации сервиса
 * @param {string} name - Имя сервиса
 * @param {Function|Object} factoryOrInstance - Фабрика или экземпляр
 * @param {boolean} isSingleton - Является ли синглтоном
 */
export const registerService = (name, factoryOrInstance, isSingleton = false) => {
    if (typeof factoryOrInstance === 'function') {
        if (isSingleton) {
            serviceContainer.registerSingleton(name, factoryOrInstance);
        } else {
            serviceContainer.registerFactory(name, factoryOrInstance);
        }
    } else {
        serviceContainer.registerInstance(name, factoryOrInstance);
    }
};
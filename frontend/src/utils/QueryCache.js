/**
 * QueryCache - система кэширования API запросов с TTL и автоматической инвалидацией
 */

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

/**
 * Конфигурация по умолчанию для QueryCache
 */
const DEFAULT_CONFIG = {
    defaultTTL: 5 * 60 * 1000, // 5 минут
    maxSize: 100, // Максимум записей в кэше
    enableLogging: dev,
    autoCleanup: true,
    cleanupInterval: 2 * 60 * 1000, // 2 минуты
    staleWhileRevalidate: true, // Возвращать устаревшие данные во время обновления
    retryOnFailure: true,
    maxRetries: 3
};

/**
 * Статусы кэша запросов
 */
export const CACHE_STATUS = {
    FRESH: 'fresh',
    STALE: 'stale',
    EXPIRED: 'expired',
    LOADING: 'loading',
    ERROR: 'error'
};

/**
 * Основной класс QueryCache
 */
class QueryCache {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new Map();
        this.subscribers = new Map(); // Подписчики на изменения
        this.loadingPromises = new Map(); // Активные промисы загрузки
        this.cleanupTimer = null;
        
        if (this.config.autoCleanup) {
            this.startAutoCleanup();
        }
    }
    
    /**
     * Логирование
     */
    log(message, level = 'info') {
        if (this.config.enableLogging && dev) {
            console[level](`[QueryCache] ${message}`);
        }
    }
    
    /**
     * Создает ключ кэша из параметров запроса
     */
    createCacheKey(queryKey, params = {}) {
        if (typeof queryKey === 'string') {
            // Добавляем параметры к ключу для уникальности
            const paramsString = Object.keys(params).length > 0 
                ? `?${new URLSearchParams(params).toString()}`
                : '';
            return `${queryKey}${paramsString}`;
        }
        
        if (Array.isArray(queryKey)) {
            return JSON.stringify(queryKey);
        }
        
        return JSON.stringify(queryKey);
    }
    
    /**
     * Получает статус кэшированных данных
     */
    getCacheStatus(cacheKey) {
        const cached = this.cache.get(cacheKey);
        
        if (!cached) {
            return this.loadingPromises.has(cacheKey) ? CACHE_STATUS.LOADING : null;
        }
        
        if (cached.error) {
            return CACHE_STATUS.ERROR;
        }
        
        const now = Date.now();
        const { timestamp, ttl, staleTTL } = cached;
        
        if (ttl && now - timestamp > ttl) {
            if (staleTTL && now - timestamp <= staleTTL) {
                return CACHE_STATUS.STALE;
            }
            return CACHE_STATUS.EXPIRED;
        }
        
        return CACHE_STATUS.FRESH;
    }
    
    /**
     * Получает данные из кэша
     */
    get(queryKey, params = {}) {
        const cacheKey = this.createCacheKey(queryKey, params);
        const cached = this.cache.get(cacheKey);
        
        if (!cached) {
            this.log(`Cache miss for key: ${cacheKey}`);
            return null;
        }
        
        const status = this.getCacheStatus(cacheKey);
        
        if (status === CACHE_STATUS.EXPIRED) {
            this.log(`Cache expired for key: ${cacheKey}`);
            this.cache.delete(cacheKey);
            return null;
        }
        
        this.log(`Cache hit for key: ${cacheKey}, status: ${status}`);
        
        return {
            data: cached.data,
            status,
            timestamp: cached.timestamp,
            isStale: status === CACHE_STATUS.STALE
        };
    }
    
    /**
     * Сохраняет данные в кэш
     */
    set(queryKey, data, options = {}) {
        const cacheKey = this.createCacheKey(queryKey, options.params || {});
        const ttl = options.ttl || this.config.defaultTTL;
        const staleTTL = options.staleTTL || ttl * 2; // Stale время в 2 раза больше
        
        // Проверяем размер кэша и очищаем если нужно
        if (this.cache.size >= this.config.maxSize) {
            this.evictOldest(Math.floor(this.config.maxSize * 0.1)); // Удаляем 10% старых записей
        }
        
        const cacheEntry = {
            data,
            timestamp: Date.now(),
            ttl,
            staleTTL,
            accessCount: 1,
            lastAccessed: Date.now(),
            queryKey,
            params: options.params || {}
        };
        
        this.cache.set(cacheKey, cacheEntry);
        this.log(`Cached data for key: ${cacheKey}, TTL: ${ttl}ms`);
        
        // Уведомляем подписчиков
        this.notifySubscribers(cacheKey, { data, status: CACHE_STATUS.FRESH });
        
        return cacheEntry;
    }
    
    /**
     * Выполняет запрос с кэшированием
     */
    async query(queryKey, queryFn, options = {}) {
        const cacheKey = this.createCacheKey(queryKey, options.params || {});
        
        // Проверяем кэш
        const cached = this.get(queryKey, options.params || {});
        
        if (cached && (cached.status === CACHE_STATUS.FRESH || 
            (cached.status === CACHE_STATUS.STALE && this.config.staleWhileRevalidate))) {
            
            // Если данные stale, запускаем фоновое обновление
            if (cached.status === CACHE_STATUS.STALE && this.config.staleWhileRevalidate) {
                this.revalidateInBackground(queryKey, queryFn, options);
            }
            
            return {
                data: cached.data,
                isStale: cached.isStale,
                fromCache: true
            };
        }
        
        // Проверяем, есть ли уже активный запрос
        if (this.loadingPromises.has(cacheKey)) {
            this.log(`Deduplicating request for key: ${cacheKey}`);
            return this.loadingPromises.get(cacheKey);
        }
        
        // Выполняем новый запрос
        const queryPromise = this.executeQuery(queryKey, queryFn, options);
        this.loadingPromises.set(cacheKey, queryPromise);
        
        try {
            const result = await queryPromise;
            this.loadingPromises.delete(cacheKey);
            return result;
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            throw error;
        }
    }
    
    /**
     * Выполняет запрос с retry логикой
     */
    async executeQuery(queryKey, queryFn, options = {}, attempt = 1) {
        const cacheKey = this.createCacheKey(queryKey, options.params || {});
        
        try {
            this.log(`Executing query for key: ${cacheKey}, attempt: ${attempt}`);
            
            const data = await queryFn(options.params || {});
            
            // Сохраняем в кэш
            this.set(queryKey, data, options);
            
            return {
                data,
                isStale: false,
                fromCache: false
            };
            
        } catch (error) {
            this.log(`Query failed for key: ${cacheKey}, attempt: ${attempt}, error: ${error.message}`, 'error');
            
            // Retry логика
            if (this.config.retryOnFailure && attempt < this.config.maxRetries) {
                const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.executeQuery(queryKey, queryFn, options, attempt + 1);
            }
            
            // Сохраняем ошибку в кэш
            const errorEntry = {
                error: error.message,
                timestamp: Date.now(),
                ttl: 30 * 1000, // Ошибки кэшируем на 30 секунд
                queryKey,
                params: options.params || {}
            };
            
            this.cache.set(cacheKey, errorEntry);
            
            throw error;
        }
    }
    
    /**
     * Фоновая ревалидация stale данных
     */
    async revalidateInBackground(queryKey, queryFn, options = {}) {
        try {
            await this.executeQuery(queryKey, queryFn, options);
        } catch (error) {
            this.log(`Background revalidation failed for key: ${queryKey}, error: ${error.message}`, 'warn');
        }
    }
    
    /**
     * Инвалидация кэша по ключу или паттерну
     */
    invalidate(pattern) {
        let invalidatedCount = 0;
        
        if (typeof pattern === 'string') {
            // Точное совпадение или префикс
            for (const [cacheKey] of this.cache) {
                if (cacheKey === pattern || cacheKey.startsWith(pattern)) {
                    this.cache.delete(cacheKey);
                    this.notifySubscribers(cacheKey, { invalidated: true });
                    invalidatedCount++;
                }
            }
        } else if (pattern instanceof RegExp) {
            // Регулярное выражение
            for (const [cacheKey] of this.cache) {
                if (pattern.test(cacheKey)) {
                    this.cache.delete(cacheKey);
                    this.notifySubscribers(cacheKey, { invalidated: true });
                    invalidatedCount++;
                }
            }
        } else if (typeof pattern === 'function') {
            // Функция-предикат
            for (const [cacheKey, entry] of this.cache) {
                if (pattern(cacheKey, entry)) {
                    this.cache.delete(cacheKey);
                    this.notifySubscribers(cacheKey, { invalidated: true });
                    invalidatedCount++;
                }
            }
        }
        
        this.log(`Invalidated ${invalidatedCount} cache entries`);
        return invalidatedCount;
    }
    
    /**
     * Подписка на изменения кэша
     */
    subscribe(cacheKey, callback) {
        if (!this.subscribers.has(cacheKey)) {
            this.subscribers.set(cacheKey, new Set());
        }
        
        this.subscribers.get(cacheKey).add(callback);
        
        // Возвращаем функцию отписки
        return () => {
            const callbacks = this.subscribers.get(cacheKey);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.subscribers.delete(cacheKey);
                }
            }
        };
    }
    
    /**
     * Уведомление подписчиков
     */
    notifySubscribers(cacheKey, data) {
        const callbacks = this.subscribers.get(cacheKey);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.log(`Subscriber callback error: ${error.message}`, 'error');
                }
            });
        }
    }
    
    /**
     * Удаление самых старых записей
     */
    evictOldest(count) {
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
            
        for (let i = 0; i < Math.min(count, entries.length); i++) {
            const [cacheKey] = entries[i];
            this.cache.delete(cacheKey);
            this.log(`Evicted cache entry: ${cacheKey}`);
        }
    }
    
    /**
     * Очистка истекших записей
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [cacheKey, entry] of this.cache) {
            const isExpired = entry.staleTTL && (now - entry.timestamp) > entry.staleTTL;
            
            if (isExpired) {
                this.cache.delete(cacheKey);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.log(`Cleaned up ${cleanedCount} expired cache entries`);
        }
        
        return cleanedCount;
    }
    
    /**
     * Запуск автоматической очистки
     */
    startAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
        
        this.log('Auto cleanup started');
    }
    
    /**
     * Остановка автоматической очистки
     */
    stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            this.log('Auto cleanup stopped');
        }
    }
    
    /**
     * Получение статистики кэша
     */
    getStats() {
        const now = Date.now();
        let freshCount = 0;
        let staleCount = 0;
        let expiredCount = 0;
        let errorCount = 0;
        
        for (const [cacheKey] of this.cache) {
            const status = this.getCacheStatus(cacheKey);
            switch (status) {
                case CACHE_STATUS.FRESH: freshCount++; break;
                case CACHE_STATUS.STALE: staleCount++; break;
                case CACHE_STATUS.EXPIRED: expiredCount++; break;
                case CACHE_STATUS.ERROR: errorCount++; break;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            freshCount,
            staleCount,
            expiredCount,
            errorCount,
            maxSize: this.config.maxSize,
            activeQueries: this.loadingPromises.size,
            subscribers: this.subscribers.size
        };
    }
    
    /**
     * Очистка всего кэша
     */
    clear() {
        const {size} = this.cache;
        this.cache.clear();
        this.loadingPromises.clear();
        this.subscribers.clear();
        
        this.log(`Cleared entire cache (${size} entries)`);
        return size;
    }
    
    /**
     * Уничтожение экземпляра
     */
    destroy() {
        this.stopAutoCleanup();
        this.clear();
        this.log('QueryCache destroyed');
    }
}

/**
 * Фабрика для создания QueryCache
 */
export function createQueryCache(config = {}) {
    return new QueryCache(config);
}

/**
 * Глобальный экземпляр QueryCache
 */
export const globalQueryCache = createQueryCache();

export default QueryCache; 
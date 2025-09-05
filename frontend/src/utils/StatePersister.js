/**
 * StatePersister - утилита для управления состоянием в localStorage/sessionStorage
 * Поддерживает TTL, автоматическую очистку и сжатие данных
 */

const DEFAULT_CONFIG = {
    storage: 'localStorage',
    prefix: 'app_state_',
    ttl: 24 * 60 * 60 * 1000, // 24 часа
    autoCleanup: true,
    cleanupInterval: 60 * 60 * 1000, // 1 час
    enableLogging: process.env.NODE_ENV === 'development'
};

class StatePersister {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cleanupTimer = null;
        
        if (this.config.autoCleanup) {
            this.startAutoCleanup();
        }
    }
    
    /**
     * Логирование с проверкой конфигурации
     */
    log(message, level = 'info') {
        if (this.config.enableLogging) {
            console[level](`[StatePersister] ${message}`);
        }
    }
    
    /**
     * Создает ключ с префиксом
     */
    createKey(key) {
        return `${this.config.prefix}${key}`;
    }
    
    /**
     * Сохраняет данные в хранилище
     */
    save(key, data, options = {}) {
        const ttl = options.ttl || this.config.ttl;
        const expiresAt = ttl ? Date.now() + ttl : null;
        
        const wrapper = {
            data,
            timestamp: Date.now(),
            expiresAt,
            version: '1.0'
        };
        
        try {
            const storage = this.config.storage === 'sessionStorage' 
                ? window.sessionStorage 
                : window.localStorage;
                
            storage.setItem(
                this.createKey(key), 
                JSON.stringify(wrapper)
            );
            
            this.log(`Saved data for key: ${key}`, 'info');
            return true;
        } catch (error) {
            this.log(`Save error for key ${key}: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Загружает данные из хранилища
     */
    load(key, defaultValue = null) {
        try {
            const storage = this.config.storage === 'sessionStorage' 
                ? window.sessionStorage 
                : window.localStorage;
                
            const stored = storage.getItem(this.createKey(key));
            
            if (!stored) {
                this.log(`No data found for key: ${key}`, 'info');
                return defaultValue;
            }
            
            const wrapper = JSON.parse(stored);
            
            // Проверяем TTL
            if (wrapper.expiresAt && Date.now() > wrapper.expiresAt) {
                this.log(`Data expired for key: ${key}`, 'info');
                this.remove(key);
                return defaultValue;
            }
            
            this.log(`Loaded data for key: ${key}`, 'info');
            return wrapper.data;
        } catch (error) {
            this.log(`Load error for key ${key}: ${error.message}`, 'error');
            return defaultValue;
        }
    }
    
    /**
     * Удаляет данные из хранилища
     */
    remove(key) {
        try {
            const storage = this.config.storage === 'sessionStorage' 
                ? window.sessionStorage 
                : window.localStorage;
                
            storage.removeItem(this.createKey(key));
            this.log(`Removed data for key: ${key}`, 'info');
            return true;
        } catch (error) {
            this.log(`Remove error for key ${key}: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Проверяет существование ключа
     */
    exists(key) {
        const storage = this.config.storage === 'sessionStorage' 
            ? window.sessionStorage 
            : window.localStorage;
            
        return storage.getItem(this.createKey(key)) !== null;
    }
    
    /**
     * Очищает все данные с префиксом
     */
    clear() {
        try {
            const storage = this.config.storage === 'sessionStorage' 
                ? window.sessionStorage 
                : window.localStorage;
                
            const keysToRemove = [];
            
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.startsWith(this.config.prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => storage.removeItem(key));
            this.log(`Cleared ${keysToRemove.length} items`, 'info');
            
            return true;
        } catch (error) {
            this.log(`Clear error: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Очищает устаревшие данные
     */
    cleanup() {
        try {
            const storage = this.config.storage === 'sessionStorage' 
                ? window.sessionStorage 
                : window.localStorage;
                
            const keysToRemove = [];
            const now = Date.now();
            
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                
                if (key && key.startsWith(this.config.prefix)) {
                    try {
                        const serialized = storage.getItem(key);
                        const wrapper = JSON.parse(serialized);
                        
                        if (wrapper.expiresAt && now > wrapper.expiresAt) {
                            keysToRemove.push(key);
                        }
                    } catch (error) {
                        // Поврежденные данные - тоже удаляем
                        keysToRemove.push(key);
                    }
                }
            }
            
            keysToRemove.forEach(key => storage.removeItem(key));
            
            if (keysToRemove.length > 0) {
                this.log(`Cleaned up ${keysToRemove.length} expired items`, 'info');
            }
            
            return keysToRemove.length;
        } catch (error) {
            this.log(`Cleanup error: ${error.message}`, 'error');
            return 0;
        }
    }
    
    /**
     * Запускает автоматическую очистку
     */
    startAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
        
        this.log('Auto cleanup started', 'info');
    }
    
    /**
     * Останавливает автоматическую очистку
     */
    stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            this.log('Auto cleanup stopped', 'info');
        }
    }
    
    /**
     * Получает статистику использования хранилища
     */
    getStats() {
        const storage = this.config.storage === 'sessionStorage' 
            ? window.sessionStorage 
            : window.localStorage;
            
        let itemCount = 0;
        let expiredCount = 0;
        const now = Date.now();
        
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            
            if (key && key.startsWith(this.config.prefix)) {
                itemCount++;
                
                try {
                    const value = storage.getItem(key);
                    const wrapper = JSON.parse(value);
                    if (wrapper.expiresAt && now > wrapper.expiresAt) {
                        expiredCount++;
                    }
                } catch (error) {
                    // Ignore parsing errors for stats
                }
            }
        }
        
        return {
            itemCount,
            expiredCount
        };
    }
    
    /**
     * Уничтожение экземпляра
     */
    destroy() {
        this.stopAutoCleanup();
        this.log('StatePersister destroyed', 'info');
    }
}

/**
 * Фабрика для создания персистера
 */
export function createStatePersister(config = {}) {
    return new StatePersister(config);
}

/**
 * Предустановленные персистеры
 */

// Долгосрочное хранилище (localStorage, 7 дней)
export const longTermPersister = createStatePersister({
    storage: 'localStorage',
    prefix: 'app_longterm_',
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 дней
});

// Сессионное хранилище (sessionStorage)
export const sessionPersister = createStatePersister({
    storage: 'sessionStorage',
    prefix: 'app_session_',
    ttl: null // Без TTL для сессии
});

// Кэш хранилище (короткое время жизни)
export const cachePersister = createStatePersister({
    storage: 'localStorage',
    prefix: 'app_cache_',
    ttl: 30 * 60 * 1000, // 30 минут
    cleanupInterval: 5 * 60 * 1000 // Очистка каждые 5 минут
});

// Пользовательские настройки (долгосрочное хранение)
export const settingsPersister = createStatePersister({
    storage: 'localStorage',
    prefix: 'app_settings_',
    ttl: 365 * 24 * 60 * 60 * 1000 // 1 год
});

export default StatePersister; 
 
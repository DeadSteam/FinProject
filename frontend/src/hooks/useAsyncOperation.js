import { useCallback, useRef, useEffect } from 'react';
import { useAsyncState } from './useAsyncState.js';
import { useRetry } from './useRetry.js';
import { useCache } from './useCache.js';

// LRU Cache implementation with TTL for async operations
class AsyncLRUCache {
  constructor(maxSize = 50, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.accessOrder = [];
  }

  set(key, value) {
    const now = Date.now();
    const entry = {
      value,
      timestamp: now,
      lastAccess: now
    };

    // Remove if already exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Check TTL
    if (now - entry.timestamp > this.ttl) {
      this.delete(key);
      return null;
    }

    // Update access order
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    entry.lastAccess = now;

    return entry.value;
  }

  delete(key) {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  evictLRU() {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
      }
    }
  }
}

// Global async operation cache
const asyncOperationCache = new AsyncLRUCache(50, 5 * 60 * 1000);

// Periodic cleanup of expired entries
setInterval(() => {
  asyncOperationCache.cleanup();
}, 60 * 1000); // Cleanup every minute

/**
 * useAsyncOperation - Универсальный хук для async операций
 * 
 * Заменяет дублирование в 15+ компонентах:
 * - Загрузка данных с loading/error состояниями
 * - Retry механизм с настраиваемыми попытками
 * - AbortController для отмены запросов
 * - Кэширование результатов с TTL и LRU
 * - Debounce для оптимизации
 * - Optimistic updates
 * 
 * @param {Function} operation - Async функция для выполнения
 * @param {Object} options - Опции конфигурации
 * @returns {Object} - Состояние и методы управления
 */
export const useAsyncOperation = (operation, options = {}) => {
  const {
    // Основные опции
    executeOnMount = false,
    initialData = null,
    dependencies = [],
    
    // Retry опции
    retryAttempts = 3,
    retryDelay = 1000,
    retryDelayMultiplier = 2,
    
    // Кэширование
    cacheKey = null,
    cacheTTL = 5 * 60 * 1000, // 5 минут
    enableCache = true,
    
    // Debounce
    debounceMs = 0,
    
    // Optimistic updates
    optimisticUpdate = null,
    rollbackOnError = true,
    
    // Callbacks
    onSuccess = null,
    onError = null,
    onFinish = null,
    
    // Transforms
    transform = null,
    errorTransform = null,
  } = options;

  const {
    state: { data, loading, error, lastExecuted, attempts },
    setData,
    setLoading,
    setError,
    setLastExecuted,
    setAttempts,
    reset
  } = useAsyncState(initialData);

  const cache = useCache();
  const retryFn = useRetry({ attempts: retryAttempts, delay: retryDelay });

  // Refs для управления
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const operationRef = useRef(operation);
  const optimisticDataRef = useRef(null);

  // Обновляем operation ref
  useEffect(() => {
    operationRef.current = operation;
  }, [operation]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Получение данных из кэша
   */
  const getCachedData = useCallback((key) => {
    if (!key || !enableCache) return null;
    
    return asyncOperationCache.get(key);
  }, [enableCache]);

  /**
   * Сохранение данных в кэш
   */
  const setCachedData = useCallback((key, data) => {
    if (!key || !enableCache) return;
    
    asyncOperationCache.set(key, data);
  }, [enableCache]);

  /**
   * Выполнение операции с retry логикой
   */
  const executeWithRetry = useCallback(async (args, currentAttempt = 1) => {
    try {
      // Создаем AbortController для отмены
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Выполняем операцию
      const result = await operationRef.current(...args, {
        signal: abortControllerRef.current.signal
      });

      if (!mountedRef.current) return;

      // Применяем transform если есть
      const transformedData = transform ? transform(result) : result;

      // Сохраняем в кэш
      if (cacheKey && enableCache) {
        setCachedData(cacheKey, transformedData);
      }

      // Обновляем состояние
      setData(transformedData);
      setError(null);
      setAttempts(currentAttempt);
      setLastExecuted(Date.now());

      // Callback успеха
      if (onSuccess) {
        onSuccess(transformedData, result);
      }

      return transformedData;

    } catch (err) {
      if (!mountedRef.current) return;

      // Проверяем, не отменена ли операция
      if (err.name === 'AbortError') {
        return;
      }

      // Откатываем optimistic update если нужно
      if (rollbackOnError && optimisticDataRef.current !== null) {
        setData(optimisticDataRef.current);
        optimisticDataRef.current = null;
      }

      // Трансформируем ошибку если нужно
      const transformedError = errorTransform ? errorTransform(err) : err;

      // Retry логика
      if (currentAttempt < retryAttempts) {
        setAttempts(currentAttempt);

        // Вычисляем задержку с экспоненциальным backoff
        const delay = retryDelay * Math.pow(retryDelayMultiplier, currentAttempt - 1);

        setTimeout(() => {
          if (mountedRef.current) {
            executeWithRetry(args, currentAttempt + 1);
          }
        }, delay);

        return;
      }

      // Исчерпаны попытки
      setError(transformedError);
      setAttempts(currentAttempt);

      // Callback ошибки
      if (onError) {
        onError(transformedError, currentAttempt);
      }

      throw transformedError;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        if (onFinish) {
          onFinish();
        }
      }
    }
  }, [
    cacheKey, setCachedData, transform, errorTransform, rollbackOnError,
    retryAttempts, retryDelay, retryDelayMultiplier, onSuccess, onError, onFinish,
    enableCache
  ]);

  /**
   * Основная функция выполнения
   */
  const execute = useCallback(async (...args) => {
    // Проверяем кэш
    if (cacheKey && !loading && enableCache) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setError(null);
        setLastExecuted(Date.now());
        return cachedData;
      }
    }

    // Очищаем предыдущий debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const executeOperation = async () => {
      if (!mountedRef.current) return;

      // Применяем optimistic update
      if (optimisticUpdate) {
        optimisticDataRef.current = data;
        const optimisticData = optimisticUpdate(data, args);
        setData(optimisticData);
      }

      setLoading(true);
      setError(null);

      return executeWithRetry(args);
    };

    // Debounce если настроен
    if (debounceMs > 0) {
      return new Promise((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          try {
            const result = await executeOperation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, debounceMs);
      });
    }

    return executeOperation();
  }, [
    cacheKey, getCachedData, loading, enableCache, debounceMs,
    data, optimisticUpdate, executeWithRetry
  ]);

  /**
   * Отмена текущей операции
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setLoading(false);
  }, []);

  /**
   * Сброс состояния
   */
  const resetState = reset;

  /**
   * Инвалидация кэша
   */
  const invalidateCache = useCallback(() => {
    if (cacheKey) asyncOperationCache.delete(cacheKey);
  }, [cacheKey]);

  /**
   * Очистка всего кэша
   */
  const clearCache = useCallback(() => {
    asyncOperationCache.clear();
  }, []);

  /**
   * Принудительное обновление (игнорируя кэш)
   */
  const refresh = useCallback((...args) => {
    if (cacheKey) {
      invalidateCache();
    }
    return execute(...args);
  }, [execute, cacheKey, invalidateCache]);

  // Автоматическое выполнение при монтировании — выполняем только один раз
  const executedOnMountRef = useRef(false);
  useEffect(() => {
    if (executeOnMount && !executedOnMountRef.current) {
      executedOnMountRef.current = true;
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeOnMount]);

  // Автоматическое выполнение при изменении зависимостей
  // Важный фикс: если массив dependencies пустой, передаём [] чтобы useEffect
  // не срабатывал на каждом рендере из-за новой ссылочной идентичности
  const effectDeps = dependencies && dependencies.length > 0 ? dependencies : [];
  useEffect(() => {
    if (dependencies && dependencies.length > 0) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, effectDeps);

  return {
    // Состояние
    data,
    loading,
    error,
    attempts,
    lastExecuted,
    
    // Методы
    execute,
    abort,
    reset: resetState,
    refresh,
    
    // Кэш управление
    invalidateCache,
    clearCache,
    
    // Computed values
    isSuccess: !loading && !error && data !== null,
    isFailed: !loading && error !== null,
    canRetry: !loading && attempts < retryAttempts,
    nextRetryDelay: attempts > 0 ? 
      retryDelay * Math.pow(retryDelayMultiplier, attempts - 1) : 
      retryDelay,
  };
} 
 
 
 
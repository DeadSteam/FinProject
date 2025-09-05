import { useCallback, useRef, useState } from 'react';

import { useAsyncOperation } from './useAsyncOperation.js';

/**
 * useApiMutation - Специализированный хук для мутаций (POST/PUT/DELETE)
 * 
 * Особенности:
 * - Optimistic updates для мгновенного UI отклика
 * - Автоматическая инвалидация связанного кэша
 * - Rollback при ошибках
 * - Queue для последовательных мутаций
 * - Toast уведомления
 * 
 * @param {Function} mutationFn - Функция мутации
 * @param {Object} options - Опции конфигурации
 * @returns {Object} - Методы и состояние мутации
 */
export const useApiMutation = (mutationFn, options = {}) => {
  const {
    // Optimistic updates
    onMutate = null, // Функция для optimistic update
    onSuccess = null,
    onError = null,
    onSettled = null,
    
    // Кэш инвалидация
    invalidateQueries = [],
    updateQueries = {},
    
    // Toast уведомления  
    successMessage = null,
    errorMessage = null,
    showToast = true,
    
    // Retry
    retry = 0,
    retryDelay = 1000,
    
    // Другие опции
    ...asyncOptions
  } = options;

  const contextRef = useRef(null);
  const queueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);

  // Основная мутация
  const asyncResult = useAsyncOperation(mutationFn, {
    executeOnMount: false,
    retryAttempts: retry,
    retryDelay,
    onSuccess: async (data, variables) => {
      // Инвалидируем кэш
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          // Здесь мы можем интегрироваться с глобальным query cache
          window.dispatchEvent(new CustomEvent('invalidateQuery', {
            detail: { queryKey }
          }));
        });
      }

      // Обновляем кэш напрямую
      Object.entries(updateQueries).forEach(([queryKey, updater]) => {
        window.dispatchEvent(new CustomEvent('updateQuery', {
          detail: { queryKey, updater, data, variables }
        }));
      });

      // Toast уведомление
      if (showToast && successMessage) {
        const message = typeof successMessage === 'function' ? 
          successMessage(data, variables) : successMessage;
        
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message, type: 'success' }
        }));
      }

      // Пользовательский callback
      if (onSuccess) {
        await onSuccess(data, variables, contextRef.current);
      }

      if (onSettled) {
        await onSettled(data, null, variables, contextRef.current);
      }
    },
    onError: async (error, variables) => {
      // Toast уведомление об ошибке
      if (showToast && errorMessage) {
        const message = typeof errorMessage === 'function' ? 
          errorMessage(error, variables) : errorMessage;
        
        window.dispatchEvent(new CustomEvent('showToast', {
          detail: { message, type: 'error' }
        }));
      }

      // Пользовательский callback
      if (onError) {
        await onError(error, variables, contextRef.current);
      }

      if (onSettled) {
        await onSettled(undefined, error, variables, contextRef.current);
      }
    },
    ...asyncOptions
  });

  // Основной метод мутации
  const mutate = useCallback(async (variables, mutateOptions = {}) => {
    const {
      onMutate: localOnMutate = onMutate,
      onSuccess: localOnSuccess = null,
      onError: localOnError = null,
      onSettled: localOnSettled = null,
    } = mutateOptions;

    try {
      // Выполняем optimistic update
      if (localOnMutate) {
        contextRef.current = await localOnMutate(variables);
      }

      // Выполняем мутацию
      const result = await asyncResult.execute(variables);

      // Локальные callbacks
      if (localOnSuccess) {
        await localOnSuccess(result, variables, contextRef.current);
      }
      if (localOnSettled) {
        await localOnSettled(result, null, variables, contextRef.current);
      }

      return result;
    } catch (error) {
      // Локальные callbacks
      if (localOnError) {
        await localOnError(error, variables, contextRef.current);
      }
      if (localOnSettled) {
        await localOnSettled(undefined, error, variables, contextRef.current);
      }

      throw error;
    } finally {
      contextRef.current = null;
    }
  }, [asyncResult, onMutate]);

  // Асинхронная мутация (не блокирует UI)
  const mutateAsync = useCallback(async (variables, mutateOptions = {}) => {
    return mutate(variables, mutateOptions);
  }, [mutate]);

  // Добавление в очередь
  const queueMutation = useCallback((variables, mutateOptions = {}) => {
    queueRef.current.push({ variables, mutateOptions });
    processQueue();
  }, []);

  // Обработка очереди
  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;

    while (queueRef.current.length > 0) {
      const { variables, mutateOptions } = queueRef.current.shift();
      
      try {
        await mutate(variables, mutateOptions);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Queued mutation failed:', error);
        }
        // Продолжаем обработку очереди даже при ошибках
      }
    }

    isProcessingQueueRef.current = false;
  }, [mutate]);

  // Очистка очереди
  const clearQueue = useCallback(() => {
    queueRef.current = [];
  }, []);

  // Сброс состояния
  const reset = useCallback(() => {
    asyncResult.reset();
    contextRef.current = null;
    clearQueue();
  }, [asyncResult, clearQueue]);

  return {
    // Данные
    data: asyncResult.data,
    error: asyncResult.error,
    
    // Состояния
    isLoading: asyncResult.loading,
    isSuccess: asyncResult.isSuccess,
    isError: asyncResult.isFailed,
    isPending: asyncResult.loading,
    
    // Методы мутации
    mutate,
    mutateAsync,
    queueMutation,
    
    // Управление
    reset,
    clearQueue,
    
    // Информация о состоянии
    status: asyncResult.loading ? 'loading' : 
           asyncResult.error ? 'error' : 
           asyncResult.data ? 'success' : 'idle',
    
    // Debugging
    failureCount: asyncResult.attempts,
    queueSize: queueRef.current.length,
    context: contextRef.current,
  };
};

/**
 * useBatchMutation - Хук для batch операций
 * 
 * @param {Function} mutationFn - Функция мутации
 * @param {Object} options - Опции + batch настройки
 * @returns {Object} - Методы для batch мутаций
 */
export const useBatchMutation = (mutationFn, options = {}) => {
  const {
    batchSize = 10,
    batchDelay = 100,
    ...mutationOptions
  } = options;

  const batchRef = useRef([]);
  const timeoutRef = useRef(null);

  const baseMutation = useApiMutation(mutationFn, mutationOptions);

  const addToBatch = useCallback((variables, mutateOptions = {}) => {
    batchRef.current.push({ variables, mutateOptions });

    // Сбрасываем таймер
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Если достигли размера батча, выполняем сразу
    if (batchRef.current.length >= batchSize) {
      processBatch();
      return;
    }

    // Иначе ждем задержку
    timeoutRef.current = setTimeout(processBatch, batchDelay);
  }, [batchSize, batchDelay]);

  const processBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;

    const batch = [...batchRef.current];
    batchRef.current = [];

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Выполняем все мутации параллельно
    const promises = batch.map(({ variables, mutateOptions }) =>
      baseMutation.mutateAsync(variables, mutateOptions).catch(error => ({ error }))
    );

    const results = await Promise.all(promises);
    
    return results;
  }, [baseMutation]);

  const flushBatch = useCallback(() => {
    return processBatch();
  }, [processBatch]);

  const clearBatch = useCallback(() => {
    batchRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    ...baseMutation,
    addToBatch,
    flushBatch,
    clearBatch,
    batchSize: batchRef.current.length,
  };
};

/**
 * useOptimisticUpdate - Хелпер для optimistic updates
 * 
 * @param {*} initialData - Начальные данные
 * @returns {Object} - Методы для optimistic updates
 */
export const useOptimisticUpdate = (initialData = null) => {
  const [optimisticData, setOptimisticData] = useState(initialData);
  const [actualData, setActualData] = useState(initialData);
  const rollbackRef = useRef(null);

  const applyOptimisticUpdate = useCallback((updater) => {
    rollbackRef.current = actualData;
    const newData = typeof updater === 'function' ? updater(actualData) : updater;
    setOptimisticData(newData);
    return rollbackRef.current;
  }, [actualData]);

  const commitUpdate = useCallback((data) => {
    setActualData(data);
    setOptimisticData(data);
    rollbackRef.current = null;
  }, []);

  const rollback = useCallback(() => {
    if (rollbackRef.current !== null) {
      setOptimisticData(rollbackRef.current);
      setActualData(rollbackRef.current);
      rollbackRef.current = null;
    }
  }, []);

  return {
    data: optimisticData,
    actualData,
    isOptimistic: rollbackRef.current !== null,
    applyOptimisticUpdate,
    commitUpdate,
    rollback,
  };
}; 
 
 
 
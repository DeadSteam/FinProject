import { useCallback, useMemo, useEffect, useState } from 'react';

import { useAsyncOperation } from './useAsyncOperation.js';

/**
 * useApiQuery - Специализированный хук для GET запросов с кэшированием
 * 
 * Особенности:
 * - Автоматическое кэширование по URL
 * - Query key для инвалидации
 * - Синхронизация между компонентами
 * - Background refetch
 * - Stale-while-revalidate стратегия
 * 
 * @param {Function|string} queryFn - Функция запроса или URL
 * @param {Object} options - Опции конфигурации
 * @returns {Object} - Данные и методы управления
 */
export function useApiQuery(queryFn, options = {}) {
  const {
    queryKey = null,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 минут
    cacheTime = 10 * 60 * 1000, // 10 минут
    refetchOnMount = true,
    refetchOnWindowFocus = true,
    refetchInterval = null,
    refetchIntervalInBackground = false,
    retry = 3,
    retryDelay = 1000,
    select = null, // Трансформация данных
    placeholderData = null,
    keepPreviousData = false,
    notifyOnChangeProps = ['data', 'error'], // Какие изменения приводят к ре-рендеру
    onSuccess,
    onError,
    onSettled,
    ...asyncOptions
  } = options;

  // Генерируем уникальный ключ кэша
  const cacheKey = useMemo(() => {
    if (queryKey) {
      return Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey);
    }
    
    if (typeof queryFn === 'string') {
      return `query:${queryFn}`;
    }
    
    if (queryFn.name) {
      return `query:${queryFn.name}`;
    }
    
    return 'query:default';
  }, [queryKey, queryFn]);

  // Оборачиваем query function
  const wrappedQueryFn = useCallback(async (...args) => {
    if (!enabled) {
      throw new Error('Query is disabled');
    }

    let result;
    if (typeof queryFn === 'string') {
      // Простой URL запрос
      const response = await fetch(queryFn, ...args);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      result = await response.json();
    } else {
      // Функция запроса
      result = await queryFn(...args);
    }

    // Применяем селектор если есть
    return select ? select(result) : result;
  }, [queryFn, enabled, select]);

  // Используем базовый useAsyncOperation с нашими опциями
  const asyncResult = useAsyncOperation(wrappedQueryFn, {
    executeOnMount: enabled && refetchOnMount,
    initialData: placeholderData,
    cacheKey,
    cacheTTL: cacheTime,
    retryAttempts: retry,
    retryDelay,
    onSuccess: (data) => {
      if (onSuccess) onSuccess(data);
      if (onSettled) onSettled(data, null);
    },
    onError: (error) => {
      if (onError) onError(error);
      if (onSettled) onSettled(undefined, error);
    },
    ...asyncOptions
  });

  // Background refetch при focus окна
  const handleWindowFocus = useCallback(() => {
    if (refetchOnWindowFocus && !asyncResult.loading && enabled) {
      // Проверяем staleness
      const isStale = asyncResult.lastExecuted && 
        (Date.now() - asyncResult.lastExecuted > staleTime);
      
      if (isStale) {
        asyncResult.refresh();
      }
    }
  }, [refetchOnWindowFocus, asyncResult, enabled, staleTime]);

  // Interval refetch
  const startRefetchInterval = useCallback(() => {
    if (!refetchInterval) return null;
    
    const shouldRefetch = refetchIntervalInBackground || document.visibilityState === 'visible';
    if (!shouldRefetch) return null;

    return setInterval(() => {
      if (enabled && !asyncResult.loading) {
        asyncResult.refresh();
      }
    }, refetchInterval);
  }, [refetchInterval, refetchIntervalInBackground, enabled, asyncResult]);

  // Эффекты для background refetch
  useEffect(() => {
    if (refetchOnWindowFocus) {
      window.addEventListener('focus', handleWindowFocus);
      return () => window.removeEventListener('focus', handleWindowFocus);
    }
  }, [refetchOnWindowFocus, handleWindowFocus]);

  useEffect(() => {
    const intervalId = startRefetchInterval();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [startRefetchInterval]);

  // Специализированные методы для Query
  const refetch = useCallback((options = {}) => {
    const { throwOnError = false } = options;
    
    const promise = asyncResult.refresh();
    
    if (!throwOnError) {
      return promise.catch(() => {});
    }
    
    return promise;
  }, [asyncResult]);

  const remove = useCallback(() => {
    asyncResult.invalidateCache();
    asyncResult.reset();
  }, [asyncResult]);

  // Computed values специфичные для Query
  const isStale = useMemo(() => {
    if (!asyncResult.lastExecuted || !staleTime) return false;
    return Date.now() - asyncResult.lastExecuted > staleTime;
  }, [asyncResult.lastExecuted, staleTime]);

  const isPlaceholderData = useMemo(() => {
    return asyncResult.data === placeholderData;
  }, [asyncResult.data, placeholderData]);

  const isFetching = asyncResult.loading;
  const isLoading = asyncResult.loading && !asyncResult.data;
  const isRefetching = asyncResult.loading && Boolean(asyncResult.data);

  return {
    // Данные
    data: asyncResult.data,
    error: asyncResult.error,
    
    // Состояния загрузки
    isLoading,
    isFetching,
    isRefetching,
    isSuccess: asyncResult.isSuccess,
    isError: asyncResult.isFailed,
    
    // Дополнительные состояния
    isStale,
    isPlaceholderData,
    
    // Методы
    refetch,
    remove,
    
    // Информация о статусе
    status: asyncResult.loading ? 'loading' : 
           asyncResult.error ? 'error' : 
           'success',
    
    fetchStatus: asyncResult.loading ? 'fetching' : 'idle',
    
    // Debugging info
    dataUpdatedAt: asyncResult.lastExecuted,
    errorUpdatedAt: asyncResult.error ? Date.now() : null,
    failureCount: asyncResult.attempts,
  };
}

/**
 * useInfiniteQuery - Хук для infinite scroll / пагинации
 * 
 * @param {Function} queryFn - Функция запроса с параметром pageParam
 * @param {Object} options - Опции + getNextPageParam
 * @returns {Object} - Данные с методами для пагинации
 */
export function useInfiniteQuery(queryFn, options = {}) {
  const {
    getNextPageParam = (lastPage, pages) => lastPage.nextCursor,
    getPreviousPageParam = null,
    ...queryOptions
  } = options;

  const [pages, setPages] = useState([]);
  const [pageParams, setPageParams] = useState([undefined]);

  const wrappedQueryFn = useCallback(async (pageParam) => {
    const result = await queryFn({ pageParam });
    return result;
  }, [queryFn]);

  const baseQuery = useApiQuery(wrappedQueryFn, {
    ...queryOptions,
    executeOnMount: false,
    onSuccess: (data) => {
      setPages(prev => [...prev, data]);
      
      const nextPageParam = getNextPageParam(data, [...pages, data]);
      if (nextPageParam !== undefined) {
        setPageParams(prev => [...prev, nextPageParam]);
      }
      
      if (options.onSuccess) {
        options.onSuccess({ pages: [...pages, data], pageParams });
      }
    }
  });

  const fetchNextPage = useCallback(async () => {
    const nextPageParam = pageParams[pageParams.length - 1];
    if (nextPageParam === undefined) return;
    
    return baseQuery.execute(nextPageParam);
  }, [baseQuery, pageParams]);

  const hasNextPage = useMemo(() => {
    if (pages.length === 0) return true;
    const lastPage = pages[pages.length - 1];
    return getNextPageParam(lastPage, pages) !== undefined;
  }, [pages, getNextPageParam]);

  useEffect(() => {
    if (options.executeOnMount !== false) {
      fetchNextPage();
    }
  }, []);

  return {
    ...baseQuery,
    data: { pages, pageParams },
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage: baseQuery.loading && pages.length > 0,
  };
} 
 
 
 
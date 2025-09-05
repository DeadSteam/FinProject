import { useState, useCallback, useMemo, useEffect } from 'react';

import { useApiQuery } from './useApiQuery.js';

/**
 * usePagination - Универсальный хук для пагинации
 * 
 * Поддерживает различные стратегии:
 * - Offset-based пагинация (page/limit)
 * - Cursor-based пагинация (cursor/limit)
 * - Infinite scroll
 * - Search с пагинацией
 * 
 * @param {Function} queryFn - Функция запроса данных
 * @param {Object} options - Опции пагинации
 * @returns {Object} - Данные и методы пагинации
 */
export function usePagination(queryFn, options = {}) {
  const {
    // Основные параметры
    initialPage = 1,
    pageSize = 10,
    
    // Стратегия пагинации
    strategy = 'offset', // 'offset', 'cursor', 'infinite'
    
    // Параметры для API
    pageParam = 'page',
    sizeParam = 'limit',
    cursorParam = 'cursor',
    
    // Опции
    enabled = true,
    keepPreviousData = true,
    
    // Search
    searchParam = 'search',
    initialSearch = '',
    searchDebounce = 300,
    
    // Infinite scroll
    hasNextPageKey = 'hasNextPage',
    nextCursorKey = 'nextCursor',
    dataKey = 'data',
    
    // Callbacks
    onPageChange = null,
    onSearch = null,
    
    // Query опции
    ...queryOptions
  } = options;

  // Состояние
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearch);
  const [allData, setAllData] = useState([]); // Для infinite scroll
  const [cursors, setCursors] = useState([null]); // Для cursor-based

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, searchDebounce);

    return () => clearTimeout(timer);
  }, [searchTerm, searchDebounce]);

  // Генерируем параметры запроса
  const queryParams = useMemo(() => {
    const params = {};
    
    // Размер страницы
    params[sizeParam] = pageSize;
    
    // Стратегия пагинации
    switch (strategy) {
      case 'offset':
        params[pageParam] = currentPage;
        break;
      case 'cursor':
        const cursor = cursors[currentPage - 1];
        if (cursor) {
          params[cursorParam] = cursor;
        }
        break;
      case 'infinite':
        // Для infinite scroll используем cursor от последней страницы
        const lastCursor = cursors[cursors.length - 1];
        if (lastCursor) {
          params[cursorParam] = lastCursor;
        }
        break;
    }
    
    // Поиск
    if (debouncedSearchTerm) {
      params[searchParam] = debouncedSearchTerm;
    }
    
    return params;
  }, [
    strategy, currentPage, pageSize, debouncedSearchTerm,
    pageParam, sizeParam, cursorParam, searchParam, cursors
  ]);

  // Уникальный ключ для кэширования
  const queryKey = useMemo(() => [
    'pagination',
    strategy,
    queryParams,
    queryFn.name || 'anonymous'
  ], [strategy, queryParams, queryFn.name]);

  // Основной запрос
  const query = useApiQuery(
    () => queryFn(queryParams),
    {
      queryKey,
      enabled,
      keepPreviousData: strategy !== 'infinite' && keepPreviousData,
      ...queryOptions
    }
  );

  // Обработка результатов для infinite scroll
  useEffect(() => {
    if (strategy === 'infinite' && query.data) {
      const newData = query.data[dataKey] || query.data;
      
      if (currentPage === 1) {
        setAllData(newData);
      } else {
        setAllData(prev => [...prev, ...newData]);
      }
      
      // Обновляем cursors для следующей страницы
      const nextCursor = query.data[nextCursorKey];
      if (nextCursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          newCursors[currentPage] = nextCursor;
          return newCursors;
        });
      }
    }
  }, [strategy, query.data, currentPage, dataKey, nextCursorKey]);

  // Методы навигации
  const goToPage = useCallback((page) => {
    if (page >= 1) {
      setCurrentPage(page);
      if (onPageChange) {
        onPageChange(page);
      }
    }
  }, [onPageChange]);

  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const goToLastPage = useCallback((totalPages) => {
    if (totalPages > 0) {
      goToPage(totalPages);
    }
  }, [goToPage]);

  const goToNextPage = useCallback(() => {
    const hasNext = strategy === 'infinite' ? 
      query.data?.[hasNextPageKey] !== false :
      true; // Для offset/cursor проверяем есть ли данные
    
    if (hasNext) {
      goToPage(currentPage + 1);
    }
  }, [goToPage, currentPage, strategy, query.data, hasNextPageKey]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [goToPage, currentPage]);

  // Поиск
  const search = useCallback((term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Сбрасываем на первую страницу
    
    if (strategy === 'infinite') {
      setAllData([]); // Очищаем данные для infinite scroll
      setCursors([null]); // Сбрасываем cursors
    }
    
    if (onSearch) {
      onSearch(term);
    }
  }, [strategy, onSearch]);

  const clearSearch = useCallback(() => {
    search('');
  }, [search]);

  // Сброс пагинации
  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setSearchTerm(initialSearch);
    setDebouncedSearchTerm(initialSearch);
    setAllData([]);
    setCursors([null]);
  }, [initialPage, initialSearch]);

  // Загрузка следующей страницы для infinite scroll
  const loadMore = useCallback(() => {
    if (strategy === 'infinite' && !query.isLoading) {
      const hasNext = query.data?.[hasNextPageKey] !== false;
      if (hasNext) {
        goToNextPage();
      }
    }
  }, [strategy, query.isLoading, query.data, hasNextPageKey, goToNextPage]);

  // Computed values
  const data = useMemo(() => {
    if (strategy === 'infinite') {
      return allData;
    }
    return query.data?.[dataKey] || query.data || [];
  }, [strategy, allData, query.data, dataKey]);

  const totalCount = useMemo(() => {
    return query.data?.total || query.data?.totalCount || 0;
  }, [query.data]);

  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pageSize);
  }, [totalCount, pageSize]);

  const hasNextPage = useMemo(() => {
    switch (strategy) {
      case 'infinite':
        return query.data?.[hasNextPageKey] !== false;
      case 'cursor':
        return Boolean(query.data?.[nextCursorKey]);
      case 'offset':
      default:
        return currentPage < totalPages;
    }
  }, [strategy, currentPage, totalPages, query.data, hasNextPageKey, nextCursorKey]);

  const hasPreviousPage = currentPage > 1;

  const pageInfo = useMemo(() => {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalCount);
    
    return {
      start,
      end,
      total: totalCount,
      page: currentPage,
      pages: totalPages,
      size: pageSize,
      isEmpty: data.length === 0,
      isFirst: currentPage === 1,
      isLast: currentPage === totalPages || !hasNextPage,
    };
  }, [currentPage, pageSize, totalCount, totalPages, data.length, hasNextPage]);

  return {
    // Данные
    data,
    totalCount,
    totalPages,
    pageInfo,
    
    // Состояние поиска
    searchTerm,
    debouncedSearchTerm,
    
    // Состояние пагинации
    currentPage,
    hasNextPage,
    hasPreviousPage,
    
    // Состояния загрузки
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    
    // Методы навигации
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    
    // Поиск
    search,
    clearSearch,
    
    // Infinite scroll
    loadMore,
    
    // Утилиты
    reset,
    refetch: query.refetch,
    
    // Debugging
    queryParams,
    strategy,
  };
}

/**
 * useSimplePagination - Упрощенная версия для простых случаев
 * 
 * @param {Array} data - Массив данных для пагинации
 * @param {number} pageSize - Размер страницы
 * @returns {Object} - Методы пагинации
 */
export function useSimplePagination(data = [], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    data: currentData,
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    reset,
    isEmpty: data.length === 0,
    pageInfo: {
      start: (currentPage - 1) * pageSize + 1,
      end: Math.min(currentPage * pageSize, data.length),
      total: data.length,
      page: currentPage,
      pages: totalPages,
      size: pageSize,
    }
  };
}

/**
 * usePaginationControls - UI компоненты для пагинации
 * 
 * @param {Object} pagination - Результат usePagination
 * @param {Object} options - Опции UI
 * @returns {Object} - React компоненты
 */
export function usePaginationControls(pagination, options = {}) {
  const {
    maxVisiblePages = 5,
    showEdges = true,
    showInfo = true,
    labels = {
      previous: '‹ Назад',
      next: 'Вперед ›',
      first: '« Первая',
      last: 'Последняя »',
      info: 'Показано {start}-{end} из {total}',
      empty: 'Нет данных'
    }
  } = options;

  const visiblePages = useMemo(() => {
    const { currentPage, totalPages } = pagination;
    const pages = [];
    
    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    // Корректируем start если end упирается в границу
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }, [pagination.currentPage, pagination.totalPages, maxVisiblePages]);

  const infoText = useMemo(() => {
    if (pagination.pageInfo.isEmpty) {
      return labels.empty;
    }
    
    return labels.info
      .replace('{start}', pagination.pageInfo.start)
      .replace('{end}', pagination.pageInfo.end)
      .replace('{total}', pagination.pageInfo.total);
  }, [pagination.pageInfo, labels]);

  return {
    visiblePages,
    infoText,
    showFirstButton: showEdges && pagination.currentPage > Math.ceil(maxVisiblePages / 2),
    showLastButton: showEdges && pagination.currentPage < pagination.totalPages - Math.floor(maxVisiblePages / 2),
    labels,
  };
} 
 
 
 
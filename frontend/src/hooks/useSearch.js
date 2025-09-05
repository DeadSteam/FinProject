import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

/**
 * useSearch - Универсальный хук для поиска и фильтрации данных
 * 
 * Особенности:
 * - Поиск по множественным полям
 * - Дебаунс для оптимизации
 * - Фильтры по типам (string, number, date, boolean)
 * - История поиска
 * - Подсветка результатов
 * - Сортировка результатов
 * 
 * @param {Array} data - Данные для поиска
 * @param {Object} options - Опции конфигурации
 * @returns {Object} - Результаты поиска и методы управления
 */
export const useSearch = (data = [], options = {}) => {
  const {
    // Поиск
    searchFields = [], // Поля для поиска ['name', 'description']
    searchTerm: initialSearchTerm = '',
    debounceMs = 300,
    caseSensitive = false,
    fuzzySearch = false,
    highlightMatches = false,
    
    // Фильтры
    filters = {}, // { status: 'active', category: ['tech', 'design'] }
    
    // Сортировка
    sortBy = null, // 'name' или { field: 'name', direction: 'asc' }
    sortDirection = 'asc',
    
    // История
    enableHistory = false,
    maxHistoryItems = 10,
    
    // Callbacks
    onSearchChange = null,
    onFilterChange = null,
    onSortChange = null,
    
    // Специальные опции
    minSearchLength = 0,
    maxResults = null,
    searchOnMount = false,
  } = options;

  // Состояние
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);
  const [activeFilters, setActiveFilters] = useState(filters);
  const [currentSort, setCurrentSort] = useState({
    field: typeof sortBy === 'string' ? sortBy : sortBy?.field || null,
    direction: typeof sortBy === 'string' ? sortDirection : sortBy?.direction || sortDirection
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Refs
  const debounceTimerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Debounce поиска
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, debounceMs]);

  // Функция поиска
  const searchFunction = useCallback((item, term) => {
    if (!term || term.length < minSearchLength) return true;

    const searchValue = caseSensitive ? term : term.toLowerCase();
    
    // Если поля не указаны, ищем по всем строковым полям
    const fieldsToSearch = searchFields.length > 0 ? 
      searchFields : 
      Object.keys(item).filter(key => typeof item[key] === 'string');

    return fieldsToSearch.some(field => {
      const fieldValue = getNestedValue(item, field);
      if (fieldValue == null) return false;

      const stringValue = String(fieldValue);
      const targetValue = caseSensitive ? stringValue : stringValue.toLowerCase();

      if (fuzzySearch) {
        return fuzzyMatch(targetValue, searchValue);
      }

      return targetValue.includes(searchValue);
    });
  }, [searchFields, caseSensitive, fuzzySearch, minSearchLength]);

  // Функция фильтрации
  const filterFunction = useCallback((item) => {
    return Object.entries(activeFilters).every(([field, filterValue]) => {
      if (filterValue == null || filterValue === '' || 
          (Array.isArray(filterValue) && filterValue.length === 0)) {
        return true;
      }

      const itemValue = getNestedValue(item, field);

      if (Array.isArray(filterValue)) {
        return filterValue.includes(itemValue);
      }

      if (typeof filterValue === 'object' && filterValue.min != null && filterValue.max != null) {
        // Диапазон значений
        return itemValue >= filterValue.min && itemValue <= filterValue.max;
      }

      if (typeof filterValue === 'function') {
        return filterValue(itemValue, item);
      }

      return itemValue === filterValue;
    });
  }, [activeFilters]);

  // Функция сортировки
  const sortFunction = useCallback((a, b) => {
    if (!currentSort.field) return 0;

    const aValue = getNestedValue(a, currentSort.field);
    const bValue = getNestedValue(b, currentSort.field);

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    let comparison = 0;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }

    return currentSort.direction === 'desc' ? -comparison : comparison;
  }, [currentSort]);

  // Основная обработка данных
  const processedData = useMemo(() => {
    let result = [...data];

    // Фильтрация
    result = result.filter(filterFunction);

    // Поиск
    if (debouncedSearchTerm && debouncedSearchTerm.length >= minSearchLength) {
      result = result.filter(item => searchFunction(item, debouncedSearchTerm));
    }

    // Сортировка
    if (currentSort.field) {
      result.sort(sortFunction);
    }

    // Ограничение результатов
    if (maxResults && result.length > maxResults) {
      result = result.slice(0, maxResults);
    }

    return result;
  }, [data, filterFunction, searchFunction, debouncedSearchTerm, sortFunction, currentSort, minSearchLength, maxResults]);

  // Подсветка совпадений
  const highlightedData = useMemo(() => {
    if (!highlightMatches || !debouncedSearchTerm || debouncedSearchTerm.length < minSearchLength) {
      return processedData;
    }

    return processedData.map(item => {
      const highlighted = { ...item };
      const searchValue = caseSensitive ? debouncedSearchTerm : debouncedSearchTerm.toLowerCase();

      searchFields.forEach(field => {
        const fieldValue = getNestedValue(item, field);
        if (fieldValue && typeof fieldValue === 'string') {
          const targetValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
          const regex = new RegExp(`(${escapeRegExp(searchValue)})`, caseSensitive ? 'g' : 'gi');
          
          setNestedValue(highlighted, field, fieldValue.replace(regex, '<mark>$1</mark>'));
        }
      });

      return highlighted;
    });
  }, [processedData, highlightMatches, debouncedSearchTerm, searchFields, caseSensitive, minSearchLength]);

  // Методы поиска
  const search = useCallback((term) => {
    setSearchTerm(term);
    
    // Добавляем в историю
    if (enableHistory && term && term.length >= minSearchLength) {
      setSearchHistory(prev => {
        const filtered = prev.filter(item => item !== term);
        const newHistory = [term, ...filtered].slice(0, maxHistoryItems);
        return newHistory;
      });
    }

    if (onSearchChange) {
      onSearchChange(term);
    }
  }, [enableHistory, minSearchLength, maxHistoryItems, onSearchChange]);

  const clearSearch = useCallback(() => {
    search('');
  }, [search]);

  // Методы фильтрации
  const setFilter = useCallback((field, value) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      
      if (onFilterChange) {
        onFilterChange(field, value, newFilters);
      }
      
      return newFilters;
    });
  }, [onFilterChange]);

  const removeFilter = useCallback((field) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      
      if (onFilterChange) {
        onFilterChange(field, null, newFilters);
      }
      
      return newFilters;
    });
  }, [onFilterChange]);

  const clearFilters = useCallback(() => {
    setActiveFilters({});
    
    if (onFilterChange) {
      onFilterChange(null, null, {});
    }
  }, [onFilterChange]);

  // Методы сортировки
  const setSortBy = useCallback((field, direction = 'asc') => {
    const newSort = { field, direction };
    setCurrentSort(newSort);
    
    if (onSortChange) {
      onSortChange(field, direction);
    }
  }, [onSortChange]);

  const toggleSort = useCallback((field) => {
    const newDirection = currentSort.field === field && currentSort.direction === 'asc' ? 'desc' : 'asc';
    setSortBy(field, newDirection);
  }, [currentSort, setSortBy]);

  const clearSort = useCallback(() => {
    setCurrentSort({ field: null, direction: 'asc' });
    
    if (onSortChange) {
      onSortChange(null, 'asc');
    }
  }, [onSortChange]);

  // Утилиты
  const reset = useCallback(() => {
    setSearchTerm(initialSearchTerm);
    setDebouncedSearchTerm(initialSearchTerm);
    setActiveFilters(filters);
    setCurrentSort({
      field: typeof sortBy === 'string' ? sortBy : sortBy?.field || null,
      direction: typeof sortBy === 'string' ? sortDirection : sortBy?.direction || sortDirection
    });
  }, [initialSearchTerm, filters, sortBy, sortDirection]);

  const focusSearchInput = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Поиск при монтировании
  useEffect(() => {
    if (searchOnMount && initialSearchTerm) {
      search(initialSearchTerm);
    }
  }, [searchOnMount, initialSearchTerm, search]);

  // Статистика
  const stats = useMemo(() => {
    const total = data.length;
    const filtered = processedData.length;
    const hasActiveSearch = debouncedSearchTerm && debouncedSearchTerm.length >= minSearchLength;
    const hasActiveFilters = Object.keys(activeFilters).some(key => 
      activeFilters[key] != null && activeFilters[key] !== '' && 
      (!Array.isArray(activeFilters[key]) || activeFilters[key].length > 0)
    );

    return {
      total,
      filtered,
      hasActiveSearch,
      hasActiveFilters,
      hasResults: filtered > 0,
      isEmpty: total === 0,
      isFiltered: hasActiveSearch || hasActiveFilters,
      percentage: total > 0 ? Math.round((filtered / total) * 100) : 0,
    };
  }, [data.length, processedData.length, debouncedSearchTerm, activeFilters, minSearchLength]);

  return {
    // Данные
    data: highlightedData,
    originalData: data,
    
    // Состояние поиска
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    
    // Состояние фильтрации
    activeFilters,
    
    // Состояние сортировки
    currentSort,
    
    // История
    searchHistory,
    
    // Методы поиска
    search,
    clearSearch,
    
    // Методы фильтрации
    setFilter,
    removeFilter,
    clearFilters,
    
    // Методы сортировки
    setSortBy,
    toggleSort,
    clearSort,
    
    // Утилиты
    reset,
    focusSearchInput,
    searchInputRef,
    
    // Статистика
    stats,
    
    // Конфигурация
    config: {
      searchFields,
      debounceMs,
      caseSensitive,
      fuzzySearch,
      highlightMatches,
      minSearchLength,
      maxResults,
    }
  };
};

/**
 * useQuickSearch - Упрощенная версия для быстрого поиска
 * 
 * @param {Array} data - Данные для поиска
 * @param {string|Array} searchFields - Поля для поиска
 * @param {Object} options - Опции
 * @returns {Object} - Результаты поиска
 */
export const useQuickSearch = (data = [], searchFields = [], options = {}) => {
  const {
    debounceMs = 300,
    caseSensitive = false,
    minLength = 1,
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), debounceMs);
    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const results = useMemo(() => {
    if (!debouncedTerm || debouncedTerm.length < minLength) {
      return data;
    }

    const searchValue = caseSensitive ? debouncedTerm : debouncedTerm.toLowerCase();
    const fields = Array.isArray(searchFields) ? searchFields : [searchFields];

    return data.filter(item => {
      return fields.some(field => {
        const value = getNestedValue(item, field);
        if (!value) return false;
        
        const stringValue = caseSensitive ? String(value) : String(value).toLowerCase();
        return stringValue.includes(searchValue);
      });
    });
  }, [data, debouncedTerm, searchFields, caseSensitive, minLength]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    isSearching: searchTerm !== debouncedTerm,
    hasResults: results.length > 0,
    count: results.length,
  };
};

// Утилиты

/**
 * Получение вложенного значения по пути
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

/**
 * Установка вложенного значения по пути
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  
  target[lastKey] = value;
}

/**
 * Экранирование символов для регексов
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fuzzy matching алгоритм
 */
function fuzzyMatch(text, pattern) {
  const textLen = text.length;
  const patternLen = pattern.length;
  
  if (patternLen === 0) return true;
  if (textLen === 0) return false;

  let textIndex = 0;
  let patternIndex = 0;

  while (textIndex < textLen && patternIndex < patternLen) {
    if (text[textIndex] === pattern[patternIndex]) {
      patternIndex++;
    }
    textIndex++;
  }

  return patternIndex === patternLen;
} 
 
 
 
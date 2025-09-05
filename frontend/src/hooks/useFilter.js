import { useState, useMemo, useCallback } from 'react';

/**
 * Универсальный хук для фильтрации и поиска
 * Заменяет повторяющуюся логику фильтрации в AdminUsers, AdminCategories, AdminShops, AdminMetrics и др.
 */
export const useFilter = (items = [], filterConfig = {}, options = {}) => {
  const {
    searchFields = ['name'],
    caseSensitive = false
  } = options;

  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  const applySearchFilter = useCallback((item, term) => {
    if (!term) return true;

    const searchValue = caseSensitive ? term : term.toLowerCase();
    
    return searchFields.some(field => {
      const fieldValue = getNestedValue(item, field);
      if (fieldValue == null) return false;
      
      const stringValue = String(fieldValue);
      const compareValue = caseSensitive ? stringValue : stringValue.toLowerCase();
      
      return compareValue.includes(searchValue);
    });
  }, [searchFields, caseSensitive]);

  const applyCustomFilters = useCallback((item) => {
    return Object.entries(filters).every(([filterKey, filterValue]) => {
      if (filterValue === '' || filterValue === 'all' || filterValue == null) {
        return true;
      }

      const config = filterConfig[filterKey];
      if (!config) return true;

      if (typeof config === 'function') {
        return config(item, filterValue);
      }

      if (typeof config === 'object') {
        const { field, filter, transform } = config;
        
        let itemValue = getNestedValue(item, field);
        let compareValue = filterValue;

        if (transform && typeof transform === 'function') {
          itemValue = transform(itemValue);
          compareValue = transform(filterValue);
        }

        if (filter) {
          return filter(itemValue, compareValue);
        }

        return itemValue === compareValue;
      }

      if (typeof config === 'string') {
        const itemValue = getNestedValue(item, config);
        return itemValue === filterValue;
      }

      return true;
    });
  }, [filters, filterConfig]);

  const applySorting = useCallback((a, b) => {
    if (!sortConfig.field) return 0;

    const aValue = getNestedValue(a, sortConfig.field);
    const bValue = getNestedValue(b, sortConfig.field);

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

    return sortConfig.direction === 'desc' ? -comparison : comparison;
  }, [sortConfig]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchTerm) {
      result = result.filter(item => applySearchFilter(item, searchTerm));
    }

    result = result.filter(applyCustomFilters);

    if (sortConfig.field) {
      result.sort(applySorting);
    }

    return result;
  }, [items, searchTerm, filters, sortConfig, applySearchFilter, applyCustomFilters, applySorting]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
  }, []);

  const setSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const setSort = useCallback((field, direction = 'asc') => {
    setSortConfig({ field, direction });
  }, []);

  const toggleSort = useCallback((field) => {
    setSortConfig(prev => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { field, direction: 'asc' };
    });
  }, []);

  return {
    filteredItems,
    filters,
    searchTerm,
    sortConfig,
    setFilter,
    setFilters,
    clearFilters,
    setSearch,
    setSort,
    toggleSort
  };
}

function getNestedValue(obj, path) {
  if (!obj || !path) return null;
  
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

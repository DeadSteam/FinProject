import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

import { useContextTracker, createContextProfiler } from '../utils/performance.js';

import { useToast } from './ToastContext';

// Типы действий для данных
const DATA_ACTIONS = {
  SET_CATEGORIES: 'SET_CATEGORIES',
  SET_STORES: 'SET_STORES',
  SET_BUDGET_DATA: 'SET_BUDGET_DATA',
  SET_SELECTED_CATEGORY: 'SET_SELECTED_CATEGORY',
  SET_SELECTED_STORE: 'SET_SELECTED_STORE',
  RESET_SELECTION: 'RESET_SELECTION',
  UPDATE_STATS: 'UPDATE_STATS',
  SET_DATA: 'SET_DATA',
  UPDATE_DATA: 'UPDATE_DATA',
  CLEAR_DATA: 'CLEAR_DATA',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
};

// Начальное состояние данных
const initialState = {
  categories: [],
  stores: [],
  budgetData: {
    plan: 0,
    fact: 0,
    percentage: 0,
  },
  selectedCategory: null,
  selectedStore: null,
  stats: {
    categoriesCount: 0,
    storesCount: 0,
    expensePercentage: 0,
  },
  data: {},
  loading: {},
  errors: {},
};

// Редьюсер для управления данными
function dataReducer(state, action) {
  switch (action.type) {
    case DATA_ACTIONS.SET_CATEGORIES:
      return {
        ...state,
        categories: action.payload,
        stats: {
          ...state.stats,
          categoriesCount: action.payload.length,
        },
      };
      
    case DATA_ACTIONS.SET_STORES:
      return {
        ...state,
        stores: action.payload,
        stats: {
          ...state.stats,
          storesCount: action.payload.length,
        },
      };
      
    case DATA_ACTIONS.SET_BUDGET_DATA:
      return {
        ...state,
        budgetData: action.payload,
        stats: {
          ...state.stats,
          expensePercentage: action.payload.plan > 0 
            ? Math.round((action.payload.fact / action.payload.plan) * 100)
            : 0,
        },
      };
      
    case DATA_ACTIONS.SET_SELECTED_CATEGORY:
      return {
        ...state,
        selectedCategory: action.payload,
        selectedStore: null, // Сбрасываем выбранный магазин при смене категории
      };
      
    case DATA_ACTIONS.SET_SELECTED_STORE:
      return {
        ...state,
        selectedStore: action.payload,
      };
      
    case DATA_ACTIONS.RESET_SELECTION:
      return {
        ...state,
        selectedCategory: null,
        selectedStore: null,
      };
      
    case DATA_ACTIONS.UPDATE_STATS:
      return {
        ...state,
        stats: {
          ...state.stats,
          ...action.payload,
        },
      };
      
    case DATA_ACTIONS.SET_DATA:
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.key]: {
            data: action.payload.data,
            timestamp: Date.now()
          }
        },
      };
      
    case DATA_ACTIONS.UPDATE_DATA:
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.key]: {
            ...state.data[action.payload.key],
            data: action.payload.updates(state.data[action.payload.key].data)
          }
        },
      };
      
    case DATA_ACTIONS.CLEAR_DATA:
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload || null]: undefined
        },
      };
      
    case DATA_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.loading
        },
      };
      
    case DATA_ACTIONS.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        },
      };
      
    default:
      return state;
  }
}

// Создаем контекст
const DataContext = createContext();

// Профайлер для Context (только в development)
const DataProfiler = createContextProfiler('DataContext');

// Провайдер контекста данных
export const DataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const { showToast } = useToast();

  // Действия для управления данными
  const setData = useCallback((key, data) => {
    dispatch({
      type: DATA_ACTIONS.SET_DATA,
      payload: { key, data }
    });
  }, []);

  const updateData = useCallback((key, updates) => {
    dispatch({
      type: DATA_ACTIONS.UPDATE_DATA,
      payload: { key, updates }
    });
  }, []);

  const clearData = useCallback((key = null) => {
    dispatch({
      type: DATA_ACTIONS.CLEAR_DATA,
      payload: key
    });
  }, []);

  const setLoading = useCallback((key, loading) => {
    dispatch({
      type: DATA_ACTIONS.SET_LOADING,
      payload: { key, loading }
    });
  }, []);

  const setError = useCallback((key, error) => {
    dispatch({
      type: DATA_ACTIONS.SET_ERROR,
      payload: { key, error }
    });
  }, []);

  // Универсальная функция для загрузки данных
  const loadData = useCallback(async (key, loadFn, options = {}) => {
    const { showProgress = true, cacheTime = 0 } = options;
    
    try {
      if (showProgress) {
        setLoading(key, true);
      }
      setError(key, null);

      // Проверяем кэш
      const cachedData = state.data[key];
      if (cachedData && cacheTime > 0) {
        const age = Date.now() - (cachedData.timestamp || 0);
        if (age < cacheTime) {
          return cachedData.data;
        }
      }

      const result = await loadFn();
      
      setData(key, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      setError(key, error.message);
      
      if (showProgress && showToast) {
        showToast(`Ошибка загрузки ${key}: ${error.message}`, 'error');
      }
      
      throw error;
    } finally {
      if (showProgress) {
        setLoading(key, false);
      }
    }
  }, [state.data, setData, setLoading, setError, showToast]);

  const value = {
    // Состояние
    data: state.data,
    loading: state.loading,
    errors: state.errors,
    
    // Действия
    setData,
    updateData,
    clearData,
    setLoading,
    setError,
    loadData,
    
    // Вспомогательные функции
    getData: (key) => state.data[key]?.data || null,
    isLoading: (key) => Boolean(state.loading[key]),
    getError: (key) => state.errors[key] || null,
    hasData: (key) => Boolean(state.data[key]?.data),
  };

  return (
    <DataProfiler>
      <DataContext.Provider value={value}>
        {children}
      </DataContext.Provider>
    </DataProfiler>
  );
};

// Основной хук для работы с данными
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

/**
 * Селективные хуки для оптимизации производительности
 */

// Хук только для выбранных элементов
export const useDataSelection = () => {
  const { selectedCategory, selectedStore, setSelectedCategory, setSelectedStore, resetSelection } = useData();
  return {
    selectedCategory,
    selectedStore,
    setSelectedCategory,
    setSelectedStore,
    resetSelection,
  };
};

// Хук только для статистики
export const useDataStats = () => {
  const { stats, updateStats, getBudgetStatus } = useData();
  return { stats, updateStats, getBudgetStatus };
};

// Хук только для бюджетных данных
export const useBudgetData = () => {
  const { budgetData, setBudgetData, getTotalBudget, getBudgetStatus } = useData();
  return {
    budgetData,
    setBudgetData,
    totalBudget: getTotalBudget(),
    status: getBudgetStatus(),
  };
};

// Хук для категорий
export const useCategories = () => {
  const { categories, setCategories, selectedCategory, setSelectedCategory } = useData();
  return {
    categories,
    setCategories,
    selectedCategory,
    setSelectedCategory,
    count: categories.length,
  };
};

// Хук для магазинов с учетом фильтрации
export const useStores = () => {
  const { stores, setStores, selectedStore, setSelectedStore, getFilteredStores } = useData();
  return {
    allStores: stores,
    filteredStores: getFilteredStores(),
    setStores,
    selectedStore,
    setSelectedStore,
    count: stores.length,
  };
};

export { DataContext };

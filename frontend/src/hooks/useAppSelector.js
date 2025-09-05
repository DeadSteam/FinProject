import { useMemo, useRef } from 'react';

import { useAppState } from '../context/AppStateContext';

/**
 * Функция поверхностного сравнения объектов
 */
function shallowEqual(obj1, obj2) {
    if (obj1 === obj2) {
        return true;
    }
    
    if (obj1 == null || obj2 == null) {
        return obj1 === obj2;
    }
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        return obj1 === obj2;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) {
        return false;
    }
    
    for (const key of keys1) {
        if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key]) {
            return false;
        }
    }
    
    return true;
}

/**
 * Универсальный хук для селективного извлечения данных из глобального состояния
 * 
 * @param {Function} selector - Функция селектор для извлечения данных
 * @param {Function} equalityFn - Функция сравнения (по умолчанию shallowEqual)
 * @returns {*} Выбранные данные из состояния
 */
export function useAppSelector(selector, equalityFn = shallowEqual) {
    const state = useAppState();
    const lastSelectorRef = useRef();
    const lastResultRef = useRef();
    
    return useMemo(() => {
        // Если селектор не изменился и результат равен предыдущему, возвращаем кэш
        if (lastSelectorRef.current === selector) {
            const newResult = selector(state);
            if (equalityFn(lastResultRef.current, newResult)) {
                return lastResultRef.current;
            }
            lastResultRef.current = newResult;
            return newResult;
        }
        
        // Новый селектор или первый вызов
        lastSelectorRef.current = selector;
        const result = selector(state);
        lastResultRef.current = result;
        return result;
    }, [state, selector, equalityFn]);
}

/**
 * Предопределенные селекторы для частых случаев использования
 */

// UI Selectors
export const useUIState = () => useAppSelector(state => state.ui);
export const useSidebarOpen = () => useAppSelector(state => state.ui.sidebarOpen);
export const useTheme = () => useAppSelector(state => state.ui.theme);
export const useGlobalLoading = () => useAppSelector(state => state.ui.loading);
export const useGlobalFilters = () => useAppSelector(state => state.ui.globalFilters);
export const useModalsState = () => useAppSelector(state => state.ui.modals);

// Отдельные модальные окна
export const useEditValueModal = () => useAppSelector(state => state.ui.modals.editValue);
export const useInitYearModal = () => useAppSelector(state => state.ui.modals.initYear);
export const useAddMetricModal = () => useAppSelector(state => state.ui.modals.addMetric);
export const useYearlyPlanModal = () => useAppSelector(state => state.ui.modals.yearlyPlan);

// Data Selectors
export const useDataState = () => useAppSelector(state => state.data);
export const useUsers = () => useAppSelector(state => state.data.users);
export const useCategories = () => useAppSelector(state => state.data.categories);
export const useMetrics = () => useAppSelector(state => state.data.metrics);
export const useShops = () => useAppSelector(state => state.data.shops);
export const usePeriods = () => useAppSelector(state => state.data.periods);
export const useLastSelected = () => useAppSelector(state => state.data.lastSelected);

// Cache Selectors
export const useCacheState = () => useAppSelector(state => state.cache);
export const useQueryCache = (queryKey) => useAppSelector(
    state => state.cache.queries.get(queryKey),
    (prev, next) => prev === next
);
export const useLastUpdated = (key) => useAppSelector(state => state.cache.lastUpdated[key]);

// Permissions Selectors
export const usePermissionsState = () => useAppSelector(state => state.permissions);
export const useCurrentPermissions = () => useAppSelector(state => state.permissions.current);
export const useUserRoles = () => useAppSelector(state => state.permissions.roles);
export const usePermissionsLoaded = () => useAppSelector(state => state.permissions.loaded);

// Sync Selectors
export const useSyncState = () => useAppSelector(state => state.sync);
export const useOnlineStatus = () => useAppSelector(state => state.sync.isOnline);
export const usePendingMutations = () => useAppSelector(state => state.sync.pendingMutations);

/**
 * Сложные селекторы с вычислениями
 */

// Селектор для получения категории по ID
export const useCategoryById = (categoryId) => useAppSelector(
    state => state.data.categories.find(cat => cat.id === categoryId),
    (prev, next) => prev?.id === next?.id
);

// Селектор для получения метрик по категории
export const useMetricsByCategory = (categoryId) => useAppSelector(
    state => state.data.metrics.filter(metric => metric.category_id === categoryId)
);

// Селектор для получения магазина по ID
export const useShopById = (shopId) => useAppSelector(
    state => {
        const shops = state.data.shops;
        return Array.isArray(shops) ? shops.find(shop => shop.id === shopId) : null;
    },
    (prev, next) => prev?.id === next?.id
);

// Селектор для проверки кэша на актуальность
export const useIsCacheValid = (queryKey, ttl = 300000) => useAppSelector(
    state => {
        const cached = state.cache.queries.get(queryKey);
        if (!cached) return false;
        return (Date.now() - cached.timestamp) < ttl;
    }
);

// Селектор для получения списка годов из периодов
export const useAvailableYears = () => useAppSelector(
    state => {
        const years = new Set();
        state.data.periods.forEach(period => {
            if (period.year) {
                years.add(period.year);
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }
);

// Селектор для проверки есть ли данные для конкретного года и магазина
export const useHasDataForSelection = (year, shopId) => useAppSelector(
    state => {
        const hasMetrics = state.data.metrics.length > 0;
        const hasPeriods = state.data.periods.some(p => p.year === parseInt(year));
        return hasMetrics && hasPeriods;
    }
);

// Селектор для получения активной метрики на основе lastSelected
export const useActiveMetric = () => useAppSelector(
    state => {
        const lastMetricId = state.data.lastSelected.metric;
        if (!lastMetricId) return state.data.metrics[0] || null;
        return state.data.metrics.find(m => m.id === lastMetricId) || state.data.metrics[0] || null;
    }
);

// Селектор для подсчета ожидающих мутаций
export const usePendingMutationsCount = () => useAppSelector(
    state => state.sync.pendingMutations.length
);

// Селектор для получения статуса загрузки конкретного типа данных
export const useDataLoadingStatus = (dataType) => useAppSelector(
    state => {
        const lastUpdated = state.cache.lastUpdated[dataType];
        const isLoading = state.ui.loading;
        const hasData = state.data[dataType]?.length > 0;
        
        return {
            isLoading,
            hasData,
            lastUpdated,
            isStale: lastUpdated ? (Date.now() - lastUpdated) > 600000 : true // 10 минут
        };
    }
);

/**
 * Селекторы с параметрами (factory functions)
 */

// Фабрика для создания селектора фильтрации данных
export const createFilterSelector = (dataKey, filterFn) => () => useAppSelector(
    state => state.data[dataKey].filter(filterFn)
);

// Фабрика для создания селектора поиска
export const createSearchSelector = (dataKey, searchFields) => (searchTerm) => useAppSelector(
    state => {
        if (!searchTerm) return state.data[dataKey];
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        return state.data[dataKey].filter(item => 
            searchFields.some(field => 
                item[field]?.toString().toLowerCase().includes(lowerSearchTerm)
            )
        );
    }
);

// Фабрика для создания селектора группировки данных
export const createGroupBySelector = (dataKey, groupByField) => () => useAppSelector(
    state => {
        const groups = {};
        state.data[dataKey].forEach(item => {
            const groupKey = item[groupByField];
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(item);
        });
        return groups;
    }
);

/**
 * Утилиты для работы с селекторами
 */

// Комбинирование нескольких селекторов
export function combineSelectors(...selectors) {
    return () => useAppSelector(
        state => selectors.map(selector => selector(state))
    );
}

// Создание мемоизированного селектора
export function createMemoizedSelector(selectorFn, dependencies = []) {
    return () => useAppSelector(
        useMemo(() => selectorFn, dependencies)
    );
}

export default useAppSelector; 
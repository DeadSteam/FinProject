// Универсальный хук для управления состоянием фильтров
import { useCallback, useMemo, useState, useEffect } from 'react';
import {
    normalizeFilters,
    mergeFilters,
    createFilterChangeHandlers,
    buildSelectAllHandlers,
    ensureFinanceMetricsConsistency
} from '../utils/filtersCommon';

export function useFilters(initialFilters = {}, availableData = {}) {
    const [filters, setFilters] = useState(() => normalizeFilters(initialFilters));

    // Синхронизируем с внешними изменениями initialFilters
    useEffect(() => {
        const normalized = normalizeFilters(initialFilters);
        setFilters(prev => {
            // Обновляем только если есть реальные изменения
            if (JSON.stringify(prev) !== JSON.stringify(normalized)) {
                return normalized;
            }
            return prev;
        });
    }, [initialFilters]);

    const update = useCallback((updates) => {
        setFilters((prev) => mergeFilters(prev, updates));
    }, []);

    const setAll = useCallback((nextFilters) => {
        setFilters(normalizeFilters(nextFilters));
    }, []);

    const handlers = useMemo(() => createFilterChangeHandlers(update, filters), [update, filters]);
    const selection = useMemo(() => buildSelectAllHandlers(availableData, setAll, filters), [availableData, setAll, filters]);

    const applyFinanceConsistency = useCallback(() => {
        setFilters((prev) => ensureFinanceMetricsConsistency(prev));
    }, []);

    return {
        filters,
        setFilters: setAll,
        update,
        handlers,
        selection,
        applyFinanceConsistency
    };
}

export default useFilters;




// Общие утилиты фильтрации для отчетов и аналитики
// Цель: исключить дублирование между AnalyticsFilters и SlideFilters

import { createSafeFilters } from '../utils/filterUtils';

// Базовый набор ключей, поддерживаемых обеими страницами
export const FILTER_KEYS = [
    'years',
    'categories',
    'shops',
    'metrics',
    'periodType',
    'chartType',
    // Финансовые флаги (могут отсутствовать в аналитике)
    'showPlan',
    'showFact',
    'showDeviation',
    'showPercentage'
];

export function getDefaultFilters() {
    return {
        years: [],
        categories: [],
        shops: [],
        metrics: [],
        periodType: 'years',
        chartType: 'bar',
        showPlan: false,
        showFact: false,
        showDeviation: false,
        showPercentage: false
    };
}

export function normalizeFilters(partial) {
    // Используем существующую нормализацию и дополняем дефолтами
    const safe = createSafeFilters(partial || {});
    return { ...getDefaultFilters(), ...safe };
}

export function mergeFilters(current, updates) {
    return normalizeFilters({ ...current, ...(updates || {}) });
}

export function areFiltersEqual(a, b) {
    try {
        return JSON.stringify(normalizeFilters(a)) === JSON.stringify(normalizeFilters(b));
    } catch {
        return false;
    }
}

export function toIdArray(list) {
    if (!Array.isArray(list)) return [];
    return list
        .map((x) => (x?.value ?? x?.id ?? x))
        .filter((x) => x !== undefined && x !== null);
}

export function buildSelectAllHandlers(availableData, onChange, currentFilters) {
    const safeAvailable = availableData || {};

    const handlers = {
        selectAllYears: () => onChange(mergeFilters(currentFilters, { years: toIdArray(safeAvailable.years) })),
        clearAllYears: () => onChange(mergeFilters(currentFilters, { years: [] })),

        selectAllCategories: () => onChange(mergeFilters(currentFilters, { categories: toIdArray(safeAvailable.categories) })),
        clearAllCategories: () => onChange(mergeFilters(currentFilters, { categories: [] })),

        selectAllShops: () => onChange(mergeFilters(currentFilters, { shops: toIdArray(safeAvailable.shops) })),
        clearAllShops: () => onChange(mergeFilters(currentFilters, { shops: [] })),

        selectAllMetrics: () => onChange(mergeFilters(currentFilters, { metrics: toIdArray(safeAvailable.metrics) })),
        clearAllMetrics: () => onChange(mergeFilters(currentFilters, { metrics: [] }))
    };

    return handlers;
}

export function createFilterChangeHandlers(onChange, currentFilters) {
    const setKey = (key) => (value) => onChange(mergeFilters(currentFilters, { [key]: value }));

    return {
        setYears: setKey('years'),
        setCategories: setKey('categories'),
        setShops: setKey('shops'),
        setMetrics: setKey('metrics'),
        setPeriodType: setKey('periodType'),
        setChartType: setKey('chartType'),
        setShowPlan: setKey('showPlan'),
        setShowFact: setKey('showFact'),
        setShowDeviation: setKey('showDeviation'),
        setShowPercentage: setKey('showPercentage')
    };
}

export function getSelectedCounts(filters) {
    const f = normalizeFilters(filters);
    return {
        years: f.years.length,
        categories: f.categories.length,
        shops: f.shops.length,
        metrics: f.metrics.length
    };
}

export function ensureFinanceMetricsConsistency(filters) {
    // Приведение finance-флагов к массиву metrics и обратно
    const f = normalizeFilters(filters);
    const metricsSet = new Set(f.metrics);

    if (f.showPlan) metricsSet.add('plan');
    if (f.showFact) metricsSet.add('actual');
    if (f.showDeviation) metricsSet.add('deviation');
    if (f.showPercentage) metricsSet.add('percentage');

    return mergeFilters(f, { metrics: Array.from(metricsSet) });
}




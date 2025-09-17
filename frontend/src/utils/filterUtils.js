/**
 * Общие утилиты для работы с фильтрами и проверки данных
 */

export const hasSelectedFilters = (filters) => {
    if (!filters) return false;
    const hasYears = Array.isArray(filters.years) && filters.years.length > 0;
    const hasCategories = Array.isArray(filters.categories) && filters.categories.length > 0;
    const hasShops = Array.isArray(filters.shops) && filters.shops.length > 0;
    const hasMetrics = Array.isArray(filters.metrics) && filters.metrics.length > 0;
    return hasYears || hasCategories || hasShops || hasMetrics;
};

export const hasDataToDisplay = (slideData, filters) => {
    if (!slideData) return false;

    if (slideData.isFinanceData) {
        if (Array.isArray(slideData.metrics) && slideData.metrics.length > 0) {
            return true;
        }
        return false;
    }

    if (!hasSelectedFilters(filters)) {
        return false;
    }

    if (Array.isArray(slideData.chartData) && slideData.chartData.length > 0) return true;
    if (Array.isArray(slideData.tableData) && slideData.tableData.length > 0) return true;
    if (Array.isArray(slideData.metrics) && slideData.metrics.length > 0) return true;

    if (slideData.planVsActual) {
        const { categories, shops, metrics, summary } = slideData.planVsActual;
        if (categories && Object.keys(categories).length > 0) return true;
        if (shops && Object.keys(shops).length > 0) return true;
        if (metrics && Object.keys(metrics).length > 0) return true;
        if (summary && (summary.totalPlan > 0 || summary.totalActual > 0)) return true;
    }

    if (slideData.analytics && Object.keys(slideData.analytics).length > 0) return true;

    if (slideData.trends) {
        const { yearly, monthly, quarterly } = slideData.trends;
        if (yearly && Object.keys(yearly).length > 0) return true;
        if (monthly && Object.keys(monthly).length > 0) return true;
        if (quarterly && Object.keys(quarterly).length > 0) return true;
    }

    return false;
};

export const createSafeFilters = (filters) => {
    return {
        years: Array.isArray(filters?.years) && filters.years.length > 0 
            ? filters.years 
            : [],
        categories: Array.isArray(filters?.categories) 
            ? filters.categories.map((c) => (c?.value ?? c?.id ?? c)).filter(Boolean)
            : [],
        shops: Array.isArray(filters?.shops) 
            ? filters.shops.map((s) => (s?.value ?? s?.id ?? s)).filter(Boolean)
            : [],
        metrics: Array.isArray(filters?.metrics) && filters.metrics.length > 0
            ? filters.metrics.map((m) => (m?.value ?? m?.id ?? m)).filter(Boolean)
            : [],
        periodType: filters?.periodType || 'years',
        chartType: filters?.chartType || 'bar',
        groupBy: filters?.groupBy || 'categories',
        viewMode: filters?.viewMode || 'chart',
        showPlan: filters?.showPlan || false,
        showFact: filters?.showFact || false,
        showDeviation: filters?.showDeviation || false,
        showPercentage: filters?.showPercentage || false
    };
};



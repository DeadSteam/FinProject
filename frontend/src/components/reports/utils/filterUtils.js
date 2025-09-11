/**
 * Утилиты для работы с фильтрами в отчетах
 */

/**
 * Проверяет, выбраны ли какие-либо фильтры
 * @param {Object} filters - Объект с фильтрами
 * @returns {boolean} - true, если есть выбранные фильтры
 */
export const hasSelectedFilters = (filters) => {
    if (!filters) return false;
    
    // Проверяем основные фильтры
    const hasYears = Array.isArray(filters.years) && filters.years.length > 0;
    const hasCategories = Array.isArray(filters.categories) && filters.categories.length > 0;
    const hasShops = Array.isArray(filters.shops) && filters.shops.length > 0;
    const hasMetrics = Array.isArray(filters.metrics) && filters.metrics.length > 0;
    
    // Для финансовых графиков проверяем дополнительные поля
    // По умолчанию showPlan и showFact должны быть true для план vs факт
    const hasShowPlan = filters.showPlan !== false; // true по умолчанию
    const hasShowFact = filters.showFact !== false; // true по умолчанию
    const hasShowDeviation = filters.showDeviation === true;
    const hasShowPercentage = filters.showPercentage === true;
    
    // Возвращаем true, если есть хотя бы один выбранный фильтр
    return hasYears || hasCategories || hasShops || hasMetrics || 
           hasShowPlan || hasShowFact || hasShowDeviation || hasShowPercentage;
};

/**
 * Проверяет, есть ли данные для отображения
 * @param {Object} slideData - Данные слайда
 * @param {Object} filters - Фильтры
 * @returns {boolean} - true, если есть данные для отображения
 */
export const hasDataToDisplay = (slideData, filters) => {
    // Если нет выбранных фильтров, показываем заглушку
    if (!hasSelectedFilters(filters)) {
        return false;
    }
    
    // Проверяем наличие данных
    if (!slideData) return false;
    
    // Проверяем chartData
    if (Array.isArray(slideData.chartData) && slideData.chartData.length > 0) {
        return true;
    }
    
    // Проверяем tableData
    if (Array.isArray(slideData.tableData) && slideData.tableData.length > 0) {
        return true;
    }
    
    // Проверяем metrics
    if (Array.isArray(slideData.metrics) && slideData.metrics.length > 0) {
        return true;
    }
    
    // Проверяем данные для план vs факт
    if (slideData.planVsActual) {
        const { categories, shops, metrics, summary } = slideData.planVsActual;
        
        // Проверяем, есть ли данные в любой из категорий
        if (categories && Object.keys(categories).length > 0) return true;
        if (shops && Object.keys(shops).length > 0) return true;
        if (metrics && Object.keys(metrics).length > 0) return true;
        
        // Проверяем сводные данные
        if (summary && (summary.totalPlan > 0 || summary.totalActual > 0)) return true;
    }
    
    // Проверяем данные для сравнения (AnalyticsComparison)
    if (slideData.analytics && Object.keys(slideData.analytics).length > 0) {
        return true;
    }
    
    // Проверяем данные для трендов
    if (slideData.trends) {
        const { yearly, monthly, quarterly } = slideData.trends;
        if (yearly && Object.keys(yearly).length > 0) return true;
        if (monthly && Object.keys(monthly).length > 0) return true;
        if (quarterly && Object.keys(quarterly).length > 0) return true;
    }
    
    return false;
};

/**
 * Создает безопасные фильтры с пустыми значениями по умолчанию
 * @param {Object} filters - Исходные фильтры
 * @returns {Object} - Безопасные фильтры
 */
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
        periodType: filters?.periodType || 'year',
        chartType: filters?.chartType || 'bar',
        // Финансовые фильтры
        showPlan: filters?.showPlan !== undefined ? filters.showPlan : true,
        showFact: filters?.showFact !== undefined ? filters.showFact : true,
        showDeviation: filters?.showDeviation || false,
        showPercentage: filters?.showPercentage || false
    };
};


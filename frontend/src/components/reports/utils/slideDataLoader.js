import { createSafeFilters } from '../../../utils/filterUtils';
// Универсальная обработка и нормализация данных слайдов

export const getProcessedSlideData = async (slide, loadSlideData) => {
    if (!slide || slide.type === 'title') return null;

    const filters = slide.content?.filters || {};
    const settings = slide.content?.settings || {};
    const normalizedFilters = createSafeFilters(filters);

    const raw = await loadSlideData(slide.type, normalizedFilters, settings);
    if (!raw) return null;

    switch (slide.type) {
        case 'analytics-chart':
            return { analytics: raw };
        case 'finance-chart':
            return raw; // уже совместимо (chartData/tableData)
        case 'comparison':
            return raw; // { analytics, finance }
        case 'trends':
            return raw; // совместимо с TrendsChart
        case 'plan-vs-actual':
            return raw; // содержит planVsActual
        default:
            return raw;
    }
};



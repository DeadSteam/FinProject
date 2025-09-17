/**
 * Утилиты для работы с данными графиков
 * Централизованная логика подготовки и обработки данных
 */

/**
 * Безопасное преобразование значения в число
 */
export const toSafeNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    
    const num = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(num) ? num : 0;
};

/**
 * Нормализация имени метрики
 */
export const normalizeMetric = (metric) => {
    const raw = (metric?.value ?? metric?.id ?? metric ?? '').toString().trim();
    const m = raw.toLowerCase();
    
    if (['fact', 'actual', 'факт'].includes(m)) return 'actual';
    if (['plan', 'план'].includes(m)) return 'plan';
    if (['deviation', 'difference', 'отклонение'].includes(m)) return 'deviation';
    if (['percentage', 'percent', '%', 'процент', 'проценты'].includes(m)) return 'percentage';
    
    return raw;
};

/**
 * Получение значения по алиасам
 */
export const getValueByAliases = (obj, aliases, fallback = 0) => {
    if (obj === null || obj === undefined) return fallback;
    if (typeof obj === 'number') return toSafeNumber(obj, fallback);
    if (typeof obj !== 'object') return fallback;
    
    const lowerKeys = Object.keys(obj).map(k => k.toLowerCase());
    
    for (const alias of aliases) {
        const a = alias.toLowerCase();
        let idx = lowerKeys.indexOf(a);
        if (idx === -1) {
            idx = lowerKeys.findIndex(k => k.includes(a));
        }
        if (idx !== -1) {
            const key = Object.keys(obj)[idx];
            return toSafeNumber(obj[key], fallback);
        }
    }
    
    // Доп. фолбэк: искать распространённые ключи суммы
    const common = ['value', 'amount', 'sum', 'итого', 'сумма'];
    for (const a of common) {
        const i = lowerKeys.findIndex(k => k.includes(a));
        if (i !== -1) return toSafeNumber(obj[Object.keys(obj)[i]], fallback);
    }
    
    return fallback;
};

/**
 * Поиск существующего ключа среди кандидатов
 */
export const getExistingKey = (obj, candidates) => {
    if (!obj) return undefined;
    
    for (const cand of candidates) {
        if (cand in obj) return cand;
    }
    
    // Пытаемся понижать регистр и сравнивать без регистра
    const lowerMap = Object.keys(obj).reduce((acc, k) => { 
        acc[k.toLowerCase()] = k; 
        return acc; 
    }, {});
    
    for (const cand of candidates) {
        const found = lowerMap[cand.toLowerCase()];
        if (found) return found;
    }
    
    return undefined;
};

/**
 * Подготовка данных для категорий
 */
export const prepareCategoryData = (planVsActualData) => {
    if (!planVsActualData?.categories) return [];
    
    return Object.entries(planVsActualData.categories).map(([categoryName, data]) => ({
        label: categoryName,
        plan: toSafeNumber(data.plan || 0),
        actual: toSafeNumber(data.actual || 0),
        deviation: toSafeNumber(data.deviation ?? (toSafeNumber(data.plan) - toSafeNumber(data.actual))),
        percentage: toSafeNumber(data.percentage ?? (toSafeNumber(data.plan) > 0 ? ((toSafeNumber(data.actual) / toSafeNumber(data.plan)) * 100) : 0))
    }));
};

/**
 * Подготовка данных для магазинов
 */
export const prepareShopData = (planVsActualData) => {
    if (!planVsActualData?.shops) return [];
    
    return Object.entries(planVsActualData.shops).map(([shopName, data]) => ({
        label: shopName,
        plan: toSafeNumber(data.plan || 0),
        actual: toSafeNumber(data.actual || 0),
        deviation: toSafeNumber(data.deviation ?? (toSafeNumber(data.plan) - toSafeNumber(data.actual))),
        percentage: toSafeNumber(data.percentage ?? (toSafeNumber(data.plan) > 0 ? ((toSafeNumber(data.actual) / toSafeNumber(data.plan)) * 100) : 0))
    }));
};

/**
 * Подготовка данных для метрик
 */
export const prepareMetricsData = (planVsActualData) => {
    if (!planVsActualData?.metrics) return [];
    
    return Object.entries(planVsActualData.metrics).map(([metricName, data]) => ({
        label: metricName,
        plan: toSafeNumber(data.plan || 0),
        actual: toSafeNumber(data.actual || 0),
        deviation: toSafeNumber(data.deviation ?? (toSafeNumber(data.plan) - toSafeNumber(data.actual))),
        percentage: toSafeNumber(data.percentage ?? (toSafeNumber(data.plan) > 0 ? ((toSafeNumber(data.actual) / toSafeNumber(data.plan)) * 100) : 0))
    }));
};

/**
 * Подготовка данных для годов
 */
export const prepareYearlyData = (comparisonData, filters) => {
    if (!comparisonData?.yearly) return [];
    
    return (filters.years || [])
        .sort((a, b) => a - b)
        .map(year => {
            const yearData = comparisonData.yearly[year] || {};
            return {
                label: year.toString(),
                plan: toSafeNumber(yearData.plan || 0),
                actual: toSafeNumber(yearData.actual || yearData.fact || 0),
                deviation: toSafeNumber(yearData.deviation ?? (toSafeNumber(yearData.plan) - toSafeNumber(yearData.actual || yearData.fact))),
                percentage: toSafeNumber(yearData.percentage ?? (toSafeNumber(yearData.plan) > 0 ? ((toSafeNumber(yearData.actual || yearData.fact) / toSafeNumber(yearData.plan)) * 100) : 0))
            };
        });
};

/**
 * Подготовка месячных данных
 */
export const prepareMonthlyData = (analyticsData, filters) => {
    if (!analyticsData?.trends?.monthly || !filters.metrics || !filters.years) {
        return {};
    }
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const monthNamesEn = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const metricCharts = {};
    
    filters.metrics.forEach(metricRaw => {
        const metric = normalizeMetric(metricRaw);
        const monthlyData = [];
        
        for (let month = 1; month <= 12; month++) {
            const monthData = {
                label: monthNames[month - 1],
                month: month
            };
            
            filters.years.forEach(year => {
                const monthKey = monthNamesEn[month - 1];
                const yearData = analyticsData.trends.monthly[year]?.[monthKey] || {};
                
                let value = 0;
                
                if (metric === 'actual') {
                    value = toSafeNumber(yearData['actual'] || yearData['fact'] || 0);
                } else if (metric === 'plan') {
                    value = toSafeNumber(yearData['plan'] || 0);
                } else if (metric === 'deviation') {
                    value = toSafeNumber(yearData['deviation'] || 0);
                } else if (metric === 'percentage') {
                    value = toSafeNumber(yearData['percentage'] || 0);
                } else {
                    value = toSafeNumber(yearData[metric] || 0);
                }
                
                monthData[`${year}`] = value;
            });
            
            monthlyData.push(monthData);
        }
        
        metricCharts[metric] = monthlyData;
    });
    
    return metricCharts;
};

/**
 * Подготовка квартальных данных
 */
export const prepareQuarterlyData = (analyticsData, filters) => {
    if (!analyticsData?.trends?.quarterly || !filters.metrics || !filters.years) {
        return {};
    }
    
    const quarterNames = ['I квартал', 'II квартал', 'III квартал', 'IV квартал'];
    const metricCharts = {};
    
    filters.metrics.forEach(metricRaw => {
        const metric = normalizeMetric(metricRaw);
        const quarterlyData = [];
        
        for (let quarter = 1; quarter <= 4; quarter++) {
            const quarterData = {
                label: quarterNames[quarter - 1],
                quarter: quarter
            };
            
            filters.years.forEach(year => {
                const yearBlock = analyticsData.trends.quarterly[year] || {};
                const quarterKey = getExistingKey(yearBlock, [
                    `Q${quarter}`, `${quarter}`, `К${quarter}`, `${quarter} квартал`, `${quarter}-квартал`
                ]);
                const yearData = (yearBlock && yearBlock[quarterKey]) || {};
                
                let value = 0;
                
                if (metric === 'actual' || metric === 'fact') {
                    value = getValueByAliases(yearData, ['fact', 'actual', 'факт'], 0);
                } else if (metric === 'plan') {
                    value = getValueByAliases(yearData, ['plan', 'план'], 0);
                } else if (metric === 'deviation') {
                    const planVal = getValueByAliases(yearData, ['plan', 'план'], 0);
                    const factVal = getValueByAliases(yearData, ['fact', 'actual', 'факт'], 0);
                    value = getValueByAliases(yearData, ['deviation', 'difference', 'отклон'], planVal - factVal);
                } else if (metric === 'percentage') {
                    value = getValueByAliases(yearData, ['percentage', 'percent', '%', 'процент'], 0);
                } else {
                    value = toSafeNumber(yearData[metric], 0);
                }
                
                quarterData[`${year}`] = value;
            });
            
            quarterlyData.push(quarterData);
        }
        
        metricCharts[metric] = quarterlyData;
    });
    
    return metricCharts;
};

/**
 * Универсальная функция подготовки данных
 */
export const prepareChartData = (sourceData, groupBy, filters = {}) => {
    if (!sourceData) return [];
    
    switch (groupBy) {
        case 'categories':
            return prepareCategoryData(sourceData.planVsActual || sourceData);
        case 'subcategories':
        case 'metrics':
            return prepareMetricsData(sourceData.planVsActual || sourceData);
        case 'shops':
            return prepareShopData(sourceData.planVsActual || sourceData);
        case 'years':
            return prepareYearlyData(sourceData.comparison || sourceData, filters);
        case 'monthly':
            return prepareMonthlyData(sourceData, filters);
        case 'quarterly':
            return prepareQuarterlyData(sourceData, filters);
        default:
            return [];
    }
};

/**
 * Вычисление статистики по данным
 */
export const calculateStatistics = (data) => {
    // Проверяем, что data является массивом
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    
    const totalPlan = data.reduce((sum, item) => sum + toSafeNumber(item.plan), 0);
    const totalActual = data.reduce((sum, item) => sum + toSafeNumber(item.actual), 0);
    const totalDeviation = data.reduce((sum, item) => sum + toSafeNumber(item.deviation), 0);
    const avgPercentage = data.length > 0 ? 
        data.reduce((sum, item) => sum + toSafeNumber(item.percentage), 0) / data.length : 0;
    
    return {
        totalPlan,
        totalActual,
        totalDeviation,
        avgPercentage,
        itemsCount: data.length
    };
};

/**
 * Форматирование данных для таблицы
 */
export const formatTableData = (chartData) => {
    return chartData.map(item => ({
        period: item.label,
        plan: item.plan,
        actual: item.actual,
        deviation: item.deviation,
        percentage: item.percentage,
        ...item
    }));
};

/**
 * Получение стандартных колонок таблицы
 */
export const getDefaultTableColumns = (groupBy) => [
    { 
        key: 'period', 
        title: groupBy === 'categories' ? 'Категория' : 
               groupBy === 'shops' ? 'Магазин' : 
               groupBy === 'metrics' ? 'Показатель' : 'Период',
        sortable: true 
    },
    { key: 'plan', title: 'План', sortable: true, format: 'number' },
    { key: 'actual', title: 'Факт', sortable: true, format: 'number' },
    { key: 'deviation', title: 'Отклонение', sortable: true, format: 'number' },
    { key: 'percentage', title: '% выполнения', sortable: true, format: 'percent' }
];

/**
 * Нормализация русских названий месяцев в ключ periods_value
 */
export const getMonthKey = (monthName) => {
    const monthMap = {
        'Январь': 'январь',
        'Февраль': 'февраль',
        'Март': 'март',
        'Апрель': 'апрель',
        'Май': 'май',
        'Июнь': 'июнь',
        'Июль': 'июль',
        'Август': 'август',
        'Сентябрь': 'сентябрь',
        'Октябрь': 'октябрь',
        'Ноябрь': 'ноябрь',
        'Декабрь': 'декабрь',
        'Янв': 'январь',
        'Фев': 'февраль',
        'Мар': 'март',
        'Апр': 'апрель',
        'Июн': 'июнь',
        'Июл': 'июль',
        'Авг': 'август',
        'Сен': 'сентябрь',
        'Окт': 'октябрь',
        'Ноя': 'ноябрь',
        'Дек': 'декабрь'
    };

    if (!monthName) return '';
    return monthMap[monthName] || String(monthName).toLowerCase();
};

/**
 * Универсальная таблица для Plan vs Actual
 */
export const buildPlanVsActualTable = (planVsActual) => {
    try {
        const cols = [
            { key: 'period', header: 'Период', sticky: true, align: 'left', width: '220px' },
            { key: 'plan', header: 'План', align: 'right', width: '120px' },
            { key: 'actual', header: 'Факт', align: 'right', width: '120px' },
            { key: 'deviation', header: 'Отклонение', align: 'right', width: '120px' },
            { key: 'percentage', header: '% выполнения', align: 'right', width: '120px' }
        ];

        const rows = [];

        const source = planVsActual?.categories && Object.keys(planVsActual.categories).length
            ? planVsActual.categories
            : planVsActual?.shops && Object.keys(planVsActual.shops).length
            ? planVsActual.shops
            : planVsActual?.metrics || {};

        Object.entries(source).forEach(([label, item]) => {
            rows.push({
                period: label,
                plan: item.plan ?? 0,
                actual: item.actual ?? item.fact ?? 0,
                deviation: item.deviation ?? 0,
                percentage: item.percentage ?? 0
            });
        });

        return { tableData: rows, tableColumns: cols };
    } catch (e) {
        return { tableData: [], tableColumns: [] };
    }
};

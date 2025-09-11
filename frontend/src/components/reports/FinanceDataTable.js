import React from 'react';
import DataTable from '../ui/DataTable';
import './FinanceDataTable.css';

/**
 * Компонент таблицы для финансовых данных в отчетах
 * Использует тот же DataTable, что и в FinanceDetails
 */
const FinanceDataTable = ({ 
    data, 
    columns, 
    title = "Финансовые данные",
    isLoading = false,
    className = "",
    maxHeight = "400px",
    selectedMetrics = [] // Добавляем поддержку выбранных метрик
}) => {
    if (isLoading) {
        return (
            <div className={`finance-table-container ${className}`}>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Загрузка данных...</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={`finance-table-container ${className}`}>
                <div className="no-data">
                    <p>Нет данных для отображения</p>
                </div>
            </div>
        );
    }

    // Преобразуем данные из формата отчетов в формат DataTable
    if (process.env.NODE_ENV === 'development') {
        console.log('[FinanceDataTable] input data:', data);
        console.log('[FinanceDataTable] data[0] structure:', data[0]);
        console.log('[FinanceDataTable] data[0].periods_value:', data[0]?.periods_value);
        console.log('[FinanceDataTable] data[0].periods_value.quarters:', data[0]?.periods_value?.quarters);
        console.log('[FinanceDataTable] data[0].periods_value.months:', data[0]?.periods_value?.months);
    }
    const { metrics, periods } = transformDataForDataTable(data, columns);
    if (process.env.NODE_ENV === 'development') {
        console.log('[FinanceDataTable] transformed metrics:', metrics);
        console.log('[FinanceDataTable] transformed periods:', periods);
    }

    // Фильтруем метрики по выбранным
    const filteredMetrics = selectedMetrics.length > 0 
        ? metrics.filter(metric => selectedMetrics.includes(metric.id) || selectedMetrics.includes(metric.name))
        : metrics;

    if (process.env.NODE_ENV === 'development') {
        console.log('[FinanceDataTable] passing to DataTable:', {
            metrics: filteredMetrics,
            periods: periods,
            metricsLength: filteredMetrics.length
        });
    }

    return (
        <div className={`finance-table-container ${className}`} style={{ maxHeight, overflow: 'auto' }}>
            {title && (
                <div className="table-header">
                    <h5 className="table-title">{title}</h5>
                </div>
            )}
            <DataTable 
                metrics={filteredMetrics}
                periods={periods}
                view="quarters"
                hasAdminRights={false} // В отчетах редактирование отключено
                isFiltering={false}
                showQuarters={true}
                visibleColumns={{
                    plan: true,
                    fact: true,
                    deviation: true,
                    percentage: false // В отчетах обычно не показываем процент
                }}
            />
        </div>
    );
};

/**
 * Преобразует данные из формата отчетов в формат DataTable
 */
const transformDataForDataTable = (data, columns) => {
    if (!data || data.length === 0) {
        return { metrics: [], periods: [] };
    }

    // Создаем метрики на основе данных
    const metrics = [];
    const periods = [];

    // Если данные уже в правильном формате (из loadFinanceDetails)
    if (data[0] && data[0].periods_value) {
        // Данные уже в формате FinanceDetails
        return { metrics: data, periods: [] };
    }

    // Если данные в формате таблицы отчетов, преобразуем их
    if (data[0] && data[0].period) {
        // Создаем фиктивную метрику для отображения данных
        const metric = {
            id: 1,
            name: "Финансовые показатели",
            unit: "руб.",
            periods_value: {
                quarters: {},
                months: {}
            }
        };

        // Группируем данные по периодам
        data.forEach((row, index) => {
            const period = row.period || row.label || `Период ${index + 1}`;
            const plan = parseFloat(row.plan || 0);
            const actual = parseFloat(row.actual || row.fact || 0);
            const deviation = parseFloat(row.deviation || (actual - plan));
            const percentage = parseFloat(row.percentage || (plan ? (actual / plan) * 100 : 0));

            // Определяем, это квартал или месяц
            const isQuarter = period.includes('квартал') || period.includes('I ') || period.includes('II ') || 
                            period.includes('III ') || period.includes('IV ');

            if (isQuarter) {
                metric.periods_value.quarters[period] = {
                    plan,
                    actual,
                    deviation,
                    procent: percentage
                };
            } else {
                // Преобразуем название месяца в ключ
                const monthKey = getMonthKey(period);
                metric.periods_value.months[monthKey] = {
                    plan,
                    actual,
                    deviation,
                    procent: percentage
                };
            }
        });

        metrics.push(metric);
    }

    return { metrics, periods };
};

/**
 * Преобразует название месяца в ключ для periods_value
 */
const getMonthKey = (monthName) => {
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

    return monthMap[monthName] || monthName.toLowerCase();
};

export default FinanceDataTable;

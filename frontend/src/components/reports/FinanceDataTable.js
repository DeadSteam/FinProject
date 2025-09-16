import React from 'react';
import { getMonthKey } from '../charts/utils/chartDataUtils';
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
    selectedMetrics = [], // Типы колонок ['plan', 'actual', 'deviation', 'percentage']
    selectedMetric = 'all', // Конкретная выбранная метрика (ID или 'all')
    showQuarters = true // Показывать строки кварталов
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
    const { metrics, periods } = transformDataForDataTable(data, columns);
    
    // Фильтруем метрики по выбранной конкретной метрике
    const filteredMetrics = selectedMetric && selectedMetric !== 'all' 
        ? metrics.filter(metric => metric.id === selectedMetric || metric.name === selectedMetric)
        : metrics;


    return (
        <div className={`finance-table-container ${className}`} style={{ overflow: 'hidden' }}>
            <div style={{ overflow: 'hidden', maxHeight: 'none' }}>
                <DataTable 
                    metrics={filteredMetrics}
                    periods={periods}
                    view="quarters"
                    hasAdminRights={false} // В отчетах редактирование отключено
                    isFiltering={false}
                    showQuarters={showQuarters}
                    visibleColumns={{
                        plan: selectedMetrics.includes('plan'),
                        fact: selectedMetrics.includes('actual'),
                        deviation: selectedMetrics.includes('deviation'),
                        percentage: selectedMetrics.includes('percentage')
                    }}
                />
            </div>
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
            const deviation = parseFloat(row.deviation || 0);
            const percentage = parseFloat(row.percentage || 0);

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

// getMonthKey вынесен в общие utils

export default FinanceDataTable;

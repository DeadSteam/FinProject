import React from 'react';
import styles from '@styles/components/DataTable.module.css';

import { formatNumberRu } from '../../utils/formatUtils.js';
import { getDeviationCssClass } from '../../utils/deviationUtils.js';
import { useTableData } from '../../hooks/useTableData.js';
import MonthRow from './MonthRow.js';
import QuarterRow from './QuarterRow.js';
import MetricCells from './MetricCells.js';

const DataTable = React.memo(({ metrics, periods, view, onEditValue, hasAdminRights = false, isFiltering = false, showQuarters = true, visibleColumns = { plan: true, fact: true, deviation: true, percentage: true } }) => {

    // Получаем подготовленные данные из нового хука
    const { tableData, totalData } = useTableData(metrics, periods);

    // Функция форматирования числа
    const formatNumber = (value) => formatNumberRu(value);

    // CSS класс отклонения
    const getDeviationClass = (variance) => getDeviationCssClass(variance, styles);

    const handleEdit = (metricId, periodId, type, currentValue) => {
        if (onEditValue) {
            const rowData = tableData.find(row => row.periodId === periodId);
            onEditValue({
                metricId,
                periodId,
                type,
                currentValue,
                planValue: rowData ? rowData[`metric${metricId}_plan`] : 0,
                rowData
            });
        }
    };

    if (!metrics.length) {
        return (
            <div className={styles.noData}>
                <p>Нет данных для отображения</p>
            </div>
        );
    }

    const enabledSubHeaders = (metric) => {
        const headers = [];
        if (visibleColumns.plan) headers.push('План');
        if (visibleColumns.fact) headers.push('Факт');
        if (visibleColumns.deviation) headers.push('Отклонение');
        return headers;
    };

    return (
        <div className={styles.tableContainer}>
            <table className={`${styles.dataTable} ${isFiltering ? styles.filtering : ''}`}>
                <thead>
                    <tr>
                        <th rowSpan="2" className={styles.periodHeader}>
                            Период
                        </th>
                        {metrics.map(metric => {
                            const colCount = (visibleColumns.plan ? 1 : 0) + (visibleColumns.fact ? 1 : 0) + (visibleColumns.deviation ? 1 : 0);
                            if (colCount === 0) return null;
                            return (
                                <th key={metric.id} colSpan={colCount} className={styles.metricHeader}>
                                    {metric.name} ({metric.unit})
                                </th>
                            );
                        })}
                    </tr>
                    <tr className={styles.subHeader}>
                        {metrics.map(metric => (
                            <React.Fragment key={metric.id}>
                                {visibleColumns.plan && (
                                    <th>
                                        <div className={styles.sortableHeader}>
                                            План
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.fact && (
                                    <th>
                                        <div className={styles.sortableHeader}>
                                            Факт
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.deviation && (
                                    <th>
                                        <div className={styles.sortableHeader}>
                                            Отклонение
                                        </div>
                                    </th>
                                )}
                            </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tableData
                        .filter(row => showQuarters ? true : !row.isQuarter)
                        .map(row => {
                            if (row.isQuarter) {
                                return <QuarterRow key={row.id} row={row} metrics={metrics} hasAdminRights={hasAdminRights} onEditValue={handleEdit} visibleColumns={visibleColumns} />;
                            }
                            return <MonthRow key={row.id} row={row} metrics={metrics} hasAdminRights={hasAdminRights} onEditValue={handleEdit} visibleColumns={visibleColumns} />;
                        })}
                </tbody>
                {totalData && (
                    <tfoot>
                        <tr className={styles.totalRow}>
                            <td className={styles.periodCell}>{totalData.period}</td>
                            {metrics.map(metric => (
                                <MetricCells 
                                    key={metric.id}
                                    row={totalData} 
                                    metric={metric} 
                                    hasAdminRights={false} // Редактирование итогов отключено
                                    visibleColumns={visibleColumns}
                                />
                            ))}
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
});

export default DataTable; 
 
 
 
 
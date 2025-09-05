import React from 'react';
import styles from '@styles/components/DataTable.module.css';

import { formatNumberRu } from '../../utils/formatUtils.js';
import { getDeviationCssClass } from '../../utils/deviationUtils.js';
import { useTableData } from '../../hooks/useTableData.js';
import MonthRow from './MonthRow.js';
import QuarterRow from './QuarterRow.js';
import MetricCells from './MetricCells.js';

const DataTable = React.memo(({ metrics, periods, view, onEditValue, hasAdminRights = false, isFiltering = false }) => {

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

    return (
        <div className={styles.tableContainer}>
            <table className={`${styles.dataTable} ${isFiltering ? styles.filtering : ''}`}>
                <thead>
                    <tr>
                        <th rowSpan="2" className={styles.periodHeader}>
                            Период
                        </th>
                        {metrics.map(metric => (
                            <th key={metric.id} colSpan="3" className={styles.metricHeader}>
                                {metric.name} ({metric.unit})
                            </th>
                        ))}
                    </tr>
                    <tr className={styles.subHeader}>
                        {metrics.map(metric => (
                            <React.Fragment key={metric.id}>
                                <th>
                                    <div className={styles.sortableHeader}>
                                        План
                                    </div>
                                </th>
                                <th>
                                    <div className={styles.sortableHeader}>
                                        Факт
                                    </div>
                                </th>
                                <th>
                                    <div className={styles.sortableHeader}>
                                        Отклонение
                                    </div>
                                </th>
                            </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tableData.map(row => {
                        if (row.isQuarter) {
                            return <QuarterRow key={row.id} row={row} metrics={metrics} hasAdminRights={hasAdminRights} onEditValue={handleEdit} />;
                        }
                        return <MonthRow key={row.id} row={row} metrics={metrics} hasAdminRights={hasAdminRights} onEditValue={handleEdit} />;
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
 
 
 
 
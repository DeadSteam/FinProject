import React from 'react';
import styles from '@styles/components/DataTable.module.css';
import MetricCells from './MetricCells.js';

const MonthRow = ({ row, metrics, hasAdminRights, onEditValue, visibleColumns }) => {
    return (
        <tr className={styles.monthRow}>
            <td className={styles.periodCell}>{row.period}</td>
            {metrics.map(metric => (
                <MetricCells
                    key={metric.id}
                    row={row}
                    metric={metric}
                    hasAdminRights={hasAdminRights}
                    onEditValue={onEditValue}
                    visibleColumns={visibleColumns}
                />
            ))}
        </tr>
    );
};

export default MonthRow; 
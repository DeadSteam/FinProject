import React from 'react';
import styles from '@styles/components/DataTable.module.css';
import MetricCells from './MetricCells.js';

const QuarterRow = ({ row, metrics, hasAdminRights, onEditValue }) => {
    return (
        <tr className={styles.quarterRow}>
            <td className={styles.periodCell}>{row.period}</td>
            {metrics.map(metric => (
                <MetricCells
                    key={metric.id}
                    row={row}
                    metric={metric}
                    hasAdminRights={hasAdminRights}
                    onEditValue={onEditValue}
                />
            ))}
        </tr>
    );
};

export default QuarterRow; 
import React from 'react';
import styles from './AnalyticsTable.module.css';

/**
 * Компонент таблицы для аналитики
 * Использует стили аналогичные FinanceDetails
 */
const AnalyticsTable = ({ 
    data, 
    columns, 
    title = "Данные аналитики",
    isLoading = false,
    className = ""
}) => {
    if (isLoading) {
        return (
            <div className={`${styles.tableContainer} ${className}`}>
                <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Загрузка данных...</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={`${styles.tableContainer} ${className}`}>
                <div className={styles.noData}>
                    <p>Нет данных для отображения</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.tableContainer} ${className}`}>
            <div className={styles.tableHeader}>
                <h5 className={styles.tableTitle}>{title}</h5>
            </div>
            <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                    <thead>
                        {/* Основные заголовки (показатели) с объединенными ячейками */}
                        <tr>
                            {columns.map((column, index) => {
                                // Если это первая колонка периода, показываем её как есть
                                if (column.sticky) {
                                    return (
                                        <th 
                                            key={index}
                                            className={column.sticky ? styles.stickyColumn : ''}
                                            style={{ width: column.width }}
                                            rowSpan={columns.some(col => col.subHeader) ? 2 : 1}
                                        >
                                            {column.header}
                                        </th>
                                    );
                                }
                                
                                // Если нет подзаголовков (обычные режимы), показываем заголовки как есть
                                if (!columns.some(col => col.subHeader)) {
                                    return (
                                        <th 
                                            key={index}
                                            className={styles.metricHeader}
                                            style={{ width: column.width }}
                                        >
                                            {column.header}
                                        </th>
                                    );
                                }
                                
                                // Для метрик с подзаголовками - объединяем ячейки по годам
                                const isFirstOfMetric = index === 0 || columns[index - 1].subHeader !== column.subHeader;
                                if (!isFirstOfMetric) return null;
                                
                                // Считаем количество колонок для этого показателя
                                const metricColumns = columns.filter(col => col.subHeader === column.subHeader);
                                const colspan = metricColumns.length;
                                
                                return (
                                    <th 
                                        key={`metric-${column.subHeader}`}
                                        className={styles.metricHeader}
                                        colSpan={colspan}
                                        style={{ width: `${colspan * 80}px` }}
                                    >
                                        {column.subHeader}
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Подзаголовки для группировки (годы) */}
                        {columns.some(col => col.subHeader) && (
                            <tr>
                                {columns.map((column, index) => {
                                    if (column.sticky) return null; // Период уже показан в верхней строке
                                    return (
                                        <th 
                                            key={`year-${index}`}
                                            className={styles.yearHeader}
                                            style={{ width: column.width }}
                                        >
                                            {column.header}
                                        </th>
                                    );
                                })}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex} className={styles.dataRow}>
                                {columns.map((column, colIndex) => (
                                    <td 
                                        key={colIndex}
                                        className={`${column.sticky ? styles.stickyColumn : ''} ${column.align === 'left' ? styles.leftAlign : styles.rightAlign}`}
                                    >
                                        {column.render ? column.render(row[column.key], row, rowIndex) : row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AnalyticsTable;

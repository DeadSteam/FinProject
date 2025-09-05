import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Универсальный DataTable для аналитики
 */
const AnalyticsDataTable = ({ data = [], columns = [], defaultSort = null, className = '' }) => {
    const [sortConfig, setSortConfig] = useState(defaultSort);

    // Сортировка данных
    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [data, sortConfig]);

    const handleSort = (key) => {
        const column = columns.find(col => col.key === key);
        if (!column?.sortable) return;

        setSortConfig(prevConfig => {
            if (prevConfig?.key === key) {
                return {
                    key,
                    direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
                };
            }
            return { key, direction: 'asc' };
        });
    };

    const formatValue = (value, format) => {
        if (value === null || value === undefined) return '-';

        // Безопасное приведение к числу, поддержка строковых значений
        const numericValue = typeof value === 'number'
            ? value
            : typeof value === 'string'
                ? Number(value.replace(/\s/g, '').replace(',', '.'))
                : NaN;

        switch (format) {
            case 'number':
                return Number.isFinite(numericValue) ? numericValue.toLocaleString('ru-RU') : '-';
            case 'percent':
                return Number.isFinite(numericValue) ? `${numericValue.toFixed(1)}%` : '-';
            case 'currency':
                return Number.isFinite(numericValue) ? `${numericValue.toLocaleString('ru-RU')} ₽` : '-';
            default:
                // Если это число — форматируем как число, иначе строка
                return Number.isFinite(numericValue) ? numericValue.toLocaleString('ru-RU') : String(value);
        }
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig?.key !== columnKey) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    if (!data || data.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Нет данных для отображения
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }} className={className}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                        {columns.map(column => (
                            <th
                                key={column.key}
                                style={{
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    color: '#374151',
                                    borderBottom: '1px solid #e5e7eb',
                                    cursor: column.sortable ? 'pointer' : 'default'
                                }}
                                onClick={() => handleSort(column.key)}
                            >
                                {column.title}
                                {column.sortable && (
                                    <span style={{ marginLeft: '4px', fontSize: '12px' }}>
                                        {getSortIcon(column.key)}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, index) => (
                        <tr
                            key={index}
                            style={{
                                borderBottom: '1px solid #f3f4f6',
                                transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}
                        >
                            {columns.map(column => (
                                <td
                                    key={column.key}
                                    style={{
                                        padding: '12px 16px',
                                        color: '#374151'
                                    }}
                                >
                                    {formatValue(row[column.key], column.format)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

AnalyticsDataTable.propTypes = {
    data: PropTypes.array,
    columns: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        sortable: PropTypes.bool,
        format: PropTypes.oneOf(['number', 'percent', 'currency'])
    })),
    defaultSort: PropTypes.shape({
        key: PropTypes.string.isRequired,
        direction: PropTypes.oneOf(['asc', 'desc']).isRequired
    }),
    className: PropTypes.string
};

export default AnalyticsDataTable; 
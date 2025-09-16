import React, { useEffect } from 'react';
import useFilters from '../../hooks/useFilters';

/**
 * Универсальная панель фильтров
 * Поддерживает: годы, категории, магазины, метрики, periodType, chartType
 * Дополнительно: флаги финансовых метрик (plan, actual, deviation, percentage)
 */
const FilterPanel = ({
    value,
    onChange,
    availableData = {},
    showFinanceFlags = false,
    children
}) => {
    const { filters, setFilters, handlers, selection, applyFinanceConsistency } = useFilters(value, availableData);

    // Пробрасываем изменения наверх
    useEffect(() => {
        onChange?.(filters);
    }, [filters, onChange]);

    // Согласование финансовых флагов и массива metrics
    useEffect(() => {
        if (showFinanceFlags) {
            applyFinanceConsistency();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showFinanceFlags]);

    // Базовый UI оставляем минимальным; конкретные проекты могут передать children
    return (
        <div className="card p-3">
            {children?.({ filters, handlers, selection, setFilters })}
        </div>
    );
};

export default FilterPanel;




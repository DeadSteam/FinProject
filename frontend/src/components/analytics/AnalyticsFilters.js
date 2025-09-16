import React, { useMemo, useState, useCallback } from 'react';
import SearchableSelect from '../ui/SearchableSelect';
import styles from './AnalyticsFilters.module.css';
import useFilters from '../../hooks/useFilters';
import '../../styles/components/toggle.css';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

/**
 * Компонент фильтров для аналитики.
 * Позволяет выбирать года, категории, магазины и показатели для анализа.
 */
const AnalyticsFilters = ({ filters, onChange, availableData, isLoading }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [hoveredMetric, setHoveredMetric] = useState(null);
    const { filters: localFilters, update, selection } = useFilters(filters, availableData);

    // Пробрасываем изменения наверх при изменении локальных фильтров
    const notifyParent = useCallback((next) => {
        onChange?.(next);
    }, [onChange]);

    useMemo(() => {
        notifyParent(localFilters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localFilters]);

    if (!availableData || !availableData.years) {
        if (dev) {
            console.warn('⚠️ AnalyticsFilters: availableData не загружены', { availableData });
        }
        return (
            <div className="card p-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Загрузка...</span>
                    </div>
                    <p className="mt-2 mb-0">Загрузка фильтров...</p>
                    {dev && (
                        <small className="text-muted d-block mt-2">
                            Debug: availableData = {JSON.stringify(availableData)}
                        </small>
                    )}
                </div>
            </div>
        );
    }

    const handleYearsChange = useCallback((selectedYears) => {
        update({ years: selectedYears });
    }, [update]);

    const handleCategoriesChange = useCallback((selectedCategories) => {
        update({ categories: selectedCategories });
    }, [update]);

    const handleShopsChange = useCallback((selectedShops) => {
        update({ shops: selectedShops });
    }, [update]);

    const handleMetricsChange = useCallback((selectedMetrics) => {
        update({ metrics: selectedMetrics });
    }, [update]);


    const selectAllYears = useCallback(() => selection.selectAllYears(), [selection]);
    const clearAllYears = useCallback(() => selection.clearAllYears(), [selection]);
    const selectAllCategories = useCallback(() => selection.selectAllCategories(), [selection]);
    const clearAllCategories = useCallback(() => selection.clearAllCategories(), [selection]);
    const selectAllShops = useCallback(() => selection.selectAllShops(), [selection]);
    const clearAllShops = useCallback(() => selection.clearAllShops(), [selection]);
    const selectAllMetrics = useCallback(() => selection.selectAllMetrics(), [selection]);
    const clearAllMetrics = useCallback(() => selection.clearAllMetrics(), [selection]);

    const toggleMetric = useCallback((metricId) => {
        const currentMetrics = (localFilters.metrics || []);
        const newMetrics = currentMetrics.includes(metricId)
            ? currentMetrics.filter(id => id !== metricId)
            : [...currentMetrics, metricId];
        handleMetricsChange(newMetrics);
    }, [localFilters.metrics, handleMetricsChange]);

    // Мемоизированные вычисления
    const selectedYearsCount = useMemo(() => localFilters.years?.length || 0, [localFilters.years]);
    const selectedCategoriesCount = useMemo(() => localFilters.categories?.length || 0, [localFilters.categories]);
    const selectedShopsCount = useMemo(() => localFilters.shops?.length || 0, [localFilters.shops]);
    const selectedMetricsCount = useMemo(() => localFilters.metrics?.length || 0, [localFilters.metrics]);

    const totalYears = useMemo(() => availableData.years?.length || 0, [availableData.years]);
    const totalCategories = useMemo(() => availableData.categories?.length || 0, [availableData.categories]);
    const totalShops = useMemo(() => availableData.shops?.length || 0, [availableData.shops]);
    const totalMetrics = useMemo(() => availableData.metrics?.length || 0, [availableData.metrics]);

    return (
        <div className={styles.analyticsFilters}>
            {/* Компактный заголовок */}
            <div className={`card-header ${styles.filtersHeader}`}>
                <h6 className="mb-0">
                    Фильтры данных
                </h6>
                <small className={styles.filtersSummary}>
                    {selectedYearsCount}/{totalYears} лет, 
                    {selectedCategoriesCount}/{totalCategories} категорий, 
                    {selectedShopsCount}/{totalShops} магазинов, 
                    {selectedMetricsCount}/{totalMetrics} метрик
                </small>
            </div>

            <div className={styles.filtersGrid}>
                    {/* Компактные фильтры */}
                    <div className={styles.filterCard}>
                        <div className={styles.filterCardHeader}>
                            <span className={styles.filterCardTitle}>Годы</span>
                            <div className={styles.filterCardActions}>
                                <button 
                                    className={styles.filterActionBtn}
                                    onClick={selectAllYears}
                                    title="Выбрать все годы"
                                >
                                    Все
                                </button>
                                <button 
                                    className={`${styles.filterActionBtn} ${styles.filterActionBtnSecondary}`}
                                    onClick={clearAllYears}
                                    title="Очистить выбор"
                                >
                                    Очистить
                                </button>
                            </div>
                        </div>
                        <div className={styles.filterCardBody}>
                            <SearchableSelect
                                options={availableData.years}
                                value={localFilters.years || []}
                                onChange={handleYearsChange}
                                placeholder="Годы..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />
                            <div className={styles.filterCardFooter}>
                                <span className={styles.filterCardFooterText}>Выбрано: {localFilters.years?.length || 0}</span>
                            </div>
                        </div>

                    </div>

                    <div className={styles.filterCard}>
                        <div className={styles.filterCardHeader}>
                            <span className={styles.filterCardTitle}>Категории</span>
                            <div className={styles.filterCardActions}>
                                <button 
                                    className={styles.filterActionBtn}
                                    onClick={selectAllCategories}
                                    title="Выбрать все категории"
                                >
                                    Все
                                </button>
                                <button 
                                    className={`${styles.filterActionBtn} ${styles.filterActionBtnSecondary}`}
                                    onClick={clearAllCategories}
                                    title="Очистить выбор"
                                >
                                    Очистить
                                </button>
                            </div>
                        </div>
                        <div className={styles.filterCardBody}>
                            <SearchableSelect 
                                options={availableData.categories}
                                value={localFilters.categories || []}
                                onChange={handleCategoriesChange}
                                placeholder="Категории..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />
                            <div className={styles.filterCardFooter}>
                                <span className={styles.filterCardFooterText}>Выбрано: {localFilters.categories?.length || 0}</span>
                            </div>
                        </div>

                    </div>

                    <div className={styles.filterCard}>
                        <div className={styles.filterCardHeader}>
                            <span className={styles.filterCardTitle}>Магазины</span>
                            <div className={styles.filterCardActions}>
                                <button 
                                    className={styles.filterActionBtn}
                                    onClick={selectAllShops}
                                    title="Выбрать все магазины"
                                >
                                    Все
                                </button>
                                <button 
                                    className={`${styles.filterActionBtn} ${styles.filterActionBtnSecondary}`}
                                    onClick={clearAllShops}
                                    title="Очистить выбор"
                                >
                                    Очистить
                                </button>
                            </div>
                        </div>
                        <div className={styles.filterCardBody}>
                            <SearchableSelect 
                                options={availableData.shops}
                                value={localFilters.shops || []}
                                onChange={handleShopsChange}
                                placeholder="Магазины..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />
                            <div className={styles.filterCardFooter}>
                                <span className={styles.filterCardFooterText}>Выбрано: {localFilters.shops?.length || 0}</span>
                            </div>
                        </div>

                    </div>

                    <div className={styles.filterCard}>
                        <div className={styles.filterCardHeader}>
                            <span className={styles.filterCardTitle}>Показатели</span>
                            <div className={styles.filterCardActions}>
                                <button 
                                    className={styles.filterActionBtn}
                                    onClick={() => handleMetricsChange(['actual', 'plan', 'deviation', 'percentage'])}
                                    title="Выбрать все показатели"
                                >
                                    Все
                                </button>
                                <button 
                                    className={`${styles.filterActionBtn} ${styles.filterActionBtnSecondary}`}
                                    onClick={() => handleMetricsChange([])}
                                    title="Очистить выбор"
                                >
                                    Очистить
                                </button>
                            </div>
                        </div>
                        <div className={styles.filterCardBody}>
                            <div className={styles.metricsToggles}>
                                <div className={styles.toggleItem}>
                                    <span className={styles.toggleText}>Факт</span>
                                    <label className={`toggle-switch ${localFilters.metrics?.includes('actual') ? styles.active : ''}`}>
                                        <input
                                            className="toggle-input"
                                            type="checkbox"
                                            checked={localFilters.metrics?.includes('actual') || false}
                                            onChange={() => toggleMetric('actual')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                
                                <div className={styles.toggleItem}>
                                    <span className={styles.toggleText}>План</span>
                                    <label className={`toggle-switch ${localFilters.metrics?.includes('plan') ? styles.active : ''}`}>
                                        <input
                                            className="toggle-input"
                                            type="checkbox"
                                            checked={localFilters.metrics?.includes('plan') || false}
                                            onChange={() => toggleMetric('plan')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                
                                <div className={styles.toggleItem}>
                                    <span className={styles.toggleText}>Отклонение</span>
                                    <label className={`toggle-switch ${localFilters.metrics?.includes('deviation') ? styles.active : ''}`}>
                                        <input
                                            className="toggle-input"
                                            type="checkbox"
                                            checked={localFilters.metrics?.includes('deviation') || false}
                                            onChange={() => toggleMetric('deviation')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                
                                <div className={styles.toggleItem}>
                                    <span className={styles.toggleText}>Процент</span>
                                    <label className={`toggle-switch ${localFilters.metrics?.includes('percentage') ? styles.active : ''}`}>
                                        <input
                                            className="toggle-input"
                                            type="checkbox"
                                            checked={localFilters.metrics?.includes('percentage') || false}
                                            onChange={() => toggleMetric('percentage')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
        </div>
    );
};

export default AnalyticsFilters; 
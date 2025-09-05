import React, { useMemo, useState, useCallback } from 'react';
import SearchableSelect from '../ui/SearchableSelect';
import styles from './AnalyticsFilters.module.css';

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
 * Позволяет выбирать года, категории, магазины и метрики для анализа.
 */
const AnalyticsFilters = ({ filters, onChange, availableData, isLoading }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [hoveredMetric, setHoveredMetric] = useState(null);
    
    if (dev) {
        console.log('🔍 AnalyticsFilters render:', { filters, availableData, isLoading });
    }

    if (!availableData || !availableData.years) {
        if (dev) {
            console.warn('⚠️ AnalyticsFilters: availableData не загружены');
        }
        return (
            <div className="card p-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Загрузка...</span>
                    </div>
                    <p className="mt-2 mb-0">Загрузка фильтров...</p>
                </div>
            </div>
        );
    }

    const handleYearsChange = useCallback((selectedYears) => {
        onChange({
            ...filters,
            years: selectedYears
        });
    }, [filters, onChange]);

    const handleCategoriesChange = useCallback((selectedCategories) => {
        onChange({
            ...filters,
            categories: selectedCategories
        });
    }, [filters, onChange]);

    const handleShopsChange = useCallback((selectedShops) => {
        onChange({
            ...filters,
            shops: selectedShops
        });
    }, [filters, onChange]);

    const handleMetricsChange = useCallback((selectedMetrics) => {
        onChange({
            ...filters,
            metrics: selectedMetrics
        });
    }, [filters, onChange]);

    const selectAllYears = useCallback(() => {
        const allYears = availableData.years.map(year => year.id);
        handleYearsChange(allYears);
    }, [availableData.years, handleYearsChange]);

    const clearAllYears = useCallback(() => {
        handleYearsChange([]);
    }, [handleYearsChange]);

    const selectAllCategories = useCallback(() => {
        const allCategories = availableData.categories.map(cat => cat.id);
        handleCategoriesChange(allCategories);
    }, [availableData.categories, handleCategoriesChange]);

    const clearAllCategories = useCallback(() => {
        handleCategoriesChange([]);
    }, [handleCategoriesChange]);

    const selectAllShops = useCallback(() => {
        const allShops = availableData.shops.map(shop => shop.id);
        handleShopsChange(allShops);
    }, [availableData.shops, handleShopsChange]);

    const clearAllShops = useCallback(() => {
        handleShopsChange([]);
    }, [handleShopsChange]);

    const selectAllMetrics = useCallback(() => {
        const allMetrics = availableData.metrics.map(metric => metric.id);
        handleMetricsChange(allMetrics);
    }, [availableData.metrics, handleMetricsChange]);

    const clearAllMetrics = useCallback(() => {
        handleMetricsChange([]);
    }, [handleMetricsChange]);

    const toggleMetric = useCallback((metricId) => {
        const currentMetrics = filters.metrics || [];
        const newMetrics = currentMetrics.includes(metricId)
            ? currentMetrics.filter(id => id !== metricId)
            : [...currentMetrics, metricId];
        handleMetricsChange(newMetrics);
    }, [filters.metrics, handleMetricsChange]);

    // Мемоизированные вычисления
    const selectedYearsCount = useMemo(() => filters.years?.length || 0, [filters.years]);
    const selectedCategoriesCount = useMemo(() => filters.categories?.length || 0, [filters.categories]);
    const selectedShopsCount = useMemo(() => filters.shops?.length || 0, [filters.shops]);
    const selectedMetricsCount = useMemo(() => filters.metrics?.length || 0, [filters.metrics]);

    const totalYears = useMemo(() => availableData.years?.length || 0, [availableData.years]);
    const totalCategories = useMemo(() => availableData.categories?.length || 0, [availableData.categories]);
    const totalShops = useMemo(() => availableData.shops?.length || 0, [availableData.shops]);
    const totalMetrics = useMemo(() => availableData.metrics?.length || 0, [availableData.metrics]);

    return (
        <div className={styles.analyticsFilters}>
            {/* Компактный заголовок */}
            <div className={styles.filtersHeader}>
                <h5 className={styles.filtersTitle}>
                    Фильтры данных
                </h5>
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
                                value={filters.years || []}
                                onChange={handleYearsChange}
                                placeholder="Годы..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />
                            <div className={styles.filterCardFooter}>
                                <span className={styles.filterCardFooterText}>
                                    Выбрано: {filters.years?.length || 0}
                                </span>
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
                                value={filters.categories || []}
                                onChange={handleCategoriesChange}
                                placeholder="Категории..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />
                            <div className={styles.filterCardFooter}>
                                <span className={styles.filterCardFooterText}>
                                    Выбрано: {filters.categories?.length || 0}
                                </span>
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
                                value={filters.shops || []}
                                onChange={handleShopsChange}
                                placeholder="Магазины..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />
                            <div className={styles.filterCardFooter}>
                                <span className={styles.filterCardFooterText}>
                                    Выбрано: {filters.shops?.length || 0}
                                </span>
                            </div>
                        </div>

                    </div>

                    <div className={styles.filterCard}>
                        <div className={styles.filterCardHeader}>
                            <span className={styles.filterCardTitle}>Метрики</span>
                            <div className={styles.filterCardActions}>
                                <button 
                                    className={styles.filterActionBtn}
                                    onClick={() => handleMetricsChange(['fact', 'plan', 'deviation', 'percentage'])}
                                    title="Выбрать все метрики"
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
                                    <label className={`${styles.toggleSwitch} ${filters.metrics?.includes('fact') ? styles.active : ''}`}>
                                        <input
                                            className={styles.toggleInput}
                                            type="checkbox"
                                            checked={filters.metrics?.includes('fact') || false}
                                            onChange={() => toggleMetric('fact')}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </label>
                                </div>
                                
                                <div className={styles.toggleItem}>
                                    <span className={styles.toggleText}>План</span>
                                    <label className={`${styles.toggleSwitch} ${filters.metrics?.includes('plan') ? styles.active : ''}`}>
                                        <input
                                            className={styles.toggleInput}
                                            type="checkbox"
                                            checked={filters.metrics?.includes('plan') || false}
                                            onChange={() => toggleMetric('plan')}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </label>
                                </div>
                                
                                <div className={styles.toggleItem}>
                                    <span className={styles.toggleText}>Отклонение</span>
                                    <label className={`${styles.toggleSwitch} ${filters.metrics?.includes('deviation') ? styles.active : ''}`}>
                                        <input
                                            className={styles.toggleInput}
                                            type="checkbox"
                                            checked={filters.metrics?.includes('deviation') || false}
                                            onChange={() => toggleMetric('deviation')}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </label>
                                </div>
                                
                                <div className={styles.toggleItem}>
                                    <span className={styles.toggleText}>Процент</span>
                                    <label className={`${styles.toggleSwitch} ${filters.metrics?.includes('percentage') ? styles.active : ''}`}>
                                        <input
                                            className={styles.toggleInput}
                                            type="checkbox"
                                            checked={filters.metrics?.includes('percentage') || false}
                                            onChange={() => toggleMetric('percentage')}
                                        />
                                        <span className={styles.toggleSlider}></span>
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
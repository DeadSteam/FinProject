import React, { useCallback } from 'react';
import SearchableSelect from '../ui/SearchableSelect';
import './ComparisonFilters.css';

/**
 * Компонент фильтров для слайда сравнения.
 * Использует паттерны из AnalyticsFilters и стили из SlideEditor.css
 */
const ComparisonFilters = ({ 
    filters = {}, 
    availableData = {}, 
    onFiltersChange, 
    isLoading = false 
}) => {

    // Обработчики изменения фильтров (паттерн из AnalyticsFilters)
    const handleYearsChange = useCallback((selectedYears) => {
        onFiltersChange({
            ...filters,
            years: selectedYears
        });
    }, [filters, onFiltersChange]);

    const handleCategoriesChange = useCallback((selectedCategories) => {
        onFiltersChange({
            ...filters,
            categories: selectedCategories
        });
    }, [filters, onFiltersChange]);

    const handleShopsChange = useCallback((selectedShops) => {
        onFiltersChange({
            ...filters,
            shops: selectedShops
        });
    }, [filters, onFiltersChange]);

    // Обработчик для тумблеров метрик (как в AnalyticsFilters)
    const handleMetricsChange = useCallback((selectedMetrics) => {
        onFiltersChange({
            ...filters,
            metrics: selectedMetrics
        });
    }, [filters, onFiltersChange]);

    const toggleMetric = useCallback((metricId) => {
        const currentMetrics = filters.metrics || [];
        const newMetrics = currentMetrics.includes(metricId)
            ? currentMetrics.filter(id => id !== metricId)
            : [...currentMetrics, metricId];
        handleMetricsChange(newMetrics);
    }, [filters.metrics, handleMetricsChange]);

    // Функции выбора всех/очистки (паттерн из AnalyticsFilters)
    const selectAllYears = useCallback(() => {
        const allYears = availableData.years?.map(y => y.id) || [];
        handleYearsChange(allYears);
    }, [availableData.years, handleYearsChange]);

    const clearAllYears = useCallback(() => {
        handleYearsChange([]);
    }, [handleYearsChange]);

    const selectAllCategories = useCallback(() => {
        const allCategories = availableData.categories?.map(c => c.id) || [];
        handleCategoriesChange(allCategories);
    }, [availableData.categories, handleCategoriesChange]);

    const clearAllCategories = useCallback(() => {
        handleCategoriesChange([]);
    }, [handleCategoriesChange]);

    const selectAllShops = useCallback(() => {
        const allShops = availableData.shops?.map(s => s.id) || [];
        handleShopsChange(allShops);
    }, [availableData.shops, handleShopsChange]);

    const clearAllShops = useCallback(() => {
        handleShopsChange([]);
    }, [handleShopsChange]);



    // Проверка доступности данных
    if (!availableData || !availableData.years) {
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

    // Подсчет выбранных элементов
    const totalYears = filters.years?.length || 0;
    const totalCategories = filters.categories?.length || 0;
    const totalShops = filters.shops?.length || 0;
    const totalMetrics = filters.metrics?.length || 0;



    return (
        <div className="card">
            <div className="card-header">
                <h6 className="mb-0">Фильтры для сравнения</h6>
            </div>
            <div className="card-body">
                    <div className="filters-summary mb-3">
                        <small className="text-muted">
                            {totalYears} лет, {totalCategories} категорий, {totalShops} магазинов, {totalMetrics} показателей
                        </small>
                    </div>

                    {/* Содержимое фильтров */}
                    <div className="filters-grid">
                        {/* Фильтр по годам */}
                    <div className="filter-card">
                        <div className="filter-card-header">
                            <span className="filter-card-title">Годы</span>
                            <div className="filter-card-actions">
                                <button 
                                    className="filter-action-btn"
                                    onClick={selectAllYears}
                                    title="Выбрать все годы"
                                >
                                    Все
                                </button>
                                <button 
                                    className="filter-action-btn filter-action-btn-secondary"
                                    onClick={clearAllYears}
                                    title="Очистить выбор"
                                >
                                    Очистить
                                </button>
                            </div>
                        </div>
                        <div className="filter-card-body">
                            <SearchableSelect
                                options={availableData.years || []}
                                value={filters.years || []}
                                onChange={handleYearsChange}
                                placeholder="Годы..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />

                            <div className="filter-card-footer">
                                <span className="filter-card-footer-text">
                                    Выбрано: {filters.years?.length || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Фильтр по категориям */}
                    <div className="filter-card">
                        <div className="filter-card-header">
                            <span className="filter-card-title">Категории</span>
                            <div className="filter-card-actions">
                                <button 
                                    className="filter-action-btn"
                                    onClick={selectAllCategories}
                                    title="Выбрать все категории"
                                >
                                    Все
                                </button>
                                <button 
                                    className="filter-action-btn filter-action-btn-secondary"
                                    onClick={clearAllCategories}
                                    title="Очистить выбор"
                                >
                                    Очистить
                                </button>
                            </div>
                        </div>
                        <div className="filter-card-body">
                            <SearchableSelect
                                options={availableData.categories || []}
                                value={filters.categories || []}
                                onChange={handleCategoriesChange}
                                placeholder="Категории..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />

                            <div className="filter-card-footer">
                                <span className="filter-card-footer-text">
                                    Выбрано: {filters.categories?.length || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Фильтр по магазинам */}
                    <div className="filter-card">
                        <div className="filter-card-header">
                            <span className="filter-card-title">Магазины</span>
                            <div className="filter-card-actions">
                                <button 
                                    className="filter-action-btn"
                                    onClick={selectAllShops}
                                    title="Выбрать все магазины"
                                >
                                    Все
                                </button>
                                <button 
                                    className="filter-action-btn filter-action-btn-secondary"
                                    onClick={clearAllShops}
                                    title="Очистить выбор"
                                >
                                    Очистить
                                </button>
                            </div>
                        </div>
                        <div className="filter-card-body">
                            <SearchableSelect
                                options={availableData.shops || []}
                                value={filters.shops || []}
                                onChange={handleShopsChange}
                                placeholder="Магазины..."
                                multiple={true}
                                loading={isLoading}
                                valueKey="id"
                                labelKey="name"
                                size="sm"
                            />

                            <div className="filter-card-footer">
                                <span className="filter-card-footer-text">
                                    Выбрано: {filters.shops?.length || 0}
                                </span>
                            </div>
                        </div>
                    </div>


                    {/* Фильтр по метрикам - тумблеры */}
                    <div className="filter-card">
                        <div className="filter-card-header">
                            <span className="filter-card-title">Показатели</span>
                            <div className="filter-card-actions">
                                <button 
                                    className="filter-action-btn"
                                    onClick={() => handleMetricsChange(['fact', 'plan', 'deviation', 'percentage'])}
                                    title="Выбрать все показатели"
                                >
                                    Все
                                </button>
                                <button 
                                    className="filter-action-btn filter-action-btn-secondary"
                                    onClick={() => handleMetricsChange([])}
                                    title="Очистить выбор"
                                >
                                    Очистить
                                </button>
                            </div>
                        </div>
                        <div className="filter-card-body">
                            <div className="metrics-toggles">
                                <div className="toggle-item">
                                    <span className="toggle-text">Факт</span>
                                    <label className={`toggle-switch ${filters.metrics?.includes('fact') ? 'active' : ''}`}>
                                        <input
                                            className="toggle-input"
                                            type="checkbox"
                                            checked={filters.metrics?.includes('fact') || false}
                                            onChange={() => toggleMetric('fact')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                
                                <div className="toggle-item">
                                    <span className="toggle-text">План</span>
                                    <label className={`toggle-switch ${filters.metrics?.includes('plan') ? 'active' : ''}`}>
                                        <input
                                            className="toggle-input"
                                            type="checkbox"
                                            checked={filters.metrics?.includes('plan') || false}
                                            onChange={() => toggleMetric('plan')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                
                                <div className="toggle-item">
                                    <span className="toggle-text">Отклонение</span>
                                    <label className={`toggle-switch ${filters.metrics?.includes('deviation') ? 'active' : ''}`}>
                                        <input
                                            className="toggle-input"
                                            type="checkbox"
                                            checked={filters.metrics?.includes('deviation') || false}
                                            onChange={() => toggleMetric('deviation')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                                
                                <div className="toggle-item">
                                    <span className="toggle-text">Процент</span>
                                    <label className={`toggle-switch ${filters.metrics?.includes('percentage') ? 'active' : ''}`}>
                                        <input
                                            className="toggle-input"
                                            type="checkbox"
                                            checked={filters.metrics?.includes('percentage') || false}
                                            onChange={() => toggleMetric('percentage')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div className="filter-card-footer">
                                <span className="filter-card-footer-text">
                                    Выбрано: {totalMetrics}
                                </span>
                            </div>
                        </div>
                    </div>
                    </div> {/* Закрытие filters-grid */}
            </div>
        </div>
    );
};

export default ComparisonFilters;

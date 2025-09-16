import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { useNotifications } from '../../hooks';
import reportsService from '../../services/reportsService';
import AnalyticsFilters from '../../components/analytics/AnalyticsFilters';
import './SlideFilters.css';
import '../../styles/components/toggle.css';
import { dev } from '../../utils/env';

/**
 * Компонент фильтров для слайдов.
 * Предоставляет интерфейс для настройки фильтров в зависимости от типа слайда.
 */
const SlideFilters = ({
    slideType,
    filters = {},
    availableData = {},
    onFiltersChange
}) => {
    const { showError } = useNotifications();
    
    // Локальное состояние фильтров
    const [localFilters, setLocalFilters] = useState(filters);
    
    // Обновляем локальные фильтры при изменении пропса
    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    // Инициализируем метрики при загрузке только если нет выбранной категории
    useEffect(() => {
        if (availableData.metrics && availableData.metrics.length > 0 && 
            (!localFilters.category || localFilters.category === 'all')) {
            setCategoryMetrics(availableData.metrics);
        }
    }, [availableData.metrics, localFilters.category]);


    // Состояние для метрик текущей категории
    const [categoryMetrics, setCategoryMetrics] = useState([]);
    const [loadingMetrics, setLoadingMetrics] = useState(false);

    // Функция для загрузки метрик по категории
    const loadMetricsForCategory = useCallback(async (categoryId) => {
        if (!categoryId || categoryId === 'all') {
            setCategoryMetrics(availableData.metrics || []);
            return;
        }

        setLoadingMetrics(true);
        try {
            const metrics = await reportsService.getMetricsForCategory(categoryId);
            setCategoryMetrics(Array.isArray(metrics) ? metrics : (availableData.metrics || []));
        } catch (e) {
            if (dev) console.warn('Не удалось загрузить метрики для категории:', e);
            setCategoryMetrics(availableData.metrics || []);
        } finally {
            setLoadingMetrics(false);
        }
    }, [availableData.metrics]);

    // Дебаунс для загрузки метрик
    const debouncedLoadMetrics = useCallback(
        debounce((categoryId) => {
            loadMetricsForCategory(categoryId);
        }, 300),
        [loadMetricsForCategory]
    );

    // Загружаем метрики при изменении категории
    useEffect(() => {
        if (localFilters.category && localFilters.category !== 'all') {
            debouncedLoadMetrics(localFilters.category);
        } else if (localFilters.category === 'all' || !localFilters.category) {
            setCategoryMetrics(availableData.metrics || []);
        }
    }, [localFilters.category, availableData.metrics, debouncedLoadMetrics]);

    // Обработчики изменений фильтров
    const handleFilterChange = useCallback((filterKey, value) => {
        const newFilters = {
            ...localFilters,
            [filterKey]: value
        };
        
        // Сбрасываем метрику при изменении категории
        if (filterKey === 'category') {
            newFilters.metric = 'all';
            // Обновляем массив категорий для совместимости с ReportDataProvider
            newFilters.categories = value !== 'all' ? [value] : [];
        }
        
        // Обновляем массив магазинов для совместимости с ReportDataProvider
        if (filterKey === 'shop') {
            newFilters.shops = value !== 'all' ? [value] : [];
        }
        
        // Обновляем массив годов для совместимости с ReportDataProvider
        if (filterKey === 'year') {
            newFilters.years = value ? [value] : [];
        }
        
        setLocalFilters(newFilters);
        onFiltersChange?.(newFilters);
        
    }, [localFilters, onFiltersChange, availableData.metrics]);

    const handleMultipleFilterChange = useCallback((updates) => {
        const newFilters = {
            ...localFilters,
            ...updates
        };
        
        setLocalFilters(newFilters);
        onFiltersChange?.(newFilters);
        
    }, [localFilters, onFiltersChange]);

    // Рендеринг фильтров в зависимости от типа слайда
    const renderFilters = () => {
        switch (slideType) {
            case 'title':
                return (
                    <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        Титульные слайды не требуют фильтров
                    </div>
                );

            case 'analytics-chart':
            case 'analytics-table':
                return renderAnalyticsFilters();

            case 'finance-chart':
            case 'finance-table':
                return renderFinanceFilters();

            case 'comparison-table':
                return renderComparisonFilters();

            case 'comparison':
                return renderComparisonFilters();

            case 'trends':
                return renderTrendsFilters();

            case 'plan-vs-actual':
                return renderPlanVsActualFilters();

            default:
                return (
                    <div className="alert alert-warning">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Фильтры для данного типа слайда не реализованы
                    </div>
                );
        }
    };

    // Фильтры для аналитики
    const renderAnalyticsFilters = () => {
        return (
            <div className="card">
                <div className="card-header">
                    <h6 className="mb-0">Фильтры аналитики</h6>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Период</label>
                                <div className="row">
                                    <div className="col-6">
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={localFilters.startDate || ''}
                                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={localFilters.endDate || ''}
                                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Метрика</label>
                                <select
                                    className="form-select"
                                    value={localFilters.metric || 'all'}
                                    onChange={(e) => handleFilterChange('metric', e.target.value)}
                                >
                                    <option value="all">Все метрики</option>
                                    {(availableData.metrics || []).map(metric => (
                                        <option key={metric.id} value={metric.id}>
                                            {metric.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Фильтры для финансов
    const renderFinanceFilters = () => {
        return (
            <div className="card">
                <div className="card-header">
                    <h6 className="mb-0">Фильтры финансов</h6>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-4">
                            <div className="mb-3">
                                <label className="form-label">Год</label>
                                <select
                                    className="form-select"
                                    value={localFilters.year || new Date().getFullYear().toString()}
                                    onChange={(e) => handleFilterChange('year', e.target.value)}
                                >
                                    {(availableData.years || []).map(year => (
                                        <option key={year.id} value={year.id}>
                                            {year.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="col-md-4">
                            <div className="mb-3">
                                <label className="form-label">Магазин {slideType.includes('finance') ? '*' : ''}</label>
                                <select
                                    className="form-select"
                                    value={localFilters.shop || 'all'}
                                    onChange={(e) => handleFilterChange('shop', e.target.value)}
                                    required={slideType.includes('finance')}
                                >
                                    <option value="all">Все магазины</option>
                                    {(availableData.shops || []).map(shop => (
                                        <option key={shop.id} value={shop.id}>
                                            {shop.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="col-md-4">
                            <div className="mb-3">
                                <label className="form-label">Категория {slideType.includes('finance') ? '*' : ''}</label>
                                <select
                                    className="form-select"
                                    value={localFilters.category || 'all'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        handleFilterChange('category', value);
                                    }}
                                    required={slideType.includes('finance')}
                                >
                                    <option value="all">Все категории</option>
                                    {(availableData.categories || []).map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Метрики и тумблеры в одной строке */}
                    <div className="row">
                        <div className="col-md-4">
                            <div className="mb-3">
                                <label className="form-label">Метрики</label>
                                <select
                                    className="form-select"
                                    value={localFilters.metric || 'all'}
                                    onChange={(e) => handleFilterChange('metric', e.target.value)}
                                    disabled={false}
                                >
                                    <option value="all">Все метрики</option>
                                    {loadingMetrics ? (
                                        <option value="" disabled>Загрузка метрик...</option>
                                    ) : (
                                        (categoryMetrics || [])
                                            .map(metric => (
                                                <option key={metric.id} value={metric.id}>
                                                    {metric.name}
                                                </option>
                                            ))
                                    )}
                                </select>
                            </div>
                        </div>
                        
                        <div className="col-md-8">
                            <div className="mb-3">
                                <label className="form-label">Показывать данные</label>
                                <div className="metrics-toggles">
                                    <div className="toggle-item">
                                        <span className="toggle-text">План</span>
                                        <label className={`toggle-switch ${localFilters.showPlan !== false ? 'active' : ''}`}>
                                            <input
                                                className="toggle-input"
                                                type="checkbox"
                                                checked={localFilters.showPlan !== false}
                                                onChange={(e) => handleFilterChange('showPlan', e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    
                                    <div className="toggle-item">
                                        <span className="toggle-text">Факт</span>
                                        <label className={`toggle-switch ${localFilters.showFact !== false ? 'active' : ''}`}>
                                            <input
                                                className="toggle-input"
                                                type="checkbox"
                                                checked={localFilters.showFact !== false}
                                                onChange={(e) => handleFilterChange('showFact', e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    
                                    <div className="toggle-item">
                                        <span className="toggle-text">Отклонение</span>
                                        <label className={`toggle-switch ${localFilters.showDeviation === true ? 'active' : ''}`}>
                                            <input
                                                className="toggle-input"
                                                type="checkbox"
                                                checked={localFilters.showDeviation === true}
                                                onChange={(e) => handleFilterChange('showDeviation', e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                    
                                    <div className="toggle-item">
                                        <span className="toggle-text">Процент</span>
                                        <label className={`toggle-switch ${localFilters.showPercentage === true ? 'active' : ''}`}>
                                            <input
                                                className="toggle-input"
                                                type="checkbox"
                                                checked={localFilters.showPercentage === true}
                                                onChange={(e) => handleFilterChange('showPercentage', e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Фильтры для сравнения
    const renderComparisonFilters = () => {
        return (
            <div className="reports-filters-adapter">
                <AnalyticsFilters
                    filters={localFilters}
                    onChange={handleMultipleFilterChange}
                    availableData={availableData}
                    isLoading={false}
                />
            </div>
        );
    };

    // Фильтры для трендов (переиспользуем ComparisonFilters)
    const renderTrendsFilters = () => {
        // Полное переиспользование тех же фильтров, что и у сравнения
        return (
            <div className="reports-filters-adapter">
                <AnalyticsFilters
                    filters={localFilters}
                    onChange={handleMultipleFilterChange}
                    availableData={availableData}
                    isLoading={false}
                />
            </div>
        );
    };

    // Фильтры для план vs факт (переиспользуем ComparisonFilters)
    const renderPlanVsActualFilters = () => {
        return (
            <div className="reports-filters-adapter">
                <AnalyticsFilters
                    filters={localFilters}
                    onChange={handleMultipleFilterChange}
                    availableData={availableData}
                    isLoading={false}
                />
            </div>
        );
    };

    return (
        <div className="slide-filters">
            {renderFilters()}
        </div>
    );
};

export default SlideFilters;


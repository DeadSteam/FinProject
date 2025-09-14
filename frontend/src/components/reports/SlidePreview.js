import React, { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../hooks';
import { useReportData } from './ReportDataProvider';
import { hasDataToDisplay, createSafeFilters, hasSelectedFilters } from './utils/filterUtils';
import SlideRenderer from './SlideRenderer';
import AnalyticsComparison from '../analytics/AnalyticsComparison';
import './SlidePreview.css';

// Импортируем EmptySlidePlaceholder из SlideRenderer
import { EmptySlidePlaceholder } from './SlideRenderer';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();


/**
 * Компонент таблицы сравнения с фильтрами аналитики
 */
const ComparisonTableSlide = ({ title, description, filters: externalFilters = {}, onGoToSettings }) => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Загрузка данных аналитики только при наличии фильтров
    useEffect(() => {
        const loadAnalyticsData = async () => {
            try {
                setIsLoading(true);
                
                const token = localStorage.getItem('authToken');
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                // Используем переданные фильтры или пустые значения
                const safeFilters = createSafeFilters(externalFilters);
                
                // Если нет выбранных фильтров, не загружаем данные
                if (!hasSelectedFilters(safeFilters)) {
                    setAnalyticsData(null);
                    return;
                }

                const params = new URLSearchParams();
                if (safeFilters.years.length > 0) {
                    params.append('years', safeFilters.years.join(','));
                }
                if (safeFilters.categories.length > 0) {
                    params.append('categories', safeFilters.categories.join(','));
                }
                if (safeFilters.shops.length > 0) {
                    params.append('shops', safeFilters.shops.join(','));
                }
                if (safeFilters.metrics.length > 0) {
                    params.append('metrics', safeFilters.metrics.join(','));
                }

                const url = `/api/v1/finance/analytics/comprehensive?${params}`;
                const response = await fetch(url, { headers });

                if (response.ok) {
                    const data = await response.json();
                    setAnalyticsData(data);
                }
            } catch (error) {
                console.error('Ошибка загрузки аналитических данных:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAnalyticsData();
    }, []);

    // Фильтры: используем только переданные из настроек слайда
    const safeExternal = createSafeFilters(externalFilters || {});
    const effectiveFilters = { ...safeExternal, viewMode: 'table' };

    return (
        <div className="comparison-table-slide-preview">
            <div className="slide-header">
                <h2 className="slide-title">{title || 'Таблица сравнения'}</h2>
                {description && <p className="slide-description">{description}</p>}
            </div>
            
            <div className="comparison-table-content">
                {/* Таблица сравнения */}
                <div className="table-section">
                    {hasSelectedFilters(effectiveFilters) && analyticsData ? (
                    <AnalyticsComparison
                        analyticsData={analyticsData}
                        filters={effectiveFilters}
                        isLoading={isLoading}
                        showTable={true}
                        showControls={false}
                        showSummary={false}
                        showHeader={false}
                    />
                    ) : (
                        <EmptySlidePlaceholder 
                            type="table"
                            title="Нет данных для отображения"
                            description="Выберите параметры фильтрации или загрузите данные для создания таблицы сравнения"
                            onGoToSettings={onGoToSettings}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Компонент предпросмотра слайда с графиками и данными
 */
const SlidePreview = ({ 
    slideType, 
    title, 
    description,
    settings = {}, 
    filters = {}, 
    previewData, 
    isLoading, 
    availableData = {}, 
    onRefreshData,
    onGoToSettings,
    disableAnimations = false
}) => {
    const { showError } = useNotifications();
    const { loadSlideData, transformDataForChart } = useReportData();
    
    const [data, setData] = useState(previewData);
    const [loading, setLoading] = useState(isLoading);

    // Загрузка данных при изменении фильтров
    useEffect(() => {
        if (slideType !== 'title' && filters) {
            loadData();
        }
    }, [slideType, filters, loadData]);

    const loadData = useCallback(async () => {
        if (slideType === 'title') {
            setData({ type: 'title' });
            return;
        }


        setLoading(true);
        
        try {
            let normalizedFilters = {
                ...filters,
                years: (filters?.years || []).map((y) => (y?.value ?? y?.id ?? y)),
                categories: (filters?.categories || []).map((c) => (c?.value ?? c?.id ?? c)),
                shops: (filters?.shops || []).map((s) => (s?.value ?? s?.id ?? s)),
                metrics: (filters?.metrics || []).map((m) => (m?.value ?? m?.id ?? m)),
                periodType: filters?.periodType || 'years'
            };

            // Для слайда трендов используем только переданные фильтры
            if (slideType === 'trends') {
                // Не устанавливаем дефолтные фильтры
            }

            if (dev) console.log('[SlidePreview] loadData()', { slideType, normalizedFilters, settings });
            const slideData = await loadSlideData(slideType, normalizedFilters, settings);
            
            if (slideData) {
                if (dev) console.log('[SlidePreview] raw slideData:', {
                    keys: Object.keys(slideData || {}),
                    chartDataLen: Array.isArray(slideData.chartData) ? slideData.chartData.length : 'n/a',
                    metricsLen: Array.isArray(slideData.metrics) ? slideData.metrics.length : 'n/a',
                    periodsLen: Array.isArray(slideData.periods) ? slideData.periods.length : 'n/a',
                    tableDataLen: Array.isArray(slideData.tableData) ? slideData.tableData.length : 'n/a'
                });
                // Определяем метрики для отображения
                let selectedMetrics = ['plan', 'actual']; // По умолчанию
                if (filters?.metrics && filters.metrics.length > 0) {
                    // Используем выбранные пользователем метрики
                    selectedMetrics = filters.metrics.map(m => m?.value ?? m?.id ?? m);
                }
                
                
                const transformedData = transformDataForChart(
                    slideData, 
                    slideType, 
                    selectedMetrics
                );
                
                const prepared = {
                    ...slideData,
                    chartData: transformedData,
                    tableData: slideData.tableData || slideData.metrics || []
                };
                if (dev) console.log('[SlidePreview] prepared data for render:', {
                    chartDataLen: Array.isArray(prepared.chartData) ? prepared.chartData.length : 'n/a',
                    metricsLen: Array.isArray(prepared.metrics) ? prepared.metrics.length : 'n/a',
                    periodsLen: Array.isArray(prepared.periods) ? prepared.periods.length : 'n/a',
                    tableDataLen: Array.isArray(prepared.tableData) ? prepared.tableData.length : 'n/a'
                });
                setData(prepared);
            } else {
                setData(null);
            }
        } catch (error) {
            if (dev) console.error('Ошибка загрузки данных предпросмотра:', error);
            showError('Ошибка загрузки данных для предпросмотра');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [slideType, filters, settings, loadSlideData, transformDataForChart, showError]);

    // Специальная обработка для comparison-table
    if (slideType === 'comparison-table') {
        return (
            <ComparisonTableSlide
                title={title}
                description={description}
                filters={filters}
                onGoToSettings={onGoToSettings}
            />
        );
    }


    return (
        <SlideRenderer
            slideType={slideType}
            title={title}
            description={description}
            settings={settings}
            filters={filters}
            data={data}
            isLoading={loading}
            onGoToSettings={onGoToSettings}
            disableAnimations={disableAnimations}
            showHeader={true}
        />
    );
};

export default SlidePreview;
import React, { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../../hooks';
import { useReportData } from './ReportDataProvider';
import { hasDataToDisplay, createSafeFilters, hasSelectedFilters } from '../../utils/filterUtils';
import SlideRenderer from './SlideRenderer';
import ComparisonChart from '../charts/ComparisonChart';
import BaseChart from '../charts/BaseChart';
import './SlidePreview.css';
import './reports-common.css';
import './reports-layout.css';

// Импортируем EmptySlidePlaceholder из SlideRenderer
import { EmptySlidePlaceholder } from './SlideRenderer';
import { dev } from '../../utils/env';
import { getProcessedSlideData } from './utils/slideDataLoader';


/**
 * Компонент таблицы сравнения с фильтрами аналитики
 */
const ComparisonTableSlide = ({ title, description, filters: externalFilters = {}, onGoToSettings }) => {
    const { loadSlideData } = useReportData();
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Загрузка данных аналитики только при наличии фильтров
    useEffect(() => {
        const loadAnalyticsData = async () => {
            try {
                setIsLoading(true);

                const safeFilters = createSafeFilters(externalFilters);

                // Если нет выбранных фильтров, не загружаем данные
                if (!hasSelectedFilters(safeFilters)) {
                    setAnalyticsData(null);
                    return;
                }

                // Переиспользуем общий провайдер данных
                const data = await loadSlideData('comparison', safeFilters, {});
                setAnalyticsData(data?.analytics || data || null);
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
    const effectiveFilters = { ...safeExternal };

    return (
        <div className="comparison-table-slide-preview">
            <div className="slide-header">
                <h2 className="slide-title">{title || 'Таблица сравнения'}</h2>
                {description && <p className="slide-description">{description}</p>}
            </div>
            
            <div className="comparison-table-content reports-table-container">
                {/* Таблица сравнения */}
                <div className="table-section reports-full-width">
                    {hasSelectedFilters(effectiveFilters) && analyticsData ? (
                        // Для годовых данных используем BaseChart, для квартальных - ComparisonChart
                        effectiveFilters.years && effectiveFilters.years.length > 1 ? (
                            <BaseChart
                                analyticsData={analyticsData}
                                filters={effectiveFilters}
                                isLoading={isLoading}
                                showTable={true}
                                showControls={false}
                                showSummary={false}
                                showHeader={false}
                                viewMode="table"
                                groupBy="years"
                                chartType="bar"
                            />
                        ) : (
                            <ComparisonChart
                                analyticsData={analyticsData}
                                filters={effectiveFilters}
                                isLoading={isLoading}
                                showTable={true}
                                showControls={false}
                                showSummary={false}
                                showHeader={false}
                                viewMode="table"
                                groupBy="quarterly"
                            />
                        )
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
    const { loadSlideData } = useReportData();
    
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
            const processed = await getProcessedSlideData({ type: slideType, content: { filters, settings } }, loadSlideData);
            if (processed) {
                setData(processed);
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
    }, [slideType, filters, settings, loadSlideData, showError]);

    // Проверка фильтров для финансовых слайдов
    const isFinanceSlide = slideType.includes('finance');
    const hasRequiredFilters = isFinanceSlide ? 
        (filters.category && filters.category !== 'all' && filters.shop && filters.shop !== 'all') : 
        true;
    
    if (!hasRequiredFilters && isFinanceSlide) {
        return (
            <div className="slide-preview-container">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>Необходимо настроить фильтры</strong>
                    <p className="mb-0 mt-2">
                        Для отображения финансового графика необходимо выбрать конкретную категорию и магазин.
                    </p>
                    <button 
                        className="btn btn-primary btn-sm mt-2"
                        onClick={onGoToSettings}
                    >
                        <i className="fas fa-cog me-1"></i>
                        Настроить фильтры
                    </button>
                </div>
            </div>
        );
    }

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
export { ComparisonTableSlide };
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNotifications } from '../../hooks';
import { useReportData } from './ReportDataProvider';
import { getProcessedSlideData } from './utils/slideDataLoader';
import DataSourceSelector from './DataSourceSelector';
import SlideSettings from './SlideSettings';
import SlidePreview from './SlidePreview';
import SlideFilters from './SlideFilters';
import './SlideEditor.css';
import { dev } from '../../utils/env';

/**
 * Компонент редактора слайдов.
 * Позволяет создавать и редактировать слайды для отчетов.
 */
const SlideEditor = ({ 
    slide, 
    onSlideChange, 
    onSlideSave, 
    onSlideDelete,
    availableData = {},
    isEditing = false 
}) => {
    const { showSuccess, showError, showInfo } = useNotifications();
    const { loadSlideData } = useReportData();
    
    // Локальное состояние слайда
    const [localSlide, setLocalSlide] = useState(() => {
        const initialState = {
            id: slide?.id || Date.now().toString(),
            type: slide?.type || 'title',
            title: slide?.title || 'Новый слайд',
            description: slide?.description || '',
            content: {
                settings: slide?.content?.settings || {},
                filters: slide?.content?.filters || {}
            },
            ...slide
        };
        return initialState;
    });
    
    // Состояние предпросмотра
    const [previewData, setPreviewData] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [activeTab, setActiveTab] = useState('settings');
    
    // Кэш для предпросмотра данных
    const previewCache = useRef(new Map());
    
    // Обновляем локальное состояние при изменении пропса slide
    useEffect(() => {
        if (slide) {
            setLocalSlide({
                id: slide.id || Date.now().toString(),
                type: slide.type || 'title',
                title: slide.title || 'Новый слайд',
                description: slide.description || '',
                content: {
                    settings: slide.content?.settings || {},
                    filters: slide.content?.filters || {}
                },
                ...slide
            });
        }
    }, [slide]);

    // Обработчики изменений
    const handleTitleChange = useCallback((newTitle) => {
        const updatedSlide = { ...localSlide, title: newTitle };
        setLocalSlide(updatedSlide);
        onSlideChange?.(updatedSlide);
    }, [localSlide, onSlideChange]);

    const handleDescriptionChange = useCallback((newDescription) => {
        const updatedSlide = { ...localSlide, description: newDescription };
        setLocalSlide(updatedSlide);
        onSlideChange?.(updatedSlide);
    }, [localSlide, onSlideChange]);

    const handleTypeChange = useCallback((newType) => {
        const updatedSlide = {
            ...localSlide,
            type: newType,
            content: {
                settings: {},
                filters: {}
            }
        };
        setLocalSlide(updatedSlide);
        onSlideChange?.(updatedSlide);
        setPreviewData(null); // Сбрасываем предпросмотр при смене типа
    }, [localSlide, onSlideChange]);

    const handleSettingsChange = useCallback((newSettings) => {
        const updatedSlide = {
            ...localSlide,
            content: {
                ...localSlide.content,
                settings: { ...localSlide.content.settings, ...newSettings }
            }
        };
        setLocalSlide(updatedSlide);
        onSlideChange?.(updatedSlide);
    }, [localSlide, onSlideChange]);

    const handleFiltersChange = useCallback((newFilters) => {
        // Преобразуем финансовые флаги в массив metrics для финансовых слайдов (без отклонения и процента)
        let processedFilters = { ...newFilters };
        
        // Для слайдов plan-vs-actual сохраняем groupBy
        if (localSlide.type === 'plan-vs-actual') {
            if (newFilters.groupBy) {
                processedFilters.groupBy = newFilters.groupBy;
            }
            if (newFilters.viewMode) {
                processedFilters.viewMode = newFilters.viewMode;
            }
            if (newFilters.chartType) {
                processedFilters.chartType = newFilters.chartType;
            }
        }
        
        if (localSlide.type === 'finance-chart' || localSlide.type === 'finance-table') {
            const metrics = [];
            
            // Добавляем стандартные метрики
            if (newFilters.showPlan !== false) {
                metrics.push('plan');
            }
            if (newFilters.showFact !== false) {
                metrics.push('actual');
            }
            // Отклонение и процент выключены из UI и не добавляются
            
            processedFilters.metrics = metrics;
            
            // Преобразуем фильтры в формат, ожидаемый ReportDataProvider
            if (newFilters.category && newFilters.category !== 'all') {
                // Правильно обрабатываем UUID категории
                processedFilters.category = newFilters.category;
                processedFilters.categoryId = newFilters.category;
                // Добавляем в массив для совместимости с ReportDataProvider
                processedFilters.categories = [newFilters.category];
            }
            if (newFilters.shop && newFilters.shop !== 'all') {
                // Правильно обрабатываем UUID магазина
                processedFilters.shop = newFilters.shop;
                processedFilters.shopId = newFilters.shop;
                // Добавляем в массив для совместимости с ReportDataProvider
                processedFilters.shops = [newFilters.shop];
            }
            if (newFilters.year) {
                processedFilters.year = newFilters.year;
                // Добавляем в массив для совместимости с ReportDataProvider
                processedFilters.years = [newFilters.year];
            }
            
            // Добавляем метрики по умолчанию, если не выбраны
            if (processedFilters.metrics.length === 0) {
                processedFilters.metrics = ['plan', 'actual'];
            }
            
        }
        
        const updatedSlide = {
            ...localSlide,
            content: {
                ...localSlide.content,
                filters: { ...localSlide.content.filters, ...processedFilters }
            }
        };
        setLocalSlide(updatedSlide);
        onSlideChange?.(updatedSlide);
        setPreviewData(null); // Сбрасываем предпросмотр при изменении фильтров
        
    }, [localSlide, onSlideChange]);

    // Загрузка данных для предпросмотра с кэшированием
    const loadPreviewData = useCallback(async () => {
        if (localSlide.type === 'title') {
            setPreviewData({ type: 'title' });
            return;
        }

        // Создаем ключ кэша на основе параметров
        const cacheKey = `${localSlide.type}_${JSON.stringify(localSlide.content.filters)}_${JSON.stringify(localSlide.content.settings)}`;
        
        // Проверяем кэш
        if (previewCache.current.has(cacheKey)) {
            const cachedData = previewCache.current.get(cacheKey);
            if (Date.now() - cachedData.timestamp < 2 * 60 * 1000) { // 2 минуты для предпросмотра
                setPreviewData(cachedData.data);
                return;
            }
        }

        setIsLoadingPreview(true);
        
        try {
            const processed = await getProcessedSlideData(
                { type: localSlide.type, content: { filters: localSlide.content.filters, settings: localSlide.content.settings } },
                loadSlideData
            );
            if (processed) {
                const normalized = {
                    ...processed,
                    tableData: processed.tableData || processed.metrics || []
                };
                previewCache.current.set(cacheKey, {
                    data: normalized,
                    timestamp: Date.now()
                });
                setPreviewData(normalized);
            } else {
                setPreviewData(null);
            }
        } catch (error) {
            if (dev) console.error('Ошибка загрузки данных предпросмотра:', error);
            showError('Ошибка загрузки данных для предпросмотра');
            setPreviewData(null);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [localSlide.type, localSlide.content.filters, localSlide.content.settings, loadSlideData, showError]);

    // Автоматическая загрузка данных при изменении фильтров с умной дебаунсинг логикой
    useEffect(() => {
        if (localSlide.type !== 'title' && localSlide.content.filters) {
            // Проверяем, есть ли значимые изменения в фильтрах
            const hasSignificantChanges = Object.keys(localSlide.content.filters).some(key => {
                const filterValue = localSlide.content.filters[key];
                return filterValue && filterValue !== '' && filterValue !== 'all' && 
                       (!Array.isArray(filterValue) || filterValue.length > 0);
            });
            
            if (hasSignificantChanges) {
                const timeoutId = setTimeout(() => {
                    loadPreviewData();
                }, 800); // Увеличиваем задержку для предотвращения частых запросов
                
                return () => clearTimeout(timeoutId);
            }
        }
    }, [localSlide.content.filters, loadPreviewData]);

    // Сохранение слайда
    const handleSave = useCallback(() => {
        try {
            onSlideSave?.(localSlide);
            showSuccess('Слайд сохранен');
        } catch (error) {
            if (dev) console.error('Ошибка сохранения слайда:', error);
            showError('Ошибка сохранения слайда');
        }
    }, [localSlide, onSlideSave, showSuccess, showError]);

    // Удаление слайда
    const handleDelete = useCallback(() => {
        if (window.confirm('Вы уверены, что хотите удалить этот слайд?')) {
            try {
                onSlideDelete?.(localSlide.id);
                showInfo('Слайд удален');
            } catch (error) {
                if (dev) console.error('Ошибка удаления слайда:', error);
                showError('Ошибка удаления слайда');
            }
        }
    }, [localSlide.id, onSlideDelete, showInfo, showError]);

    // Доступные типы слайдов
    const slideTypes = useMemo(() => [
        {
            id: 'title',
            name: 'Титульный слайд',
            description: 'Заголовок и описание отчета',
            icon: '📄'
        },
        {
            id: 'analytics-chart',
            name: 'График аналитики',
            description: 'Визуализация данных аналитики',
            icon: '📊'
        },
        {
            id: 'finance-chart',
            name: 'Финансовый график',
            description: 'График финансовых показателей',
            icon: '💰'
        },
        {
            id: 'analytics-table',
            name: 'Таблица сравнения',
            description: 'Сравнительное представление данных',
            icon: '📋'
        },
        {
            id: 'comparison-table',
            name: 'Таблица сравнения',
            description: 'Сравнительная таблица с фильтрами аналитики',
            icon: '📊'
        },
        {
            id: 'finance-table',
            name: 'Финансовая таблица',
            description: 'Таблица финансовых данных',
            icon: '📊'
        },
        {
            id: 'comparison',
            name: 'Сравнение',
            description: 'Сравнительный анализ данных',
            icon: '⚖️'
        },
        {
            id: 'trends',
            name: 'Тренды',
            description: 'Анализ трендов и динамики',
            icon: '📈'
        },
        {
            id: 'plan-vs-actual',
            name: 'План vs Факт',
            description: 'Сравнение плановых и фактических показателей',
            icon: '🎯'
        }
    ], []);

    // Вместо вкладок — единая вкладка Настройки, включающая фильтры, и отдельным блоком Предпросмотр
    const tabs = [
        {
            id: 'settings',
            name: 'Настройки',
            icon: '⚙️'
        },
        {
            id: 'preview',
            name: 'Предпросмотр',
            icon: '👁️'
        }
    ];

    return (
        <div className="slide-editor">
            {/* Единый контейнер с заголовком, кнопками и содержимым */}
            <div className="card mb-3">
                {/* Заголовок с кнопками переключения */}
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="mb-1">
                            {isEditing ? 'Редактирование слайда' : 'Создание слайда'}
                        </h5>
                        <small className="text-muted">
                            {slideTypes.find(t => t.id === localSlide.type)?.name || 'Неизвестный тип'}
                        </small>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            className={`btn btn-${activeTab === 'settings' ? 'primary' : 'secondary'} btn-sm`}
                            onClick={() => setActiveTab('settings')}
                            title="Настройки"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="me-1" width="16" height="16">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                            Настройки
                        </button>
                        <button
                            className={`btn btn-${activeTab === 'preview' ? 'primary' : 'secondary'} btn-sm`}
                            onClick={() => setActiveTab('preview')}
                            title="Предпросмотр"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="me-1" width="16" height="16">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Предпросмотр
                        </button>
                    </div>
                </div>

                {/* Содержимое в зависимости от активной вкладки */}
                <div className="card-body">
                    {activeTab === 'settings' && (
                        <>
                            <SlideSettings
                                slideType={localSlide.type}
                                title={localSlide.title}
                                description={localSlide.description}
                                settings={localSlide.content.settings}
                                filters={localSlide.content.filters}
                                availableData={availableData}
                                onTitleChange={handleTitleChange}
                                onDescriptionChange={handleDescriptionChange}
                                onSettingsChange={handleSettingsChange}
                                onFiltersChange={handleFiltersChange}
                            />
                            {localSlide.type !== 'title' && (
                                <SlideFilters
                                    slideType={localSlide.type}
                                    filters={localSlide.content.filters}
                                    availableData={availableData}
                                    onFiltersChange={handleFiltersChange}
                                />
                            )}
                        </>
                    )}

                    {activeTab === 'preview' && (
                        <SlidePreview
                                slideType={localSlide.type}
                                title={localSlide.title}
                                description={localSlide.description}
                                settings={localSlide.content.settings}
                                filters={localSlide.content.filters}
                                previewData={previewData}
                                isLoading={isLoadingPreview}
                                availableData={availableData}
                                onRefreshData={loadPreviewData}
                                onGoToSettings={() => setActiveTab('settings')}
                            />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SlideEditor;

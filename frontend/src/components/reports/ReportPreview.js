import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNotifications } from '../../hooks';
import Chart from '../ui/Chart';
import ReportChart from './ReportChart';
import AnalyticsDataTable from '../ui/AnalyticsDataTable';
import reportsService from '../../services/reportsService';
import './ReportPreview.css';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

/**
 * Компонент предпросмотра отчета.
 * Отображает слайды в режиме презентации с возможностью навигации.
 */
const ReportPreview = ({ report, selectedSlideIndex, onSlideSelect, onExportToPDF, onExportToPPTX }) => {
    const { showSuccess, showError, showInfo } = useNotifications();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [presentationMode, setPresentationMode] = useState(false);
    const previewRef = useRef(null);
    
    // Состояние для загрузки данных слайдов
    const [slideData, setSlideData] = useState(new Map());
    const [loadingSlides, setLoadingSlides] = useState(new Set());
    
    // Используем статичные данные для стабильной работы предпросмотра
    const availableData = useMemo(() => ({
        shops: [
            { id: 'shop1', name: 'Центральный' },
            { id: 'shop2', name: 'Северный' },
            { id: 'shop3', name: 'Южный' },
            { id: 'shop4', name: 'Восточный' },
            { id: 'all', name: 'Все магазины' }
        ],
        categories: [
            { id: 'electronics', name: 'Электроника' },
            { id: 'clothing', name: 'Одежда' },
            { id: 'food', name: 'Продукты' },
            { id: 'books', name: 'Книги' },
            { id: 'all', name: 'Все категории' }
        ],
        metrics: [
            { id: 'revenue', name: 'Выручка' },
            { id: 'profit', name: 'Прибыль' },
            { id: 'orders', name: 'Заказы' },
            { id: 'customers', name: 'Клиенты' },
            { id: 'all', name: 'Все метрики' }
        ],
        years: Array.from({ length: 5 }, (_, i) => {
            const year = new Date().getFullYear() - i;
            return { id: year.toString(), name: year.toString() };
        })
    }), []);

    // Обработчики навигации
    const handlePrevSlide = () => {
        if (selectedSlideIndex > 0) {
            onSlideSelect(selectedSlideIndex - 1);
        }
    };

    const handleNextSlide = () => {
        if (selectedSlideIndex < report.slides.length - 1) {
            onSlideSelect(selectedSlideIndex + 1);
        }
    };

    const handleSlideClick = (index) => {
        onSlideSelect(index);
    };

    // Полноэкранный режим
    const handleToggleFullscreen = () => {
        if (!isFullscreen) {
            if (previewRef.current?.requestFullscreen) {
                previewRef.current.requestFullscreen().catch(err => {
                    console.warn('Не удалось войти в полноэкранный режим:', err);
                });
            }
        } else {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(err => {
                    console.warn('Не удалось выйти из полноэкранного режима:', err);
                });
            }
        }
        setIsFullscreen(!isFullscreen);
    };

    // Режим презентации
    const handleTogglePresentationMode = () => {
        setPresentationMode(!presentationMode);
        if (!presentationMode) {
            setIsFullscreen(true);
            if (previewRef.current?.requestFullscreen) {
                previewRef.current.requestFullscreen().catch(err => {
                    console.warn('Не удалось войти в полноэкранный режим:', err);
                });
            }
        }
    };

    // Клавиатурная навигация
    React.useEffect(() => {
        const handleKeyDown = (event) => {
            if (presentationMode || isFullscreen) {
                switch (event.key) {
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        event.preventDefault();
                        handlePrevSlide();
                        break;
                    case 'ArrowRight':
                    case 'ArrowDown':
                    case ' ':
                        event.preventDefault();
                        handleNextSlide();
                        break;
                    case 'Escape':
                        event.preventDefault();
                        setPresentationMode(false);
                        setIsFullscreen(false);
                        if (document.fullscreenElement && document.exitFullscreen) {
                            document.exitFullscreen().catch(err => {
                                console.warn('Не удалось выйти из полноэкранного режима:', err);
                            });
                        }
                        break;
                    case 'Home':
                        event.preventDefault();
                        onSlideSelect(0);
                        break;
                    case 'End':
                        event.preventDefault();
                        onSlideSelect(report.slides.length - 1);
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [presentationMode, isFullscreen, selectedSlideIndex, report.slides.length]);

    const currentSlide = report.slides[selectedSlideIndex];

    // Загрузка данных для всех слайдов при открытии предпросмотра
    useEffect(() => {
        if (report.slides && report.slides.length > 0) {
            report.slides.forEach(slide => {
                if (slide.type !== 'title' && !slideData.has(slide.id) && !loadingSlides.has(slide.id)) {
                    loadSlideData(slide);
                }
            });
        }
    }, [report.slides]); // Убираем loadSlideData из зависимостей

    // Загрузка данных для текущего слайда (если еще не загружены)
    useEffect(() => {
        if (currentSlide && !slideData.has(currentSlide.id) && !loadingSlides.has(currentSlide.id)) {
            loadSlideData(currentSlide);
        }
    }, [currentSlide?.id]); // Убираем зависимости, которые вызывают циклические вызовы

    // Загрузка данных для слайда
    const loadSlideData = useCallback(async (slide) => {
        if (slide.type === 'title') return; // Титульные слайды не требуют данных
        
        // Проверяем, не загружаем ли мы уже данные для этого слайда
        if (loadingSlides.has(slide.id)) return;
        
        setLoadingSlides(prev => new Set([...prev, slide.id]));
        
        try {
            let data;
            const filters = slide.content.filters || {};
            
            if (slide.type?.includes('analytics')) {
                data = await reportsService.getAnalyticsDataForSlide(filters);
            } else if (slide.type?.includes('finance')) {
                const financeFilters = {
                    year: filters.year || new Date().getFullYear().toString(),
                    shop: filters.shop || 'all',
                    category: filters.category || 'all',
                    metric: filters.metric || 'all',
                    periodType: filters.periodType || 'quarters',
                    showPlan: filters.showPlan !== false,
                    showFact: filters.showFact !== false,
                    showDeviation: filters.showDeviation === true
                };
                
                data = await reportsService.getFinanceDataForSlide(financeFilters);
            } else if (slide.type === 'comparison') {
                // Загружаем данные для слайда сравнения
                const comparisonFilters = {
                    years: filters.years || [filters.year || new Date().getFullYear().toString()],
                    categories: filters.categories || [filters.category || 'all'],
                    shops: filters.shops || [filters.shop || 'all'],
                    metrics: filters.metrics || ['fact', 'plan', 'deviation', 'percentage'],
                    periodType: filters.periodType || 'years'
                };
                
                data = await reportsService.getComparisonDataForSlide(comparisonFilters);
            } else if (slide.type === 'trends') {
                // Загружаем данные для слайда трендов
                const trendsFilters = {
                    year: filters.year || new Date().getFullYear().toString(),
                    shop: filters.shop || 'all',
                    category: filters.category || 'all',
                    metric: filters.metric || 'all',
                    showPlan: filters.showPlan !== false,
                    showFact: filters.showFact !== false,
                    showDeviation: filters.showDeviation === true
                };
                
                data = await reportsService.getTrendsDataForSlide(trendsFilters);
            } else if (slide.type === 'plan-vs-actual') {
                // Загружаем данные для слайда план vs факт
                const planVsActualFilters = {
                    year: filters.year || new Date().getFullYear().toString(),
                    shop: filters.shop || 'all',
                    category: filters.category || 'all',
                    metric: filters.metric || 'all',
                    showPlan: filters.showPlan !== false,
                    showFact: filters.showFact !== false,
                    showDeviation: filters.showDeviation === true
                };
                
                data = await reportsService.getTrendsDataForSlide(planVsActualFilters);
            }
            
            if (data) {
                setSlideData(prev => {
                    const newMap = new Map(prev);
                    newMap.set(slide.id, data);
                    return newMap;
                });
            }
            
        } catch (error) {
            if (dev) console.error('Ошибка загрузки данных слайда:', error);
            // Не показываем ошибку пользователю в предпросмотре, только логируем
        } finally {
            setLoadingSlides(prev => {
                const newSet = new Set(prev);
                newSet.delete(slide.id);
                return newSet;
            });
        }
    }, []); // Пустой массив зависимостей, так как функция не зависит от внешних переменных



    if (!report.slides || report.slides.length === 0) {
        return (
            <div className="report-preview">
                <div className="empty-preview">
                    <div className="text-center text-muted p-5">
                        <div className="mb-3">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="64" height="64">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </div>
                        <h4>Нет слайдов для предпросмотра</h4>
                        <p>Создайте слайды в конструкторе, чтобы увидеть предпросмотр</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`report-preview ${presentationMode ? 'presentation-mode' : ''}`} ref={previewRef}>
            {/* Заголовок предпросмотра */}
            {!presentationMode && (
                <div className="preview-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-1">{report.title || 'Без названия'}</h5>
                            <small className="text-muted">
                                Слайд {selectedSlideIndex + 1} из {report.slides.length}
                                {report.description && ` • ${report.description}`}
                            </small>
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={handleTogglePresentationMode}
                                title="Режим презентации"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                                    <path d="M9 8l3 3-3 3"/>
                                </svg>
                                Презентация
                            </button>
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={handleToggleFullscreen}
                                title="Полноэкранный режим"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="preview-layout">
                {/* Миниатюры слайдов */}
                {!presentationMode && (
                    <div className="slides-thumbnails">
                        <h6 className="mb-3">Слайды</h6>
                        <div className="thumbnails-list">
                            {report.slides.map((slide, index) => (
                                <div
                                    key={slide.id}
                                    className={`thumbnail-item ${selectedSlideIndex === index ? 'active' : ''}`}
                                    onClick={() => handleSlideClick(index)}
                                >
                                    <div className="thumbnail-number">{index + 1}</div>
                                    <div className="thumbnail-preview">
                                        {renderThumbnailContent(slide)}
                                    </div>
                                    <div className="thumbnail-title">{slide.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Основной слайд */}
                <div className="main-slide-area">
                    <div className="slide-container">
                        {currentSlide && renderSlideContent(currentSlide)}
                    </div>

                    {/* Навигация */}
                    <div className="slide-navigation">
                        <button
                            className="btn btn-outline-primary"
                            onClick={handlePrevSlide}
                            disabled={selectedSlideIndex === 0}
                            title="Предыдущий слайд"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="15,18 9,12 15,6"/>
                            </svg>
                            {!presentationMode && 'Назад'}
                        </button>

                        <span className="slide-counter">
                            {selectedSlideIndex + 1} / {report.slides.length}
                        </span>

                        <button
                            className="btn btn-outline-primary"
                            onClick={handleNextSlide}
                            disabled={selectedSlideIndex === report.slides.length - 1}
                            title="Следующий слайд"
                        >
                            {!presentationMode && 'Вперед'}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="9,18 15,12 9,6"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Управление в режиме презентации */}
            {presentationMode && (
                <div className="presentation-controls">
                    <button
                        className="btn btn-outline-light btn-sm"
                        onClick={handleTogglePresentationMode}
                        title="Выйти из режима презентации"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 6L6 18"/>
                            <path d="M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );

    // Рендеринг миниатюры слайда
    function renderThumbnailContent(slide) {
        switch (slide.type) {
            case 'title':
                return (
                    <div className="thumbnail-title-slide">
                        <div className="thumbnail-title-text">TITLE</div>
                    </div>
                );
            case 'analytics-chart':
            case 'finance-chart':
            case 'comparison':
            case 'trends':
            case 'plan-vs-actual':
                return (
                    <div className="thumbnail-chart-slide">
                        <div className="thumbnail-chart-icon">CHART</div>
                    </div>
                );
            case 'analytics-table':
            case 'finance-table':
                return (
                    <div className="thumbnail-table-slide">
                        <div className="thumbnail-table-icon">TABLE</div>
                    </div>
                );
            default:
                return (
                    <div className="thumbnail-unknown-slide">
                        <div className="thumbnail-unknown-icon">SLIDE</div>
                    </div>
                );
        }
    }

    // Рендеринг полного содержимого слайда
    function renderSlideContent(slide) {
        switch (slide.type) {
            case 'title':
                return renderTitleSlideContent(slide);
            case 'analytics-chart':
            case 'finance-chart':
            case 'comparison':
            case 'trends':
            case 'plan-vs-actual':
                return renderChartSlideContent(slide);
            case 'analytics-table':
            case 'finance-table':
                return renderTableSlideContent(slide);
            default:
                return (
                    <div className="slide-placeholder">
                        <div className="text-center text-muted p-4">
                            <h4>Неизвестный тип слайда</h4>
                            <p>Тип: {slide.type}</p>
                        </div>
                    </div>
                );
        }
    }

    function renderTitleSlideContent(slide) {
        return (
            <div className="slide-content title-slide-content">
                <div className="text-center">
                    <h1 className="slide-title">{slide.title}</h1>
                    {slide.content.description && (
                        <p className="slide-description">{slide.content.description}</p>
                    )}
                    {report.title && (
                        <div className="report-info mt-4">
                            <h3>{report.title}</h3>
                            {report.description && (
                                <p className="text-muted">{report.description}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function renderChartSlideContent(slide) {
        const currentSlideData = slideData.get(slide.id);
        const isLoadingCurrentSlide = loadingSlides.has(slide.id);
        

        
        if (isLoadingCurrentSlide) {
            return (
                <div className="slide-content chart-slide-content">
                    <h2 className="slide-title">{slide.title}</h2>
                    <div className="chart-container d-flex justify-content-center align-items-center">
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Загрузка...</span>
                            </div>
                            <p className="text-muted">Загрузка данных...</p>
                        </div>
                    </div>
                </div>
            );
        }
        
        if (!currentSlideData) {
            return (
                <div className="slide-content chart-slide-content">
                    <h2 className="slide-title">{slide.title}</h2>
                    <div className="chart-container d-flex justify-content-center align-items-center">
                        <div className="text-center text-muted">
                            <p>Данные не загружены</p>
                            <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => loadSlideData(slide)}
                            >
                                Повторить загрузку
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Определяем какие типы данных показывать для подписи
        const showTypes = [];
        const filters = slide.content.filters || {};
        if (filters?.showPlan !== false) showTypes.push('план');
        if (filters?.showFact !== false) showTypes.push('факт');
        if (filters?.showDeviation === true) showTypes.push('отклонение');

        // Получаем названия из данных слайда (они приходят с API)
        const shopName = currentSlideData?.shopName;
        const categoryName = currentSlideData?.categoryName;  
        const metricName = currentSlideData?.metricName;

        return (
            <div className="slide-content chart-slide-content">
                <h2 className="slide-title">{slide.title}</h2>
                

                
                <div className="chart-container">
                    {slide.type === 'comparison' ? (
                        // Для месячного и квартального режимов показываем отдельный график для каждой метрики
                        (filters?.periodType === 'months' || filters?.periodType === 'quarters') ? (
                            <div className="monthly-metrics-charts">
                                {(filters?.metrics || ['plan', 'fact', 'deviation', 'percentage']).map(metric => {
                                    const metricData = currentSlideData.comparisonData?.[metric] || [];
                                    if (metricData.length === 0) return null;
                                    
                                    const metricTitles = {
                                        'fact': 'Факт',
                                        'plan': 'План',
                                        'deviation': 'Отклонение',
                                        'percentage': '% выполнения'
                                    };
                                    
                                    // Получаем годы из данных или фильтров
                                    const years = filters?.years || Object.keys(metricData[0] || {}).filter(key => key !== 'label' && key !== 'month');
                                    
                                    return (
                                        <div key={metric} className="metric-chart-container mb-4">
                                            <ReportChart
                                                data={metricData}
                                                title={`${metricTitles[metric] || metric} ${filters?.periodType === 'months' ? 'по месяцам' : 'по кварталам'}`}
                                                type={slide.content.settings.chartType || 'bar'}
                                                selectedMetrics={years}
                                                isFiltering={false}
                                            />
                                        </div>
                                    );
                                })}
                                

                            </div>
                        ) : (
                            <ReportChart
                                data={Array.isArray(currentSlideData.comparisonData) ? currentSlideData.comparisonData : []}
                                title={slide.title}
                                type={slide.content.settings.chartType || 'bar'}
                                selectedMetrics={filters?.metrics || ['plan', 'fact', 'deviation', 'percentage']} // Используем метрики из фильтров
                                isFiltering={false}
                            />
                        )
                    ) : slide.type === 'trends' ? (
                        <ReportChart
                            data={currentSlideData.trends?.periods || currentSlideData.chartData || []}
                            title={slide.title}
                            type={slide.content.settings.chartType || 'line'}
                            selectedMetrics={['plan', 'fact', 'deviation']}
                            isFiltering={false}
                        />
                    ) : slide.type === 'plan-vs-actual' ? (
                        <ReportChart
                            data={currentSlideData.planVsActual?.categories || currentSlideData.chartData || []}
                            title={slide.title}
                            type={slide.content.settings.chartType || 'bar'}
                            selectedMetrics={['plan', 'fact', 'deviation']}
                            isFiltering={false}
                        />
                    ) : (
                        <>
                            {console.log('🔍 ReportPreview: Данные для финансового графика:', currentSlideData)}
                            {console.log('🔍 ReportPreview: chartData:', currentSlideData.chartData)}
                            {console.log('🔍 ReportPreview: selectedMetrics:', currentSlideData.selectedMetrics)}
                            {console.log('🔍 ReportPreview: slide.content.settings:', slide.content.settings)}
                            <ReportChart
                                data={currentSlideData.chartData || []}
                                title={slide.title}
                                type={slide.content.settings.chartType || 'bar'}
                                selectedMetrics={currentSlideData.selectedMetrics || ['plan', 'fact']}
                                isFiltering={false}
                                unit={currentSlideData.unit}
                            />
                        </>
                    )}
                </div>
            </div>
        );
    }

    function renderTableSlideContent(slide) {
        const currentSlideData = slideData.get(slide.id);
        const isLoadingCurrentSlide = loadingSlides.has(slide.id);
        
        if (isLoadingCurrentSlide) {
            return (
                <div className="slide-content table-slide-content">
                    <h2 className="slide-title">{slide.title}</h2>
                    <div className="table-container d-flex justify-content-center align-items-center">
                        <div className="text-center">
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Загрузка...</span>
                            </div>
                            <p className="text-muted">Загрузка данных...</p>
                        </div>
                    </div>
                </div>
            );
        }
        
        if (!currentSlideData || !currentSlideData.tableData) {
            return (
                <div className="slide-content table-slide-content">
                    <h2 className="slide-title">{slide.title}</h2>
                    <div className="table-container d-flex justify-content-center align-items-center">
                        <div className="text-center text-muted">
                            <p>Данные не загружены</p>
                            <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => loadSlideData(slide)}
                            >
                                Повторить загрузку
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="slide-content table-slide-content">
                <h2 className="slide-title">{slide.title}</h2>
                <div className="table-container">
                    <AnalyticsDataTable
                        data={currentSlideData.tableData}
                        columns={currentSlideData.tableColumns}
                        maxHeight="400px"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`report-preview ${presentationMode ? 'presentation-mode' : ''}`}>
            {/* Заголовок предпросмотра */}
            {!presentationMode && (
                <div className="preview-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-1">Предпросмотр отчета</h5>
                            <small className="text-muted">
                                {report.title || 'Без названия'} • {report.slides.length} слайдов
                            </small>
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={handleTogglePresentationMode}
                                title="Режим презентации (F11)"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                                    <path d="M9 8l3 3-3 3"/>
                                </svg>
                                Презентация
                            </button>
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={onExportToPDF}
                                title="Экспорт в PDF"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                                PDF
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={onExportToPPTX}
                                title="Экспорт в PowerPoint"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                                    <path d="M7 7h10"/>
                                    <path d="M7 12h4"/>
                                </svg>
                                PowerPoint
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="preview-layout">
                {/* Миниатюры слайдов */}
                {!presentationMode && (
                    <div className="slides-thumbnails">
                        <div className="thumbnails-scroll">
                            {report.slides.map((slide, index) => (
                                <div
                                    key={slide.id}
                                    className={`thumbnail-item ${selectedSlideIndex === index ? 'active' : ''}`}
                                    onClick={() => handleSlideClick(index)}
                                >
                                    <div className="thumbnail-number">{index + 1}</div>
                                    <div className="thumbnail-preview">
                                        {renderThumbnailContent(slide)}
                                    </div>
                                    <div className="thumbnail-title">{slide.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Основная область слайда */}
                <div className="main-slide-area">
                    <div className="slide-container">
                        {currentSlide ? renderSlideContent(currentSlide) : (
                            <div className="slide-placeholder">
                                <div className="text-center text-muted p-4">
                                    <h4>Слайд не найден</h4>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Навигация по слайдам */}
                    <div className="slide-navigation">
                        <button
                            className={`btn ${presentationMode ? 'btn-outline-light' : 'btn-outline-primary'}`}
                            onClick={handlePrevSlide}
                            disabled={selectedSlideIndex === 0}
                            title="Предыдущий слайд (←)"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="15,18 9,12 15,6"/>
                            </svg>
                            {!presentationMode && <span className="ms-1">Назад</span>}
                        </button>

                        <div className="slide-counter">
                            <span className={presentationMode ? 'text-light' : 'text-muted'}>
                                {selectedSlideIndex + 1} / {report.slides.length}
                            </span>
                        </div>

                        <button
                            className={`btn ${presentationMode ? 'btn-outline-light' : 'btn-outline-primary'}`}
                            onClick={handleNextSlide}
                            disabled={selectedSlideIndex === report.slides.length - 1}
                            title="Следующий слайд (→)"
                        >
                            {!presentationMode && <span className="me-1">Вперед</span>}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="9,18 15,12 9,6"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Управление в режиме презентации */}
            {presentationMode && (
                <div className="presentation-controls">
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={handleTogglePresentationMode}
                            title="Выйти из режима презентации (Esc)"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M18 6L6 18"/>
                                <path d="M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportPreview;

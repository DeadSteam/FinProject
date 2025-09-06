import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNotifications } from '../../hooks';
import { useReportData } from './ReportDataProvider';
import Chart from '../ui/Chart';
import AnalyticsDataTable from '../ui/AnalyticsDataTable';
import AnalyticsComparison from '../analytics/AnalyticsComparison';
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
    const { loadSlideData, transformDataForChart } = useReportData();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [presentationMode, setPresentationMode] = useState(false);
    const previewRef = useRef(null);
    
    // Состояние для загрузки данных слайдов
    const [slideData, setSlideData] = useState(new Map());
    const [loadingSlides, setLoadingSlides] = useState(new Set());
    
    // Состояние для экспорта
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    
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

    // Обработчики экспорта
    const handleExportToPDF = useCallback(async () => {
        if (!report || !report.slides || report.slides.length === 0) {
            showError('Нет слайдов для экспорта');
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        try {
            setExportProgress(20);
            const pdf = await reportsService.generateClientPDF(report, {
                orientation: 'landscape',
                format: 'a4'
            });
            
            setExportProgress(80);
            
            // Скачиваем файл
            const filename = `${report.title || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            setExportProgress(100);
            showSuccess('Отчет успешно экспортирован в PDF');
            
        } catch (error) {
            if (dev) console.error('Export PDF error:', error);
            showError('Ошибка экспорта в PDF: ' + error.message);
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    }, [report, showError, showSuccess]);

    const handleExportToPPTX = useCallback(async () => {
        if (!report || !report.slides || report.slides.length === 0) {
            showError('Нет слайдов для экспорта');
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        try {
            setExportProgress(20);
            const pptx = await reportsService.generateClientPPTX(report, {
                quality: 'high'
            });
            
            setExportProgress(80);
            
            // Скачиваем файл
            const filename = `${report.title || 'report'}_${new Date().toISOString().split('T')[0]}.pptx`;
            await pptx.writeFile({ fileName: filename });
            
            setExportProgress(100);
            showSuccess('Отчет успешно экспортирован в PowerPoint');
            
        } catch (error) {
            if (dev) console.error('Export PPTX error:', error);
            showError('Ошибка экспорта в PowerPoint: ' + error.message);
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    }, [report, showError, showSuccess]);

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
            if (dev) {
                console.log('🔍 ReportPreview: Загружаем данные для слайдов:', report.slides.map(s => ({ id: s.id, type: s.type })));
            }
            report.slides.forEach(slide => {
                if (slide.type !== 'title' && !slideData.has(slide.id) && !loadingSlides.has(slide.id)) {
                    if (dev) {
                        console.log('🔍 ReportPreview: Загружаем данные для слайда:', slide.id, slide.type);
                    }
                    loadSlideDataForPreview(slide);
                }
            });
        }
    }, [report.slides, loadSlideDataForPreview]); // Добавляем loadSlideDataForPreview в зависимости

    // Загрузка данных для текущего слайда (если еще не загружены)
    useEffect(() => {
        if (currentSlide && !slideData.has(currentSlide.id) && !loadingSlides.has(currentSlide.id)) {
            loadSlideDataForPreview(currentSlide);
        }
    }, [currentSlide?.id, loadSlideDataForPreview]); // Добавляем loadSlideDataForPreview в зависимости

    // Загрузка данных для слайда (используем тот же подход, что и в SlidePreview)
    const loadSlideDataForPreview = useCallback(async (slide) => {
        if (slide.type === 'title') return; // Титульные слайды не требуют данных
        
        // Проверяем, не загружаем ли мы уже данные для этого слайда
        if (loadingSlides.has(slide.id)) return;
        
        if (dev) {
            console.log('🔍 ReportPreview loadSlideDataForPreview: Начинаем загрузку для слайда:', slide.id, slide.type);
        }
        
        setLoadingSlides(prev => new Set([...prev, slide.id]));
        
        try {
            const filters = slide.content?.filters || {};
            const settings = slide.content?.settings || {};
            
            // Нормализуем фильтры как в SlidePreview
            const normalizedFilters = {
                ...filters,
                years: (filters?.years || []).map((y) => (y?.value ?? y?.id ?? y)),
                categories: (filters?.categories || []).map((c) => (c?.value ?? c?.id ?? c)),
                shops: (filters?.shops || []).map((s) => (s?.value ?? s?.id ?? s)),
                metrics: (filters?.metrics || []).map((m) => (m?.value ?? m?.id ?? m)),
                periodType: filters?.periodType || 'years'
            };

            // Используем тот же loadSlideData, что и в SlidePreview
            const slideData = await loadSlideData(slide.type, normalizedFilters, settings);
            
            if (slideData) {
                // Определяем метрики для отображения (как в SlidePreview)
                let selectedMetrics = ['plan', 'fact']; // По умолчанию
                if (filters?.metrics && filters.metrics.length > 0) {
                    // Используем выбранные пользователем метрики
                    selectedMetrics = filters.metrics.map(m => m?.value ?? m?.id ?? m);
                }
                
                if (dev) {
                    console.log('🔍 ReportPreview loadSlideDataForPreview: selectedMetrics для transformDataForChart:', selectedMetrics);
                }
                
                // Преобразуем данные для графика как в SlidePreview
                const transformedData = transformDataForChart(
                    slideData, 
                    slide.type, 
                    selectedMetrics
                );
                
                const processedData = {
                    ...slideData,
                    chartData: transformedData,
                    tableData: slideData.tableData || slideData.metrics || []
                };
                
                setSlideData(prev => {
                    const newMap = new Map(prev);
                    newMap.set(slide.id, processedData);
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
    }, [loadSlideData, transformDataForChart]);



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
                            <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={handleExportToPDF}
                                disabled={isExporting || !report?.slides?.length}
                                title="Экспорт в PDF"
                            >
                                {isExporting ? (
                                    <div className="spinner-border spinner-border-sm me-1" role="status">
                                        <span className="visually-hidden">Экспорт...</span>
                                    </div>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="me-1">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14,2 14,8 20,8"/>
                                    </svg>
                                )}
                                PDF
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleExportToPPTX}
                                disabled={isExporting || !report?.slides?.length}
                                title="Экспорт в PowerPoint"
                            >
                                {isExporting ? (
                                    <div className="spinner-border spinner-border-sm me-1" role="status">
                                        <span className="visually-hidden">Экспорт...</span>
                                    </div>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="me-1">
                                        <rect width="18" height="18" x="3" y="3" rx="2"/>
                                        <path d="M7 7h10"/>
                                        <path d="M7 12h4"/>
                                    </svg>
                                )}
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
            case 'trends':
            case 'plan-vs-actual':
                return renderChartSlideContent(slide);
            case 'comparison':
                return renderComparisonSlideContent(slide);
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
                <div className="slide-content chart-slide-content" data-slide-id={slide.id}>
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
                <div className="slide-content chart-slide-content" data-slide-id={slide.id}>
                    <h2 className="slide-title">{slide.title}</h2>
                    <div className="chart-container d-flex justify-content-center align-items-center">
                        <div className="text-center text-muted">
                            <p>Данные не загружены</p>
                            <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => loadSlideDataForPreview(slide)}
                            >
                                Повторить загрузку
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Определяем метрики из фильтров или используем по умолчанию (как в SlidePreview)
        const filters = slide.content.filters || {};
        const selectedMetrics = filters?.metrics && filters.metrics.length > 0 
            ? filters.metrics.map(m => m?.value ?? m?.id ?? m)
            : ['plan', 'fact'];

        // Логируем для отладки (как в SlidePreview)
        if (dev) {
            console.log('🔍 ReportPreview renderChartSlideContent:', {
                slideType: slide.type,
                data: currentSlideData,
                chartData: currentSlideData?.chartData,
                chartDataLength: currentSlideData?.chartData?.length,
                selectedMetrics,
                chartType: slide.content.settings?.chartType || 'bar',
                filters
            });
        }

        return (
            <div className="slide-content chart-slide-content" data-slide-id={slide.id}>
                <h2 className="slide-title">{slide.title}</h2>
                

                
                <div className="chart-container">
                    {Array.isArray(currentSlideData?.chartData) && currentSlideData.chartData.length > 0 ? (
                        <div className="chart-full-width">
                            {dev && console.log('🔍 ReportPreview renderChartSlideContent: Rendering chart with data:', {
                                chartData: currentSlideData.chartData,
                                selectedMetrics,
                                slideType: slide.type
                            })}
                            <Chart
                                type={slide.content.settings?.chartType || 'bar'}
                                data={currentSlideData.chartData}
                                selectedMetrics={selectedMetrics}
                                title={slide.title}
                            />
                        </div>
                    ) : (
                        <div className="no-data">
                            <i className="fas fa-chart-line fa-3x mb-3"></i>
                            <p>Нет данных для отображения</p>
                            {dev && (
                                <div className="mt-3 text-muted small">
                                    <p>Debug info:</p>
                                    <p>currentSlideData: {JSON.stringify(currentSlideData, null, 2)}</p>
                                    <p>selectedMetrics: {JSON.stringify(selectedMetrics)}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function renderComparisonSlideContent(slide) {
        const currentSlideData = slideData.get(slide.id);
        const isLoadingCurrentSlide = loadingSlides.has(slide.id);
        const filters = slide.content?.filters || {};
        
        // Безопасная обработка фильтров (точно как в SlidePreview)
        const safeFilters = {
            years: Array.isArray(filters?.years) && filters.years.length > 0 
                ? filters.years 
                : [new Date().getFullYear()],
            categories: Array.isArray(filters?.categories) 
                ? filters.categories.map((c) => (c?.value ?? c?.id ?? c)).filter(Boolean)
                : [],
            shops: Array.isArray(filters?.shops) 
                ? filters.shops.map((s) => (s?.value ?? s?.id ?? s)).filter(Boolean)
                : [],
            metrics: Array.isArray(filters?.metrics) && filters.metrics.length > 0
                ? filters.metrics.map((m) => (m?.value ?? m?.id ?? m)).filter(Boolean)
                : ['fact', 'plan', 'deviation', 'percentage'],
            periodType: filters?.periodType || 'year'
        };

        if (dev) {
            console.log('🔍 ReportPreview renderComparisonSlideContent:', {
                slideId: slide.id,
                slideData: currentSlideData,
                filters,
                safeFilters,
                isLoading: isLoadingCurrentSlide
            });
        }

        if (isLoadingCurrentSlide) {
            return (
                <div className="slide-content comparison-slide-content" data-slide-id={slide.id}>
                    <h2 className="slide-title">{slide.title}</h2>
                    <div className="comparison-container d-flex justify-content-center align-items-center">
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
                <div className="slide-content comparison-slide-content" data-slide-id={slide.id}>
                    <h2 className="slide-title">{slide.title}</h2>
                    <div className="comparison-container d-flex justify-content-center align-items-center">
                        <div className="text-center text-muted">
                            <p>Данные не загружены</p>
                            <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => loadSlideDataForPreview(slide)}
                            >
                                Повторить загрузку
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="slide-content comparison-slide-content" data-slide-id={slide.id}>
                <h2 className="slide-title">{slide.title}</h2>
                <div className="comparison-container p-2">
                    <div className="comparison-full-width">
                        <AnalyticsComparison
                            analyticsData={currentSlideData?.analytics || currentSlideData || {}}
                            filters={safeFilters}
                            isLoading={isLoadingCurrentSlide}
                            showControls={false}
                            showTable={false}
                            showSummary={false}
                            showHeader={false}
                        />
                    </div>
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
                                onClick={() => loadSlideDataForPreview(slide)}
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

            {/* Индикатор прогресса экспорта */}
            {isExporting && (
                <div className="export-progress-container">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-muted">Экспорт в процессе...</span>
                        <span className="text-muted">{exportProgress}%</span>
                    </div>
                    <div className="progress">
                        <div
                            className="progress-bar progress-bar-striped progress-bar-animated"
                            style={{ width: `${exportProgress}%` }}
                            role="progressbar"
                            aria-valuenow={exportProgress}
                            aria-valuemin="0"
                            aria-valuemax="100"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportPreview;

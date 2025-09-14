import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNotifications } from '../../hooks';
import { useReportData } from './ReportDataProvider';
import SlideRenderer from './SlideRenderer';
import reportsService from '../../services/reportsService';
import { hasDataToDisplay, createSafeFilters } from './utils/filterUtils';
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
    
    const { showSuccess, showError } = useNotifications();
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
    const [exportMode, setExportMode] = useState(false);
    

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
            setExportProgress(10);
            
            // Загружаем данные для всех слайдов перед экспортом
            setExportProgress(20);
            
            const chartSlides = report.slides.filter(slide => 
                ['analytics-chart', 'finance-chart', 'trends', 'plan-vs-actual', 'comparison'].includes(slide.type)
            );
            
            // Загружаем данные для каждого слайда с графиками
            for (const slide of chartSlides) {
                
                try {
                    const slideDataResult = await loadSlideData(slide);
                    if (slideDataResult) {
                        setSlideData(prev => new Map(prev).set(slide.id, slideDataResult));
                    }
                } catch (error) {
                }
                
                // Небольшая пауза между загрузками
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            setExportProgress(40);
            
            // Включаем режим экспорта для рендеринга всех слайдов
            setExportMode(true);
            
            // Ждем, чтобы все слайды успели отрендериться в скрытом контейнере
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setExportProgress(60);
            
            const pdf = await reportsService.generateClientPDF(report, {
                orientation: 'landscape',
                format: 'a4'
            });
            
            // Выключаем режим экспорта
            setExportMode(false);
            
            setExportProgress(80);
            
            // Скачиваем файл
            const filename = `${report.title || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            setExportProgress(100);
            showSuccess('Отчет успешно экспортирован в PDF');
            
        } catch (error) {
            showError('Ошибка экспорта в PDF: ' + error.message);
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    }, [report, showError, showSuccess, slideData, loadSlideData]);

    const handleExportToPPTX = useCallback(async () => {
        if (!report || !report.slides || report.slides.length === 0) {
            showError('Нет слайдов для экспорта');
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        try {
            setExportProgress(10);
            
            // Загружаем данные для всех слайдов перед экспортом
            setExportProgress(20);
            
            const chartSlides = report.slides.filter(slide => 
                ['analytics-chart', 'finance-chart', 'trends', 'plan-vs-actual', 'comparison'].includes(slide.type)
            );
            
            // Загружаем данные для каждого слайда с графиками
            for (const slide of chartSlides) {
                
                try {
                    const slideDataResult = await loadSlideData(slide);
                    if (slideDataResult) {
                        setSlideData(prev => new Map(prev).set(slide.id, slideDataResult));
                    }
                } catch (error) {
                }
                
                // Небольшая пауза между загрузками
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            setExportProgress(40);
            
            // Включаем режим экспорта для рендеринга всех слайдов
            setExportMode(true);
            
            // Ждем, чтобы все слайды успели отрендериться в скрытом контейнере
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setExportProgress(60);
            
            const pptx = await reportsService.generateClientPPTX(report, {
                quality: 'high'
            });
            
            // Выключаем режим экспорта
            setExportMode(false);
            
            setExportProgress(80);
            
            // Скачиваем файл
            const filename = `${report.title || 'report'}_${new Date().toISOString().split('T')[0]}.pptx`;
            await pptx.writeFile({ fileName: filename });
            
            setExportProgress(100);
            showSuccess('Отчет успешно экспортирован в PowerPoint');
            
        } catch (error) {
            showError('Ошибка экспорта в PowerPoint: ' + error.message);
        } finally {
            setIsExporting(false);
            setExportProgress(0);
        }
    }, [report, showError, showSuccess, slideData, loadSlideData]);

    // Полноэкранный режим
    const handleToggleFullscreen = () => {
        if (!isFullscreen) {
            if (previewRef.current?.requestFullscreen) {
                previewRef.current.requestFullscreen().catch(err => {
                    // Игнорируем ошибку
                });
            }
        } else {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(err => {
                    // Игнорируем ошибку
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
                    // Игнорируем ошибку
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
                                // Игнорируем ошибку
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

    // Формируем расширенный список слайдов (разбиваем comparison на части по 2 метрики)
    const expandedSlides = useMemo(() => {
        const result = [];
        (report.slides || []).forEach((slide, baseIndex) => {
            if (slide.type === 'comparison') {
                const filters = slide.content?.filters || {};
                const safe = createSafeFilters(filters);
                const allMetrics = Array.isArray(safe.metrics) ? safe.metrics : [];
                const shouldSplit = (safe.periodType === 'months' || safe.periodType === 'quarters') && allMetrics.length > 0;
                if (shouldSplit) {
                    const parts = [];
                    for (let i = 0; i < allMetrics.length; i += 2) {
                        parts.push(allMetrics.slice(i, i + 2));
                    }
                    parts.forEach((metricsGroup, partIndex) => {
                        result.push({
                            ...slide,
                            id: `${slide.id}__part${partIndex + 1}`,
                            _baseIndex: baseIndex,
                            _baseId: slide.id,
                            _partIndex: partIndex + 1,
                            _partsTotal: parts.length,
                            content: {
                                ...slide.content,
                                filters: { ...(slide.content?.filters || {}), metrics: metricsGroup }
                            }
                        });
                    });
                    return;
                }
            }
            result.push({ ...slide, _baseIndex: baseIndex, _baseId: slide.id, _partIndex: 1, _partsTotal: 1 });
        });
        return result;
    }, [report.slides]);

    // Локальный выбранный индекс по expandedSlides
    const [expandedIndex, setExpandedIndex] = useState(0);

    // Синхронизация с внешним индексом: позиционируем на первую часть базового слайда
    useEffect(() => {
        const targetBase = selectedSlideIndex ?? 0;
        const idx = expandedSlides.findIndex(s => s._baseIndex === targetBase);
        setExpandedIndex(idx >= 0 ? idx : 0);
    }, [selectedSlideIndex, expandedSlides]);

    const currentSlide = expandedSlides[expandedIndex];

    // Загрузка данных для всех слайдов при открытии предпросмотра
    useEffect(() => {
        if (report.slides && report.slides.length > 0) {
            report.slides.forEach(slide => {
                if (slide.type !== 'title' && !slideData.has(slide.id) && !loadingSlides.has(slide.id)) {
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
                let selectedMetrics = ['plan', 'actual']; // По умолчанию
                if (filters?.metrics && filters.metrics.length > 0) {
                    // Используем выбранные пользователем метрики
                    selectedMetrics = filters.metrics.map(m => m?.value ?? m?.id ?? m);
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
                                Слайд {expandedIndex + 1} из {expandedSlides.length}
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
                            {expandedSlides.map((slide, index) => (
                                <div
                                    key={slide.id}
                                    className={`thumbnail-item ${expandedIndex === index ? 'active' : ''}`}
                                    onClick={() => setExpandedIndex(index)}
                                >
                                    <div className="thumbnail-number">{index + 1}</div>
                                    <div className="thumbnail-preview">
                                        {renderThumbnailContent(slide)}
                                    </div>
                                    <div className="thumbnail-title">
                                        {slide.title}{slide._partsTotal > 1 ? ` (${slide._partIndex}/${slide._partsTotal})` : ''}
                                    </div>
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

                    {/* Все слайды в режиме экспорта (скрыты) */}
                    {exportMode && (
                        <div 
                            id="export-slides-container"
                            style={{ 
                                position: 'absolute', 
                                left: '-9999px', 
                                top: '-9999px', 
                                visibility: 'hidden',
                                width: '800px',
                                height: '600px',
                                overflow: 'hidden',
                                pointerEvents: 'none'
                            }}
                        >
                            {report.slides.map((slide, index) => {
                                // Принудительно загружаем данные для каждого слайда в режиме экспорта
                                const slideDataForExport = slideData.get(slide.id);
                                if (!slideDataForExport && slide.type !== 'title') {
                                    // Загружаем данные синхронно для экспорта
                                    loadSlideDataForPreview(slide);
                                }
                                
                                return (
                                    <div 
                                        key={`export-${slide.id}`} 
                                        data-slide-id={slide.id}
                                        data-slide-type={slide.type}
                                        style={{
                                            width: '800px',
                                            height: '600px',
                                            marginBottom: '20px',
                                            border: '1px solid #ddd',
                                            borderRadius: '8px',
                                            padding: '20px',
                                            backgroundColor: '#ffffff',
                                            position: 'relative'
                                        }}
                                    >
                                        {renderSlideContent(slide)}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Навигация */}
                    <div className="slide-navigation">
                        <button
                            className="btn btn-outline-primary"
                            onClick={() => setExpandedIndex(Math.max(0, expandedIndex - 1))}
                            disabled={expandedIndex === 0}
                            title="Предыдущий слайд"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="15,18 9,12 15,6"/>
                            </svg>
                            {!presentationMode && 'Назад'}
                        </button>

                        <span className="slide-counter">
                            {expandedIndex + 1} / {expandedSlides.length}
                        </span>

                        <button
                            className="btn btn-outline-primary"
                            onClick={() => setExpandedIndex(Math.min(expandedSlides.length - 1, expandedIndex + 1))}
                            disabled={expandedIndex === expandedSlides.length - 1}
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
        const currentSlideData = slideData.get(slide.id);
        const isLoadingCurrentSlide = loadingSlides.has(slide.id);
        
        // Определяем метрики из фильтров или используем по умолчанию
        const filters = slide.content?.filters || {};
        let selectedMetrics = ['plan', 'actual'];
        if (filters?.metrics && filters.metrics.length > 0) {
            selectedMetrics = filters.metrics.map(m => m?.value ?? m?.id ?? m);
        }

        return (
            <SlideRenderer
                slideType={slide.type}
                title={slide.title}
                description={slide.description}
                settings={slide.content?.settings || {}}
                filters={filters}
                data={currentSlideData}
                isLoading={isLoadingCurrentSlide}
                disableAnimations={exportMode}
                showHeader={true}
            />
        );
    }


};

export default ReportPreview;

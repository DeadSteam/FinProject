import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNotifications } from '../../hooks';
import { useReportData } from './ReportDataProvider';
import SlideRenderer from './SlideRenderer';
// ExportRenderer удален
import reportsService from '../../services/reportsService';
import { hasDataToDisplay, createSafeFilters } from '../../utils/filterUtils';
import './ReportPreview.css';
import './reports-common.css';
import './reports-layout.css';
import { dev } from '../../utils/env';
import { getProcessedSlideData } from './utils/slideDataLoader';
import pptxExport from '../../services/pptxExportService';

/**
 * Компонент предпросмотра отчета.
 * Отображает слайды в режиме презентации с возможностью навигации.
 */
const ReportPreview = ({ report, selectedSlideIndex, onSlideSelect }) => {
    
    const { showSuccess, showError } = useNotifications();
    const { loadSlideData } = useReportData();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [presentationMode, setPresentationMode] = useState(false);
    const previewRef = useRef(null);
    
    // Состояние для загрузки данных слайдов
    const [slideData, setSlideData] = useState(new Map());
    const [loadingSlides, setLoadingSlides] = useState(new Set());
    
    // Состояние для экспорта (PDF функционал удален)
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    // Режим экспорта удален
    

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

    // click handler не используется — навигация через thumbnails

    // Обработчик PDF удален

    // Обработчик экспорта в PPTX удален

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
            const processedData = await getProcessedSlideData(slide, loadSlideData);

            if (processedData) {
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
    }, [loadSlideData]);



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
        <div className={`report-preview ${presentationMode ? 'presentation-mode' : ''} reports-root`} ref={previewRef}>
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
                                className="btn btn-primary btn-sm"
                                onClick={async () => {
                                    try {
                                        setIsExporting(true);
                                        // Собираем canvases и таблицы непосредственно из DOM в текущем состоянии
                                        const imagesBySlide = new Map();
                                        const tablesBySlide = new Map();
                                        const order = [];
                                        const thumbs = Array.from(document.querySelectorAll('.thumbnails-list .thumbnail-item[data-slide-id]'));
                                        
                                        for (const t of thumbs) {
                                            const id = t.getAttribute('data-slide-id');
                                            order.push(id);
                                            
                                            // Активируем миниатюру и ждём рендер
                                            t.click();
                                            await new Promise(r => setTimeout(r, 50));
                                            const scope = document.querySelector(`.main-slide-area .slide-container[data-slide-id="${id}"]`) || document.querySelector('.main-slide-area .slide-container');
                                            if (!scope) continue;
                                            await reportsService.waitForChartToRender(scope, 1500);
                                            
                                            // Ищем графики (canvases)
                                            const roots = [
                                                ...scope.querySelectorAll('.comparison-container.reports-chart-container > div > div'),
                                                ...scope.querySelectorAll('.reports-chart-container .ag-chart-container'),
                                                ...scope.querySelectorAll('.chart-container .ag-chart-container'),
                                                ...scope.querySelectorAll('.chart-container'),
                                                // План vs Факт
                                                ...scope.querySelectorAll('.plan-vs-actual-container .ag-chart-container'),
                                                ...scope.querySelectorAll('.plan-vs-actual-container .chart-container'),
                                                ...scope.querySelectorAll('.plan-vs-actual-container')
                                            ];
                                            const canvases = Array.from(new Set(roots.flatMap(r => Array.from(r.querySelectorAll('canvas')))))
                                                .filter(c => c.width > 0 && c.height > 0);
                                            const imgs = [];
                                            const seen = new Set();
                                            for (const c of canvases) {
                                                const tmp = document.createElement('canvas');
                                                tmp.width = c.width; tmp.height = c.height;
                                                const ctx = tmp.getContext('2d');
                                                ctx.fillStyle = '#fff'; ctx.fillRect(0,0,tmp.width,tmp.height);
                                                ctx.drawImage(c, 0, 0);
                                                const data = tmp.toDataURL('image/png', 1.0);
                                                if (!seen.has(data)) { seen.add(data); imgs.push(data); }
                                            }
                                            if (imgs.length) imagesBySlide.set(id, imgs);
                                            
                                            // Ищем таблицы
                                            const tableElements = reportsService.findTableElements(id);
                                            if (tableElements.length > 0) {
                                                const tableImages = [];
                                                for (const tableEl of tableElements) {
                                                    const tableImage = await reportsService.captureTableAsImage(tableEl);
                                                    if (tableImage) {
                                                        tableImages.push(tableImage);
                                                    }
                                                }
                                                if (tableImages.length > 0) {
                                                    tablesBySlide.set(id, tableImages);
                                                }
                                            }
                                        }
                                        
                                        await pptxExport.exportReportFromImagesAndTables(report, imagesBySlide, tablesBySlide, order, `${report.title || 'report'}.pptx`);
                                        showSuccess('PPTX экспорт завершен');
                                    } catch (e) {
                                        showError('Не удалось экспортировать PPTX');
                                    } finally {
                                        setIsExporting(false);
                                    }
                                }}
                                disabled={isExporting}
                                title="Экспорт в PowerPoint"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M12 3v12"/>
                                    <path d="M8 11l4 4 4-4"/>
                                    <rect x="3" y="17" width="18" height="4" rx="1"/>
                                </svg>
                                {isExporting ? 'Экспорт...' : 'Экспорт PPTX'}
                            </button>
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
                            {/* Кнопка PDF удалена */}
                            {/* Кнопка экспорта в PowerPoint удалена */}
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
                                    data-slide-id={slide.id}
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
                    <div className="slide-container" data-slide-id={currentSlide?.id}>
                        {currentSlide && renderSlideContent(currentSlide)}
                    </div>

                    {/* Режим экспорта удален */}

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
        
        const filters = slide.content?.filters || {};

        return (
            <SlideRenderer
                slideType={slide.type}
                title={slide.title}
                description={slide.description}
                settings={slide.content?.settings || {}}
                filters={filters}
                data={currentSlideData}
                isLoading={isLoadingCurrentSlide}
                disableAnimations={false}
                showHeader={true}
            />
        );
    }


};

export default ReportPreview;

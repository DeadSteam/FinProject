import React, { useState, useCallback, useMemo } from 'react';
import { useNotifications } from '../../hooks';
import { useReportData } from './ReportDataProvider';
import SlideEditor from './SlideEditor';
import SlideTypeModal from './SlideTypeModal';
import './ReportConstructor.css';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

/**
 * Компонент конструктора отчетов.
 * Позволяет создавать и редактировать слайды для отчетов.
 */
const ReportConstructor = ({ 
    report, 
    onReportChange, 
    onPreviewToggle 
}) => {
    const { showSuccess, showError, showInfo } = useNotifications();
    const { analyticsData, financeData, availableLists, isLoading } = useReportData();
    
    // Состояние редактора
    const [selectedSlideId, setSelectedSlideId] = useState(null);
    const [isCreatingSlide, setIsCreatingSlide] = useState(false);
    const [slideEditorMode, setSlideEditorMode] = useState('create'); // 'create' | 'edit'
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Состояние для drag & drop
    const [draggedSlideId, setDraggedSlideId] = useState(null);
    const [dragOverSlideId, setDragOverSlideId] = useState(null);
    
    // Доступные данные для слайдов
    const availableData = useMemo(() => ({
        // Полное соответствие форматам страницы аналитики: { id, name, value }
        years: (availableLists.years && availableLists.years.length)
            ? availableLists.years.map((y) => {
                const yearVal = (y?.year ?? y?.value ?? y?.id ?? y);
                return {
                    id: Number(yearVal),
                    name: String(yearVal),
                    value: Number(yearVal)
                };
            })
            : Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return { id: year, name: String(year), value: year };
            }),
        categories: (availableLists.categories || []).map((c) => ({
            id: c?.id ?? c,
            name: c?.name ?? String(c),
            value: c?.id ?? c
        })),
        shops: (availableLists.shops || []).map((s) => ({
            id: s?.id ?? s,
            name: s?.name ?? String(s),
            value: s?.id ?? s
        })),
        metrics: (availableLists.metrics || []).map((m) => ({
            id: m?.id ?? m,
            name: m?.name ?? String(m),
            value: m?.id ?? m
        })),
        analytics: analyticsData,
        finance: financeData
    }), [availableLists, analyticsData, financeData]);

    // Обработчики слайдов
    const handleCreateSlide = useCallback((slideType = 'title') => {
        const newSlide = {
            id: Date.now().toString(),
            type: slideType,
            title: `Новый ${slideType === 'title' ? 'титульный' : 'слайд'}`,
            description: '',
            content: {
                settings: {},
                filters: {}
            },
            createdAt: new Date().toISOString()
        };
        
        const updatedReport = {
            ...report,
            slides: [...(report.slides || []), newSlide]
        };
        
        onReportChange(updatedReport);
        setSelectedSlideId(newSlide.id);
        setSlideEditorMode('create');
        setIsCreatingSlide(true);
        
        showInfo('Создан новый слайд');
        
        if (dev) {
            console.log('Created new slide:', newSlide);
        }
    }, [report, onReportChange, showInfo]);

    const handleOpenModal = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const handleSelectSlideType = useCallback((slideType) => {
        handleCreateSlide(slideType);
    }, [handleCreateSlide]);

    const handleEditSlide = useCallback((slideId) => {
        setSelectedSlideId(slideId);
        setSlideEditorMode('edit');
        setIsCreatingSlide(true);
    }, []);

    const handleSlideChange = useCallback((updatedSlide) => {
        const updatedSlides = (report.slides || []).map(slide => 
            slide.id === updatedSlide.id ? updatedSlide : slide
        );
        
        const updatedReport = {
            ...report,
            slides: updatedSlides
        };
        
        onReportChange(updatedReport);
        
        if (dev) {
            console.log('Slide updated:', updatedSlide);
        }
    }, [report, onReportChange]);

    const handleSlideSave = useCallback((slide) => {
        // Слайд уже обновлен через handleSlideChange
        setIsCreatingSlide(false);
        setSelectedSlideId(null);
        showSuccess('Слайд сохранен');
    }, [showSuccess]);

    const handleSlideDelete = useCallback((slideId) => {
        const updatedSlides = (report.slides || []).filter(slide => slide.id !== slideId);
        
        const updatedReport = {
            ...report,
            slides: updatedSlides
        };
        
        onReportChange(updatedReport);
        
        if (selectedSlideId === slideId) {
            setSelectedSlideId(null);
            setIsCreatingSlide(false);
        }
        
        showInfo('Слайд удален');
        
        if (dev) {
            console.log('Slide deleted:', slideId);
        }
    }, [report, onReportChange, selectedSlideId, showInfo]);

    const handleDuplicateSlide = useCallback((slideId) => {
        const slideToDuplicate = (report.slides || []).find(slide => slide.id === slideId);
        if (!slideToDuplicate) return;
        
        const duplicatedSlide = {
            ...slideToDuplicate,
            id: Date.now().toString(),
            title: `${slideToDuplicate.title} (копия)`,
            createdAt: new Date().toISOString()
        };
        
        const updatedReport = {
            ...report,
            slides: [...(report.slides || []), duplicatedSlide]
        };
        
        onReportChange(updatedReport);
        showSuccess('Слайд дублирован');
        
        if (dev) {
            console.log('Slide duplicated:', duplicatedSlide);
        }
    }, [report, onReportChange, showSuccess]);


    const handleCloseEditor = useCallback(() => {
        setIsCreatingSlide(false);
        setSelectedSlideId(null);
    }, []);

    // Обработчики drag & drop
    const handleDragStart = useCallback((e, slideId) => {
        setDraggedSlideId(slideId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.target.style.opacity = '0.5';
    }, []);

    const handleDragEnd = useCallback((e) => {
        e.target.style.opacity = '1';
        setDraggedSlideId(null);
        setDragOverSlideId(null);
    }, []);

    const handleDragOver = useCallback((e, slideId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverSlideId(slideId);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setDragOverSlideId(null);
    }, []);

    const handleDrop = useCallback((e, targetSlideId) => {
        e.preventDefault();
        
        if (draggedSlideId && draggedSlideId !== targetSlideId) {
            const slides = [...(report.slides || [])];
            const draggedIndex = slides.findIndex(slide => slide.id === draggedSlideId);
            const targetIndex = slides.findIndex(slide => slide.id === targetSlideId);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Удаляем перетаскиваемый элемент
                const [draggedSlide] = slides.splice(draggedIndex, 1);
                // Вставляем его в новую позицию
                slides.splice(targetIndex, 0, draggedSlide);
                
                const updatedReport = {
                    ...report,
                    slides
                };
                
                onReportChange(updatedReport);
                showInfo('Слайд перемещен');
                
                if (dev) {
                    console.log('Slide reordered:', { draggedSlideId, targetSlideId });
                }
            }
        }
        
        setDraggedSlideId(null);
        setDragOverSlideId(null);
    }, [draggedSlideId, report, onReportChange, showInfo]);

    // Получаем текущий слайд для редактирования
    const currentSlide = useMemo(() => {
        if (!selectedSlideId) return null;
        return (report.slides || []).find(slide => slide.id === selectedSlideId);
    }, [selectedSlideId, report.slides]);



    return (
        <div className="report-constructor">
            {/* Заголовок конструктора удален по требованию */}

            <div className="constructor-layout">
                {/* Панель слайдов (левая сторона) */}
                <div className="slides-panel">
                    <div className="slides-panel-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Слайды</h6>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleOpenModal}
                                title="Добавить слайд"
                            >
                                <i className="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="slides-panel-body">
                        {/* Список слайдов */}
                        <div className="slides-list">
                            {(report.slides || []).length === 0 ? (
                                <div className="text-center text-muted">
                                    <i className="fas fa-file-alt fa-3x mb-3"></i>
                                    <p>Нет слайдов</p>
                                    <small>Создайте первый слайд для начала работы</small>
                                </div>
                            ) : (
                                (report.slides || []).map((slide, index) => (
                                    <div
                                        key={slide.id}
                                        className={`slide-item ${selectedSlideId === slide.id ? 'active' : ''} ${draggedSlideId === slide.id ? 'dragging' : ''} ${dragOverSlideId === slide.id ? 'drag-over' : ''}`}
                                        onClick={() => handleEditSlide(slide.id)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, slide.id)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => handleDragOver(e, slide.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, slide.id)}
                                    >
                                        <div className="slide-item-content">
                                            <div className="slide-number">{index + 1}</div>
                                            <div className="slide-drag-handle">
                                                <i className="fas fa-grip-vertical"></i>
                                            </div>
                                            <div className="slide-info">
                                                <div className="slide-title">{slide.title}</div>
                                                <div className="slide-type">
                                                    {slide.type === 'title' && 'Титульный'}
                                                    {slide.type === 'analytics-chart' && 'График аналитики'}
                                                    {slide.type === 'finance-chart' && 'Финансовый график'}
                                                    {slide.type === 'analytics-table' && 'Таблица аналитики'}
                                                    {slide.type === 'finance-table' && 'Финансовая таблица'}
                                                    {slide.type === 'comparison' && 'Сравнение'}
                                                    {slide.type === 'trends' && 'Тренды'}
                                                    {slide.type === 'plan-vs-actual' && 'План vs Факт'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="slide-actions" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => handleDuplicateSlide(slide.id)}
                                                title="Дублировать"
                                            >
                                                <i className="fas fa-copy"></i>
                                            </button>
                                            
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => handleSlideDelete(slide.id)}
                                                title="Удалить"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path d="M19 7l-0.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Панель редактора (правая сторона) */}
                <div className="editor-panel">
                    {isCreatingSlide && currentSlide ? (
                        <SlideEditor
                            slide={currentSlide}
                            onSlideChange={handleSlideChange}
                            onSlideSave={handleSlideSave}
                            onSlideDelete={handleSlideDelete}
                            availableData={availableData}
                            isEditing={slideEditorMode === 'edit'}
                        />
                    ) : (
                        <div className="card">
                            <div className="card-body text-center text-muted">
                                <i className="fas fa-file-alt fa-4x mb-4"></i>
                                <h5>Создайте первый слайд</h5>
                                <p>Нажмите "Добавить слайд", чтобы начать создание отчета</p>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleOpenModal}
                                >
                                    <i className="fas fa-plus me-2"></i>
                                    Добавить слайд
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Модальное окно выбора типа слайда */}
            <SlideTypeModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSelectSlideType={handleSelectSlideType}
            />
        </div>
    );
};

export default ReportConstructor;

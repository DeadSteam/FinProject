import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthUser } from '../context/auth';
import { usePermissions } from '../hooks';
import { useNotifications } from '../hooks';
import { useErrorBoundary } from '../hooks';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Ленивая загрузка компонентов отчетов
const ReportConstructor = lazy(() => import('../components/reports/ReportConstructor'));
const ReportPreview = lazy(() => import('../components/reports/ReportPreview'));
// Экспортер отчетов удален

// Импортируем ReportDataProvider напрямую (не lazy, так как это провайдер контекста)
import ReportDataProvider from '../components/reports/ReportDataProvider';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

/**
 * Страница создания отчетов и презентаций.
 * Позволяет создавать презентации с данными из аналитики и финансовых деталей.
 * Включает конструктор слайдов и предпросмотр.
 */
const Reports = () => {
    const navigate = useNavigate();
    const user = useAuthUser();
    const { hasRole } = usePermissions();
    const { showSuccess, showError, showInfo } = useNotifications();
    const { ErrorBoundary } = useErrorBoundary();

    // Состояние активной вкладки
    const [activeTab, setActiveTab] = useState('constructor');
    
    // Состояние отчета с мемоизацией начального состояния
    const [currentReport, setCurrentReport] = useState(() => ({
        id: Date.now().toString(),
        title: 'Новый отчет',
        description: '',
        slides: [],
        settings: {
            theme: 'default',
            layout: 'standard',
            showPageNumbers: true,
            showHeader: true,
            showFooter: true
        },
        createdAt: new Date().toISOString()
    }));

    // Состояние предпросмотра
    const [previewMode, setPreviewMode] = useState(false);
    const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
    
    // Экспорт удален

    // Проверка авторизации
    useEffect(() => {
        if (!user) {
            navigate('/login', { replace: true });
            return;
        }
    }, [user, navigate]);

    // Обработчики событий
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Обработчик изменения отчета с валидацией
    const handleReportChange = useCallback((updatedReport) => {
        // Безопасное обновление с сохранением структуры
        const safeReport = {
            ...currentReport,
            ...updatedReport,
            settings: {
                ...currentReport.settings,
                ...(updatedReport.settings || {})
            },
            slides: updatedReport.slides || currentReport.slides
        };
        
        setCurrentReport(safeReport);
        
        if (dev) {
    
        }
    }, [currentReport]);

    const handlePreviewToggle = () => {
        setPreviewMode(!previewMode);
    };

    const handleSlideSelect = (slideIndex) => {
        setSelectedSlideIndex(slideIndex);
    };

    // Экспорт в PPTX удален

    // Создание нового отчета
    const handleNewReport = useCallback(() => {
        const newReport = {
            id: Date.now().toString(),
            title: 'Новый отчет',
            description: '',
            slides: [],
            settings: {
                theme: 'default',
                layout: 'standard',
                showPageNumbers: true,
                showHeader: true,
                showFooter: true
            },
            createdAt: new Date().toISOString()
        };
        
        setCurrentReport(newReport);
        setActiveTab('constructor');
        setSelectedSlideIndex(0);
        
        showInfo('Создан новый отчет');
        
        if (dev) {
    
        }
    }, [showInfo]);

    // Дублирование отчета
    const handleDuplicateReport = useCallback(() => {
        const duplicatedReport = {
            ...currentReport,
            id: Date.now().toString(),
            title: `${currentReport.title} (копия)`,
            createdAt: new Date().toISOString()
        };
        
        setCurrentReport(duplicatedReport);
        showSuccess('Отчет дублирован');
        
        if (dev) {
    
        }
    }, [currentReport, showSuccess]);

    if (!user) {
        return null;
    }

    const tabs = [
        {
            id: 'constructor',
            name: 'Конструктор',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <path d="M7 7h10"/>
                    <path d="M7 12h10"/>
                    <path d="M7 17h10"/>
                </svg>
            ),
            description: 'Создание и редактирование слайдов'
        },
        {
            id: 'preview',
            name: 'Предпросмотр',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            ),
            description: 'Просмотр готового отчета'
        }
    ];

    return (
        <ErrorBoundary>
            <ReportDataProvider>
                    <div className="main-content">
                        {/* Заголовок страницы */}
                        

                        {/* Вкладки */}
                        <div className="card mb-4">
                            <div className="d-flex flex-wrap" style={{gap: '8px'}}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'} d-flex align-items-center`}
                                        onClick={() => handleTabChange(tab.id)}
                                        style={{flex: '1', minWidth: '200px'}}
                                    >
                                        {tab.icon}
                                        <div className="ml-2 text-left">
                                            <div className="fw-bold">{tab.name}</div>
                                            <small className="opacity-75">{tab.description}</small>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Контент вкладок */}
                        <div className="card">
                            <Suspense fallback={<LoadingSpinner />}>
                                {activeTab === 'constructor' && (
                                    <ReportConstructor
                                        report={currentReport}
                                        onReportChange={handleReportChange}
                                        onPreviewToggle={handlePreviewToggle}
                                    />
                                )}

                                {activeTab === 'preview' && (
                                    <ReportPreview
                                        report={currentReport}
                                        selectedSlideIndex={selectedSlideIndex}
                                        onSlideSelect={handleSlideSelect}
                                    />
                                )}
                            </Suspense>
                        </div>

                        {/* Экспорт отчета удален */}
                    </div>
            </ReportDataProvider>
        </ErrorBoundary>
    );
};

export default Reports;

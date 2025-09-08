import React, { useState, useEffect, useCallback } from 'react';
import AnalyticsComparison from '../analytics/AnalyticsComparison';
import Chart from '../ui/Chart';
import DataTable from '../ui/DataTable';
import { useNotifications } from '../../hooks';
import { useReportData } from './ReportDataProvider';
import './SlidePreview.css';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

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
            const normalizedFilters = {
                ...filters,
                years: (filters?.years || []).map((y) => (y?.value ?? y?.id ?? y)),
                categories: (filters?.categories || []).map((c) => (c?.value ?? c?.id ?? c)),
                shops: (filters?.shops || []).map((s) => (s?.value ?? s?.id ?? s)),
                metrics: (filters?.metrics || []).map((m) => (m?.value ?? m?.id ?? m)),
                periodType: filters?.periodType || 'years'
            };

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
                let selectedMetrics = ['plan', 'fact']; // По умолчанию
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

    // Рендеринг в зависимости от типа слайда
    const renderSlideContent = () => {
        try {
            if (loading) {
                return (
                    <div className="slide-loading">
                        <div className="loading-spinner">
                            <div className="spinner-border" role="status">
                                <span className="sr-only">Загрузка...</span>
                            </div>
                            <span className="loading-text">Загрузка данных...</span>
                        </div>
                    </div>
                );
            }

            switch (slideType) {
                case 'title':
                    return renderTitleSlide();
                case 'analytics-chart':
                case 'finance-chart':
                    return renderChartSlide();
                case 'analytics-table':
                case 'finance-table':
                    return renderTableSlide();
                case 'comparison':
                    return renderComparisonSlide();
                case 'trends':
                    return renderTrendsSlide();
                case 'plan-vs-actual':
                    return renderPlanVsActualSlide();
                default:
                    return renderDefaultSlide();
            }
        } catch (error) {
            console.error('Ошибка рендеринга слайда:', error);
            return (
                <div className="slide-error">
                    <div className="alert alert-danger">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Ошибка загрузки слайда: {error.message}
                    </div>
                </div>
            );
        }
    };

    // Титульный слайд
    const renderTitleSlide = () => (
        <div className="title-slide-preview">
            <h1 className="slide-title">{title || 'Заголовок отчета'}</h1>
            <p className="slide-description">{description || 'Описание отчета'}</p>
            <div className="slide-meta">
                <span className="meta-item">
                    <i className="fas fa-calendar me-1"></i>
                    {new Date().toLocaleDateString('ru-RU')}
                </span>
                <span className="meta-item">
                    <i className="fas fa-user me-1"></i>
                    Отчет
                </span>
            </div>
        </div>
    );

    // График
    const renderChartSlide = () => {
        // Определяем тип графика из настроек
        const chartType = settings?.chartType || 'bar';
        
        // Определяем метрики из фильтров или используем по умолчанию
        // Для финансовых графиков всегда показываем стандартные метрики
        // Выбранная метрика используется для загрузки данных, но отображение всегда стандартное
        let selectedMetrics = ['plan', 'fact'];
        if (filters?.metrics && filters.metrics.length > 0) {
            // Если переданы метрики как массив (для других типов слайдов)
            selectedMetrics = filters.metrics.map(m => m?.value ?? m?.id ?? m);
        }
        
        
        return (
            <div className="chart-slide-preview">
                <div className="slide-header">
                    <h2 className="slide-title">{title || 'График'}</h2>
                    {description && <p className="slide-description">{description}</p>}
                </div>
                <div className="chart-container p-2">
                    {Array.isArray(data?.chartData) && data.chartData.length > 0 ? (
                        <div className="chart-full-width">
                            <Chart
                                type={chartType}
                                data={data.chartData}
                                selectedMetrics={selectedMetrics}
                                title={title}
                                disableAnimations={disableAnimations}
                            />
                        </div>
                    ) : (
                        <div className="no-data">
                            <i className="fas fa-chart-line fa-3x mb-3"></i>
                            <p>Нет данных для отображения</p>
                            <button className="btn btn-primary btn-sm" onClick={loadData}>
                                <i className="fas fa-refresh me-1"></i>
                                Загрузить данные
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Таблица
    const renderTableSlide = () => (
        <div className="table-slide-preview">
            <div className="slide-header">
                <h2 className="slide-title">{title || 'Таблица данных'}</h2>
                {description && <p className="slide-description">{description}</p>}
            </div>
            <div className="table-container p-2">
                {(() => { if (dev) console.log('[SlidePreview] renderTableSlide()', {
                    hasMetrics: Array.isArray(data?.metrics), metricsLen: Array.isArray(data?.metrics) ? data.metrics.length : 0,
                    hasPeriods: Array.isArray(data?.periods), periodsLen: Array.isArray(data?.periods) ? data.periods.length : 0,
                    hasTableData: Array.isArray(data?.tableData), tableDataLen: Array.isArray(data?.tableData) ? data.tableData.length : 0,
                    selectedMetric: filters?.metric
                }); return null; })()}
                {Array.isArray(data?.metrics) && Array.isArray(data?.periods) && data.metrics.length > 0 ? (
                    <DataTable 
                        metrics={(filters?.metric && filters.metric !== 'all')
                            ? data.metrics.filter(m => String(m.id) === String(filters.metric))
                            : data.metrics}
                        periods={data.periods}
                        view={(filters?.periodType === 'months') ? 'months' : 'quarters'}
                        hasAdminRights={false}
                        onEditValue={undefined}
                        isFiltering={false}
                        showQuarters={settings?.showQuarters !== false}
                        visibleColumns={{
                            plan: filters?.showPlan !== false,
                            fact: filters?.showFact !== false,
                            deviation: filters?.showDeviation === true
                        }}
                    />
                ) : Array.isArray(data?.tableData) && data.tableData.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Показатель</th>
                                    {filters?.showPlan !== false && <th>План</th>}
                                    {filters?.showFact !== false && <th>Факт</th>}
                                    {filters?.showDeviation === true && <th>Отклонение</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {data.tableData.slice(0, 12).map((row, index) => (
                                    <tr key={index}>
                                        <td>{row.metric || row.name || `Показатель ${index + 1}`}</td>
                                        {filters?.showPlan !== false && <td>{row.plan ?? (row.periods?.[0]?.plan ?? '0')}</td>}
                                        {filters?.showFact !== false && <td>{row.fact ?? (row.periods?.[0]?.fact ?? '0')}</td>}
                                        {filters?.showDeviation === true && (
                                            <td className={(row.deviation ?? row.periods?.[0]?.deviation ?? 0) >= 0 ? 'text-success' : 'text-danger'}>
                                                {(row.deviation ?? row.periods?.[0]?.deviation ?? 0)}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="no-data">
                        <i className="fas fa-table fa-3x mb-3"></i>
                        <p>Нет данных для отображения</p>
                        <button className="btn btn-primary btn-sm" onClick={loadData}>
                            <i className="fas fa-refresh me-1"></i>
                            Загрузить данные
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    // Сравнение
    const renderComparisonSlide = () => {
        // Безопасная обработка фильтров
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

        return (
            <div className="comparison-slide-preview">
                <div className="slide-header">
                    <h2 className="slide-title">{title || 'Сравнительный анализ'}</h2>
                    {description && <p className="slide-description">{description}</p>}
                </div>
                <div className="comparison-container p-2">
                    <div className="comparison-full-width">
                        <AnalyticsComparison
                            analyticsData={data?.analytics || data || {}}
                            filters={safeFilters}
                            isLoading={loading}
                            showControls={false}
                            showTable={false}
                            showSummary={false}
                            showHeader={false}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Тренды
    const renderTrendsSlide = () => (
        <div className="trends-slide-preview">
            <div className="slide-header">
                <h2 className="slide-title">{title || 'Анализ трендов'}</h2>
                {description && <p className="slide-description">{description}</p>}
            </div>
            
            <div className="trends-container">
                <div className="trend-chart">
                    <div className="trend-line">
                        <div className="trend-point" style={{left: '10%', bottom: '20%'}}></div>
                        <div className="trend-point" style={{left: '30%', bottom: '35%'}}></div>
                        <div className="trend-point" style={{left: '50%', bottom: '45%'}}></div>
                        <div className="trend-point" style={{left: '70%', bottom: '60%'}}></div>
                        <div className="trend-point" style={{left: '90%', bottom: '75%'}}></div>
                    </div>
                </div>
                <div className="trend-stats">
                    <div className="trend-stat">
                        <span className="stat-label">Рост за период:</span>
                        <span className="stat-value positive">+25.3%</span>
                    </div>
                    <div className="trend-stat">
                        <span className="stat-label">Средний рост:</span>
                        <span className="stat-value">+5.1% в месяц</span>
                    </div>
                </div>
            </div>
        </div>
    );

    // План vs Факт
    const renderPlanVsActualSlide = () => (
        <div className="plan-vs-actual-slide-preview">
            <div className="slide-header">
                <h2 className="slide-title">{title || 'План vs Факт'}</h2>
                {description && <p className="slide-description">{description}</p>}
            </div>
            
            <div className="plan-vs-actual-container">
                <div className="plan-vs-actual-grid">
                    <div className="plan-vs-actual-item">
                        <div className="item-label">План</div>
                        <div className="item-value">1,500,000 ₽</div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: '100%'}}></div>
                        </div>
                    </div>
                    <div className="plan-vs-actual-item">
                        <div className="item-label">Факт</div>
                        <div className="item-value">1,250,000 ₽</div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: '83%'}}></div>
                        </div>
                    </div>
                    <div className="plan-vs-actual-item">
                        <div className="item-label">Выполнение</div>
                        <div className="item-value">83.3%</div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: '83%'}}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Слайд по умолчанию
    const renderDefaultSlide = () => (
        <div className="default-slide-preview">
            <div className="slide-header">
                <h2 className="slide-title">{title || 'Слайд'}</h2>
                {description && <p className="slide-description">{description}</p>}
            </div>
            
            <div className="default-content">
                <i className="fas fa-file-alt fa-3x mb-3"></i>
                <p>Содержимое слайда</p>
            </div>
        </div>
    );

    return (
        <div className="slide-preview">
            {renderSlideContent()}
        </div>
    );
};

export default SlidePreview;
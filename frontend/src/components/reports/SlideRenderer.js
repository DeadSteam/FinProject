import React from 'react';
import { TrendsChart } from '../charts';
import PlanVsActualChart from './PlanVsActualChart';
import Chart from '../ui/Chart';
import AnalyticsComparison from '../analytics/AnalyticsComparison';
import AnalyticsDataTable from '../ui/AnalyticsDataTable';
import FinanceDataTable from './FinanceDataTable';
import { hasDataToDisplay, createSafeFilters } from './utils/filterUtils';

/**
 * Универсальный компонент для рендеринга слайдов
 * Используется как в SlidePreview, так и в ReportPreview
 */
const SlideRenderer = ({ 
    slideType, 
    title, 
    description,
    settings = {}, 
    filters = {}, 
    data, 
    isLoading = false,
    onGoToSettings,
    disableAnimations = false,
    showHeader = true
}) => {
    
    // Титульный слайд
    const renderTitleSlide = () => (
        <div className="title-slide-preview">
            {showHeader && (
                <h1 className="slide-title">{title || 'Заголовок отчета'}</h1>
            )}
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
        const chartType = settings?.chartType || 'bar';
        
        let selectedMetrics = ['plan', 'actual'];
        if (filters?.metrics && filters.metrics.length > 0) {
            selectedMetrics = filters.metrics.map(m => m?.value ?? m?.id ?? m);
        }
        
        return (
            <div className="chart-slide-preview">
                {showHeader && (
                    <div className="slide-header">
                        <h2 className="slide-title">{title || 'График'}</h2>
                        {description && <p className="slide-description">{description}</p>}
                    </div>
                )}
                <div className="chart-container">
                    {hasDataToDisplay(data, filters) ? (
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
                        <EmptySlidePlaceholder 
                            type="chart"
                            title="Нет данных для отображения"
                            description="Выберите параметры фильтрации или загрузите данные для создания графика"
                            onGoToSettings={onGoToSettings}
                        />
                    )}
                </div>
            </div>
        );
    };

    // Таблица
    const renderTableSlide = () => {
        return (
            <div className="table-slide-preview">
                {showHeader && (
                    <div className="slide-header">
                        <h2 className="slide-title">{title || 'Таблица данных'}</h2>
                        {description && <p className="slide-description">{description}</p>}
                    </div>
                )}
                <div className="table-container">
                    {hasDataToDisplay(data, filters) ? (
                        data.isFinanceData ? (
                            <FinanceDataTable
                                data={data.metrics || data.tableData || []}
                                columns={data.tableColumns}
                                title={data.categoryName || title}
                                selectedMetrics={filters?.metrics || []}
                                selectedMetric={filters?.metric || 'all'}
                            />
                        ) : (
                            <AnalyticsDataTable
                                data={data.tableData}
                                columns={data.tableColumns}
                                maxHeight="400px"
                            />
                        )
                    ) : (
                        <EmptySlidePlaceholder 
                            type="table"
                            title="Нет данных для отображения"
                            description="Выберите параметры фильтрации или загрузите данные для создания таблицы"
                            onGoToSettings={onGoToSettings}
                        />
                    )}
                </div>
            </div>
        );
    };

    // Сравнение
    const renderComparisonSlide = () => {
        const safeFilters = createSafeFilters(filters);

        return (
            <div className="comparison-slide-preview">
                {showHeader && (
                    <div className="slide-header">
                        <h2 className="slide-title">{title || 'Сравнительный анализ'}</h2>
                        {description && <p className="slide-description">{description}</p>}
                    </div>
                )}
                <div className="comparison-container">
                    {hasDataToDisplay(data, filters) ? (
                        <div className="comparison-full-width">
                            <AnalyticsComparison
                                analyticsData={data?.analytics || data || {}}
                                filters={safeFilters}
                                isLoading={isLoading}
                                showControls={false}
                                showTable={false}
                                showSummary={false}
                                showHeader={false}
                            />
                        </div>
                    ) : (
                        <EmptySlidePlaceholder 
                            type="comparison"
                            title="Нет данных для отображения"
                            description="Выберите параметры фильтрации или загрузите данные для создания графика сравнения"
                            onGoToSettings={onGoToSettings}
                        />
                    )}
                </div>
            </div>
        );
    };

    // Таблица сравнения
    const renderComparisonTableSlide = () => {
        const safeFilters = createSafeFilters(filters);

        return (
            <div className="comparison-table-slide-preview">
                {showHeader && (
                    <div className="slide-header">
                        <h2 className="slide-title">{title || 'Таблица сравнения'}</h2>
                        {description && <p className="slide-description">{description}</p>}
                    </div>
                )}
                <div className="comparison-container">
                    {hasDataToDisplay(data, filters) ? (
                        <div className="comparison-full-width">
                            <AnalyticsComparison
                                analyticsData={data?.analytics || data || {}}
                                filters={{ ...safeFilters, viewMode: 'table' }}
                                isLoading={isLoading}
                                showControls={false}
                                showTable={true}
                                showSummary={false}
                                showHeader={false}
                                title={title || 'Таблица сравнения'}
                                description={description}
                            />
                        </div>
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
        );
    };

    // Тренды
    const renderTrendsSlide = () => {
        const safe = createSafeFilters(filters || {});
        const effectiveFilters = { ...safe };
        const canShow = hasDataToDisplay(data, effectiveFilters);

        return (
            <div className="trends-slide-preview">
                {showHeader && (
                    <div className="slide-header">
                        <h2 className="slide-title">{title || 'Анализ трендов'}</h2>
                        {description && <p className="slide-description">{description}</p>}
                    </div>
                )}
                <div className="trends-container" style={{ width: '100%' }}>
                    {canShow ? (
                        <div className="chart-full-width" style={{ width: '100%' }}>
                            <TrendsChart
                                analyticsData={data}
                                filters={effectiveFilters}
                                isLoading={isLoading}
                                showControls={false}
                                showTable={false}
                                showSummary={false}
                                showHeader={false}
                                chartType={settings?.chartType || filters?.chartType || 'line'}
                                smoothing={filters?.smoothing === true}
                                showForecast={filters?.showForecast === true}
                            />
                        </div>
                    ) : (
                        <EmptySlidePlaceholder 
                            type="trends"
                            title="Нет данных для отображения"
                            description="Выберите параметры фильтрации или загрузите данные для анализа трендов"
                            onGoToSettings={onGoToSettings}
                        />
                    )}
                </div>
            </div>
        );
    };

    // План vs Факт
    const renderPlanVsActualSlide = () => (
        <div className="plan-vs-actual-slide-preview">
            {showHeader && (
                <div className="slide-header">
                    <h2 className="slide-title">{title || 'План vs Факт'}</h2>
                    {description && <p className="slide-description">{description}</p>}
                </div>
            )}
            
            <div className="plan-vs-actual-container">
                {hasDataToDisplay(data, filters) ? (
                    <PlanVsActualChart
                        analyticsData={data}
                        filters={filters}
                        isLoading={isLoading}
                        showControls={false}
                        showTable={false}
                        showSummary={true}
                        showHeader={false}
                        className="chartInReports"
                    />
                ) : (
                    <EmptySlidePlaceholder 
                        type="plan-vs-actual"
                        title="Нет данных для отображения"
                        description="Выберите параметры фильтрации или загрузите данные для создания анализа план vs факт"
                        onGoToSettings={onGoToSettings}
                    />
                )}
            </div>
        </div>
    );

    // Слайд по умолчанию
    const renderDefaultSlide = () => (
        <div className="default-slide-preview">
            {showHeader && (
                <div className="slide-header">
                    <h2 className="slide-title">{title || 'Слайд'}</h2>
                    {description && <p className="slide-description">{description}</p>}
                </div>
            )}
            
            <div className="default-content">
                <i className="fas fa-file-alt fa-3x mb-3"></i>
                <p>Содержимое слайда</p>
            </div>
        </div>
    );

    // Основная функция рендеринга
    const renderSlideContent = () => {
        try {
            if (isLoading) {
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
                case 'comparison-table':
                    return renderComparisonTableSlide();
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

    return (
        <div className="slide-preview">
            {renderSlideContent()}
        </div>
    );
};

// Переиспользуемый компонент заглушки
const EmptySlidePlaceholder = ({ type, title, description, onGoToSettings }) => {
    const getIcon = () => {
        switch (type) {
            case 'chart':
                return 'fas fa-chart-line';
            case 'table':
                return 'fas fa-table';
            case 'comparison':
                return 'fas fa-chart-bar';
            case 'trends':
                return 'fas fa-chart-line';
            case 'plan-vs-actual':
                return 'fas fa-chart-pie';
            default:
                return 'fas fa-chart-line';
        }
    };

    const getDefaultDescription = () => {
        switch (type) {
            case 'chart':
                return 'Выберите параметры фильтрации или загрузите данные для создания графика';
            case 'table':
                return 'Выберите параметры фильтрации или загрузите данные для создания таблицы';
            case 'comparison':
                return 'Выберите параметры фильтрации или загрузите данные для создания графика сравнения';
            case 'trends':
                return 'Выберите параметры фильтрации или загрузите данные для анализа трендов';
            case 'plan-vs-actual':
                return 'Выберите параметры фильтрации или загрузите данные для создания анализа план vs факт';
            default:
                return 'Выберите параметры фильтрации или загрузите данные для создания слайда';
        }
    };

    return (
        <div className="no-data">
            <i className={`${getIcon()} no-data-icon`}></i>
            <h3 className="no-data-title">{title || 'Нет данных для отображения'}</h3>
            <p className="no-data-description">
                {description || getDefaultDescription()}
            </p>
            {onGoToSettings && (
                <button className="no-data-button" onClick={onGoToSettings}>
                    <i className="fas fa-cog"></i>
                    Настройки
                </button>
            )}
        </div>
    );
};

export default SlideRenderer;
export { EmptySlidePlaceholder };

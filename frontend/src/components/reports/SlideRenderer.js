import React from 'react';
import './reports-common.css';
import TrendsChart from '../charts/TrendsChart';
import PlanVsActualChart from '../charts/PlanVsActualChart';
import AGChartWrapper from '../charts/AGChartWrapper';
import BaseChart from '../charts/BaseChart';
import ComparisonChart from '../charts/ComparisonChart';
import AnalyticsDataTable from '../ui/AnalyticsDataTable';
import FinanceDataTable from './FinanceDataTable';
import { ComparisonTableSlide } from './SlidePreview';
import { hasDataToDisplay, createSafeFilters } from '../../utils/filterUtils';
import ReportSlideHeader from './ReportSlideHeader';

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
        const safeFilters = createSafeFilters(filters || {});
        const selectedMetrics = safeFilters.metrics.length > 0 ? safeFilters.metrics : ['plan', 'actual'];
        
        return (
            <div className="chart-slide-preview">
                {showHeader && (
                    <ReportSlideHeader title={title || 'График'} description={description} />
                )}
                <div className="chart-container reports-chart-container">
                    {hasDataToDisplay(data, filters) ? (
                        <div className="chart-full-width">
                            <BaseChart
                                data={data.chartData}
                                analyticsData={data?.analytics}
                                filters={filters}
                                chartType={chartType}
                                selectedMetrics={selectedMetrics}
                                title={title}
                                disableAnimations={disableAnimations}
                                smoothing={filters?.smoothing === true}
                                showForecast={filters?.showForecast === true}
                                showHeader={false}
                                showTable={false}
                                showSummary={false}
                                className="report-base-chart"
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
                    <ReportSlideHeader title={title || 'Таблица данных'} description={description} />
                )}
                <div className="table-container reports-table-container">
                    {hasDataToDisplay(data, filters) ? (
                        data.isFinanceData ? (
                            <FinanceDataTable
                                data={data.metrics || data.tableData || []}
                                columns={data.tableColumns}
                                title={data.categoryName || title}
                                selectedMetrics={createSafeFilters(filters || {}).metrics}
                                selectedMetric={filters?.metric || 'all'}
                                showQuarters={settings?.showQuarters !== false}
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
                    <ReportSlideHeader title={title || 'Сравнительный анализ'} description={description} />
                )}
                <div className="comparison-container reports-chart-container">
                    {hasDataToDisplay(data, filters) ? (
                        <div className="comparison-full-width">
                            <ComparisonChart
                                analyticsData={data?.analytics || data?.finance?.analytics || {}}
                                filters={safeFilters}
                                isLoading={isLoading}
                                showControls={false}
                                showTable={false}
                                showSummary={false}
                                showHeader={false}
                                chartType={settings?.chartType || 'bar'}
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
        return (
            <ComparisonTableSlide
                title={title}
                description={description}
                filters={filters}
                onGoToSettings={onGoToSettings}
            />
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
                    <ReportSlideHeader title={title || 'Анализ трендов'} description={description} />
                )}
                <div className="trends-container reports-chart-container" style={{ width: '100%' }}>
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
                <ReportSlideHeader title={title || 'План vs Факт'} description={description} />
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
                <ReportSlideHeader title={title || 'Слайд'} description={description} />
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
                case 'multi-chart':
                    return (
                        <div className="multi-chart-grid">
                            <div className="grid-row">
                                <AGChartWrapper data={data?.chartDataA || data?.chartData} selectedMetrics={['plan','actual']} disableAnimations={disableAnimations} style={{ height: '100%' }} />
                                <AGChartWrapper data={data?.chartDataB || data?.chartData} selectedMetrics={['plan','actual']} disableAnimations={disableAnimations} style={{ height: '100%' }} />
                            </div>
                            {data?.chartDataC && (
                                <div className="grid-row">
                                    <AGChartWrapper data={data?.chartDataC} selectedMetrics={['plan','actual']} disableAnimations={disableAnimations} style={{ height: '100%' }} />
                                </div>
                            )}
                        </div>
                    );
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




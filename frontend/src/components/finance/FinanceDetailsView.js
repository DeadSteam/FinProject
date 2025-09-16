import PropTypes from 'prop-types';
import React from 'react';

import styles from '../../styles/pages/FinanceDetails.module.css';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
    AddMetricModal, 
    EditValueModal, 
    InitYearModal, 
    YearlyPlanModal 
} from '../modals';
import Button from '../ui/Button';
import BaseChart from '../charts/BaseChart';
import DataTable from '../ui/DataTable';

import ChartControlPanel from './ChartControlPanel';
import FinanceActionPanel from './FinanceActionPanel';
import FinanceFiltersPanel from './FinanceFiltersPanel';

/**
 * Presentational компонент для FinanceDetails
 * Ответственность: только отображение UI, получение данных через пропсы
 * Соблюдает принцип SRP - только рендеринг
 */
const FinanceDetailsView = React.memo(({
    // Данные
    metrics,
    periods,
    shops,
    years,
    categoryName,

    // Состояние
    loading,
    filtering,
    selectedYear,
    selectedShop,
    activeMetric,
    chartView,
    hasAdminRights,

    // Данные для графика
    chartData,

    // Модальные окна
    editModal,
    initYearModal,
    addMetricModal,
    yearlyPlanModal,

    // Обработчики
    onYearChange,
    onShopChange,
    onActiveMetricChange,
    onChartViewChange,
    onEditValue,
    onSaveValue,
    onExport,
    onInitYear,
    onAddMetric,
    onYearlyPlan,

    // Коллбэки модальных окон
    onInitYearSuccess,
    onAddMetricSuccess,
    onYearlyPlanSuccess,

    // URL параметры
    searchParams
}) => {
    // Показываем загрузку
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <LoadingSpinner text="Загрузка данных..." />
            </div>
        );
    }

    // Вычисляем подзаголовок
    const getSubtitle = () => {
        const categoryId = searchParams.get('category');
        const shopId = searchParams.get('shop');
        
        if (categoryId && shopId) {
            const shop = shops.find(s => s.id === shopId);
            return shop ? shop.name : 'Выбранный магазин';
        }
        
        return selectedShop === 'all' 
            ? 'Все магазины' 
            : shops.find(s => s.id === parseInt(selectedShop))?.name || 'Выбранный магазин';
    };

    return (
        <div className={styles.contentWrapper}>
            <div className={styles.dashboard}>
                <section className={styles.salaryReport}>
                    {/* Заголовок и фильтры */}
                    <div className={styles.salaryHeader}>
                        <div>
                            <h1 className={styles.salaryReportTitle}>
                                {categoryName || 'Финансовый отчет'}
                            </h1>
                            <h2 className={styles.salaryReportSubtitle}>
                                {getSubtitle()}
                            </h2>
                        </div>
                        
                        <FinanceFiltersPanel
                            years={years}
                            shops={shops}
                            selectedYear={selectedYear}
                            selectedShop={selectedShop}
                            onYearChange={onYearChange}
                            onShopChange={onShopChange}
                            onExport={onExport}
                        />
                    </div>

                    {/* Контролы графика */}
                    <ChartControlPanel
                        metrics={metrics}
                        activeMetric={activeMetric}
                        onActiveMetricChange={onActiveMetricChange}
                        chartView={chartView}
                        onChartViewChange={onChartViewChange}
                    />

                    {/* График */}
                    <div className={styles.chartWrapper}>
                        <BaseChart 
                            data={chartData}
                            title={activeMetric ? `${activeMetric.name} по ${chartView === 'quarters' ? 'кварталам' : 'месяцам'} (${activeMetric.unit})` : 'Выберите метрику'}
                            disableAnimations={filtering}
                            showHeader={false}
                            showTable={false}
                            showSummary={false}
                        />
                    </div>

                    {/* Кнопки управления */}
                    <FinanceActionPanel
                        hasAdminRights={hasAdminRights}
                        onInitYear={onInitYear}
                        onAddMetric={onAddMetric}
                        onYearlyPlan={onYearlyPlan}
                    />

                    {/* Таблица данных */}
                    <div className={`${styles.salaryTableContainer} ${filtering ? styles.filtering : ''}`}>
                        <DataTable 
                            metrics={metrics}
                            periods={periods}
                            view={chartView}
                            onEditValue={onEditValue}
                            hasAdminRights={hasAdminRights}
                            isFiltering={filtering}
                        />
                        {filtering && (
                            <div className={styles.filteringOverlay}>
                                <LoadingSpinner size="small" />
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Модальные окна */}
            {hasAdminRights && (
                <>
                    <EditValueModal
                        isOpen={editModal.isOpen}
                        onClose={editModal.close}
                        editData={editModal.data}
                        onSave={onSaveValue}
                        metrics={metrics}
                        periods={periods}
                        shops={shops}
                        selectedShop={selectedShop}
                        selectedYear={selectedYear}
                    />
                    <InitYearModal
                        isOpen={initYearModal.isOpen}
                        onClose={initYearModal.close}
                        onSuccess={onInitYearSuccess}
                    />
                    <AddMetricModal
                        isOpen={addMetricModal.isOpen}
                        onClose={addMetricModal.close}
                        onSuccess={onAddMetricSuccess}
                        categoryId={searchParams.get('category')}
                        storeId={searchParams.get('store')}
                    />
                    <YearlyPlanModal
                        isOpen={yearlyPlanModal.isOpen}
                        onClose={yearlyPlanModal.close}
                        onSuccess={onYearlyPlanSuccess}
                        metrics={metrics}
                        shops={shops}
                        selectedShop={selectedShop}
                        selectedYear={selectedYear}
                    />
                </>
            )}
        </div>
    );
});

// PropTypes для типизации
FinanceDetailsView.propTypes = {
    // Данные
    metrics: PropTypes.array.isRequired,
    periods: PropTypes.array.isRequired,
    shops: PropTypes.array.isRequired,
    years: PropTypes.array.isRequired,
    categoryName: PropTypes.string.isRequired,
    
    // Состояние
    loading: PropTypes.bool.isRequired,
    filtering: PropTypes.bool.isRequired,
    selectedYear: PropTypes.string.isRequired,
    selectedShop: PropTypes.string.isRequired,
    activeMetric: PropTypes.object,
    chartView: PropTypes.oneOf(['quarters', 'months']).isRequired,
    hasAdminRights: PropTypes.bool.isRequired,
    
    // Данные для графика
    chartData: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        plan: PropTypes.number.isRequired,
        actual: PropTypes.number.isRequired
    })).isRequired,
    
    // Модальные окна
    editModal: PropTypes.object.isRequired,
    initYearModal: PropTypes.object.isRequired,
    addMetricModal: PropTypes.object.isRequired,
    yearlyPlanModal: PropTypes.object.isRequired,
    
    // Обработчики
    onYearChange: PropTypes.func.isRequired,
    onShopChange: PropTypes.func.isRequired,
    onActiveMetricChange: PropTypes.func.isRequired,
    onChartViewChange: PropTypes.func.isRequired,
    onEditValue: PropTypes.func.isRequired,
    onSaveValue: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
    onInitYear: PropTypes.func.isRequired,
    onAddMetric: PropTypes.func.isRequired,
    onYearlyPlan: PropTypes.func.isRequired,
    
    // Коллбэки модальных окон
    onInitYearSuccess: PropTypes.func.isRequired,
    onAddMetricSuccess: PropTypes.func.isRequired,
    onYearlyPlanSuccess: PropTypes.func.isRequired,
    
    // URL параметры
    searchParams: PropTypes.object.isRequired
};

export default FinanceDetailsView;
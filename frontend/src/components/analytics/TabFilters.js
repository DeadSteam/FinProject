import React, { useState } from 'react';
import styles from './AnalyticsFilters.module.css';
import '../../styles/components/toggle.css';
import '../../styles/components/ButtonGroup.css';

/**
 * Компонент фильтров для вкладок аналитики.
 * Содержит фильтры, специфичные для каждой вкладки.
 */
const TabFilters = ({ 
    activeTab, 
    filters, 
    onFiltersChange, 
    onMonthRangeChange 
}) => {
    // Используем значения из filters или значения по умолчанию
    const timeframe = filters.periodType === 'months' ? 'monthly_metrics' : 
                     filters.periodType === 'quarters' ? 'quarterly' : 'yearly';
    const trendType = (filters.trendType === 'percentage') ? 'absolute' : (filters.trendType || 'absolute');
    const chartType = filters.chartType || 'bar';
    const smoothing = filters.smoothing || false;
    const showForecast = filters.showForecast || false;
    const monthStart = filters.monthStart || 1;
    const monthEnd = filters.monthEnd || 12;

    // Обработчики для фильтров трендов
    const handleTimeframeChange = (value) => {
        onFiltersChange({
            ...filters,
            periodType: value === 'monthly_metrics' ? 'months' : 
                       value === 'quarterly' ? 'quarters' : 'years'
        });
    };

    const handleTrendTypeChange = (value) => {
        // Убираем поддержку percentage
        if (value === 'percentage') {
            value = 'absolute';
        }
        onFiltersChange({
            ...filters,
            trendType: value
        });
    };

    const handleChartTypeChange = (value) => {
        onFiltersChange({
            ...filters,
            chartType: value
        });
    };

    const handleSmoothingChange = (checked) => {
        onFiltersChange({
            ...filters,
            smoothing: checked
        });
    };

    const handleShowForecastChange = (checked) => {
        onFiltersChange({
            ...filters,
            showForecast: checked
        });
    };

    const handleMonthRangeChange = (start, end) => {
        onFiltersChange({
            ...filters,
            monthStart: start,
            monthEnd: end
        });
        onMonthRangeChange?.(start, end);
    };

    // Рендерим фильтры в зависимости от активной вкладки
    if (activeTab === 'trends') {
        return (
            <div className={`card mb-4 ${styles.analyticsFilters}`}>
                <div className="card-body">
                    <div className="row button-group-wrapper">
                        <div className="col-md-3">
                            <label className="form-label">Период</label>
                            <div className="btn-group button-group-container" role="group">
                                <button 
                                    type="button"
                                    className={`btn ${timeframe === 'yearly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleTimeframeChange('yearly')}
                                >
                                    Годы
                                </button>
                                <button 
                                    type="button"
                                    className={`btn ${timeframe === 'quarterly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleTimeframeChange('quarterly')}
                                >
                                    Кварталы
                                </button>
                                <button 
                                    type="button"
                                    className={`btn ${timeframe === 'monthly_metrics' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleTimeframeChange('monthly_metrics')}
                                >
                                    Месяцы
                                </button>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Тип данных</label>
                            <div className="btn-group button-group-container" role="group">
                                <button 
                                    type="button"
                                    className={`btn ${trendType === 'absolute' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleTrendTypeChange('absolute')}
                                >
                                    Абсолютные
                                </button>
                                <button 
                                    type="button"
                                    className={`btn ${trendType === 'moving_average' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleTrendTypeChange('moving_average')}
                                >
                                    Скользящее среднее
                                </button>
                            </div>
                        </div>
                         <div className="col-md-3">
                             <label className="form-label">Вид графика</label>
                             <div className="btn-group button-group-container" role="group">
                                 <button 
                                     type="button"
                                     className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => handleChartTypeChange('line')}
                                 >
                                     Линии
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => handleChartTypeChange('bar')}
                                 >
                                     Столбцы
                                 </button>
                             </div>
                         </div>
                        <div className="col-md-3">
                            <div className="d-flex flex-column gap-3">
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="form-label mb-0">Сглаживание</span>
                                    <label className={`${styles.toggleSwitch} ${smoothing ? styles.active : ''}`}>
                                        <input
                                            className={styles.toggleInput}
                                            type="checkbox"
                                            checked={smoothing}
                                            onChange={(e) => handleSmoothingChange(e.target.checked)}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </label>
                                </div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="form-label mb-0">Показать прогноз</span>
                                    <label className={`${styles.toggleSwitch} ${showForecast ? styles.active : ''}`}>
                                        <input
                                            className={styles.toggleInput}
                                            type="checkbox"
                                            checked={showForecast}
                                            onChange={(e) => handleShowForecastChange(e.target.checked)}
                                        />
                                        <span className={styles.toggleSlider}></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {timeframe === 'monthly_metrics' && (
                        <div className="row mt-3">
                            <div className="col-md-6">
                                <label className="form-label">Диапазон месяцев</label>
                                <div className="d-flex align-items-center gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        value={monthStart}
                                        onChange={(e) => handleMonthRangeChange(Number(e.target.value), monthEnd)}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <span>—</span>
                                    <select
                                        className="form-select form-select-sm"
                                        value={monthEnd}
                                        onChange={(e) => handleMonthRangeChange(monthStart, Number(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (activeTab === 'comparison') {
        return (
            <div className={`card mb-4 ${styles.analyticsFilters}`}>
                <div className="card-body">
                    <div className="row button-group-wrapper">
                         <div className="col-md-3">
                             <label className="form-label">Период</label>
                             <div className="btn-group button-group-container" role="group">
                                 <button 
                                     type="button"
                                     className={`btn ${(filters.periodType || 'years') === 'years' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         periodType: 'years'
                                     })}
                                 >
                                     Годы
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${filters.periodType === 'quarters' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         periodType: 'quarters'
                                     })}
                                 >
                                     Кварталы
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${filters.periodType === 'months' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         periodType: 'months'
                                     })}
                                 >
                                     Месяцы
                                 </button>
                             </div>
                         </div>
                        <div className="col-md-3">
                            <label className="form-label">Вид графика</label>
                            <div className="btn-group button-group-container" role="group">
                                <button 
                                    type="button"
                                    className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleChartTypeChange('bar')}
                                >
                                    Столбцы
                                </button>
                                <button 
                                    type="button"
                                    className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleChartTypeChange('line')}
                                >
                                    Линии
                                </button>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Отображение</label>
                             <div className="btn-group button-group-container" role="group">
                                 <button 
                                     type="button"
                                     className={`btn ${(filters.viewMode || 'chart') === 'chart' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         viewMode: 'chart'
                                     })}
                                 >
                                     График
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${filters.viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         viewMode: 'table'
                                     })}
                                 >
                                     Таблица
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${filters.viewMode === 'both' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         viewMode: 'both'
                                     })}
                                 >
                                     Оба
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'plan-vs-actual') {
        return (
            <div className={`card mb-4 ${styles.analyticsFilters}`}>
                <div className="card-body">
                    <div className="row button-group-wrapper">
                        <div className="col-md-3">
                            <label className="form-label">Вид графика</label>
                            <div className="btn-group button-group-container" role="group">
                                <button 
                                    type="button"
                                    className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleChartTypeChange('bar')}
                                >
                                    Столбцы
                                </button>
                                <button 
                                    type="button"
                                    className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => handleChartTypeChange('line')}
                                >
                                    Линии
                                </button>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Группировка</label>
                             <div className="btn-group button-group-container" role="group">
                                 <button 
                                     type="button"
                                     className={`btn ${(filters.groupBy || 'categories') === 'categories' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         groupBy: 'categories'
                                     })}
                                 >
                                     Категории
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${filters.groupBy === 'subcategories' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         groupBy: 'subcategories'
                                     })}
                                 >
                                     Подкатегории
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${filters.groupBy === 'shops' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         groupBy: 'shops'
                                     })}
                                 >
                                     Магазины
                                 </button>
                             </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Отображение</label>
                             <div className="btn-group button-group-container" role="group">
                                 <button 
                                     type="button"
                                     className={`btn ${(filters.viewMode || 'chart') === 'chart' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         viewMode: 'chart'
                                     })}
                                 >
                                     График
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${filters.viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         viewMode: 'table'
                                     })}
                                 >
                                     Таблица
                                 </button>
                                 <button 
                                     type="button"
                                     className={`btn ${filters.viewMode === 'both' ? 'btn-primary' : 'btn-outline-primary'}`}
                                     onClick={() => onFiltersChange({
                                         ...filters,
                                         viewMode: 'both'
                                     })}
                                 >
                                     Оба
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default TabFilters;

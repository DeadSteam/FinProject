import PropTypes from 'prop-types';
import React from 'react';

import styles from '../../styles/pages/FinanceDetails.module.css';

/**
 * Компонент контролов для графиков и диаграмм
 * Ответственность: управление отображением графиков, выбор метрик и видов
 * Соблюдает принципы SRP и OCP - легко расширяется новыми контролами
 */
const ChartControlPanel = ({
    metrics,
    activeMetric,
    onActiveMetricChange,
    chartView,
    onChartViewChange,
    maxVisibleTabs = 4,
    viewOptions = [
        { value: 'quarters', label: 'Кварталы', icon: quartersIcon },
        { value: 'months', label: 'Месяцы', icon: monthsIcon }
    ],
    className = ''
}) => {
    return (
        <div className={`${styles.chartControls} ${className}`}>
            {/* Вкладки метрик */}
            <div className={styles.chartTabs}>
                {metrics.slice(0, maxVisibleTabs).map((metric) => (
                    <button
                        key={metric.id}
                        className={`${styles.chartTab} ${activeMetric?.id === metric.id ? styles.active : ''}`}
                        onClick={() => onActiveMetricChange(metric)}
                        aria-label={`Выбрать метрику ${metric.name}`}
                        title={metric.name}
                    >
                        {metric.name}
                    </button>
                ))}
                
                {/* Показываем индикатор, если метрик больше чем отображается */}
                {metrics.length > maxVisibleTabs && (
                    <span className={styles.tabsIndicator} title={`Всего метрик: ${metrics.length}`}>
                        +{metrics.length - maxVisibleTabs}
                    </span>
                )}
            </div>
            
            {/* Переключатель видов графика */}
            <div className={styles.chartViewToggle}>
                {viewOptions.map((option) => (
                    <button
                        key={option.value}
                        className={`${styles.chartViewBtn} ${chartView === option.value ? styles.active : ''}`}
                        onClick={() => onChartViewChange(option.value)}
                        aria-label={`Переключить на вид ${option.label}`}
                        title={option.label}
                    >
                        {option.icon}
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

// Иконки по умолчанию
const quartersIcon = (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
    </svg>
);

const monthsIcon = (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
    </svg>
);

ChartControlPanel.propTypes = {
    metrics: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired
    })).isRequired,
    activeMetric: PropTypes.object,
    onActiveMetricChange: PropTypes.func.isRequired,
    chartView: PropTypes.string.isRequired,
    onChartViewChange: PropTypes.func.isRequired,
    maxVisibleTabs: PropTypes.number,
    viewOptions: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        icon: PropTypes.node
    })),
    className: PropTypes.string
};

export default React.memo(ChartControlPanel);
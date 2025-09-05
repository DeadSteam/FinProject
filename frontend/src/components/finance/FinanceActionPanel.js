import PropTypes from 'prop-types';
import React from 'react';

import styles from '../../styles/pages/FinanceDetails.module.css';
import Button from '../ui/Button';

/**
 * Компонент панели действий для финансовых операций
 * Ответственность: CRUD операции, административные действия
 * Соблюдает принципы SRP и OCP - легко добавлять новые действия
 */
const FinanceActionPanel = ({
    hasAdminRights,
    onInitYear,
    onAddMetric,
    onYearlyPlan,
    actions = [], // Дополнительные кастомные действия
    className = ''
}) => {
    // Если нет прав администратора и нет кастомных действий, не показываем панель
    if (!hasAdminRights && actions.length === 0) {
        return null;
    }

    return (
        <div className={`${styles.actionButtons} ${className}`}>
            {/* Стандартные административные действия */}
            {hasAdminRights && (
                <>
                    <Button 
                        variant="secondary" 
                        onClick={onInitYear}
                        className="btn"
                        id="initYearBtn"
                        aria-label="Инициализация данных для нового года"
                    >
                        <span style={{marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center'}}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </span>
                        Инициализация года
                    </Button>
                    
                    <Button 
                        variant="primary" 
                        onClick={onAddMetric}
                        className="btn"
                        id="add-metric-btn"
                        aria-label="Добавить новую метрику"
                    >
                        <span style={{marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center'}}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                        </span>
                        Добавить метрику
                    </Button>
                    
                    <Button 
                        variant="info" 
                        onClick={onYearlyPlan}
                        className="btn"
                        id="add-yearly-plan-btn"
                        aria-label="Управление годовым планом"
                    >
                        <span style={{marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center'}}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </span>
                        Годовой план
                    </Button>
                </>
            )}
            
            {/* Кастомные действия */}
            {actions.map((action, index) => (
                <Button
                    key={action.id || index}
                    variant={action.variant || 'secondary'}
                    onClick={action.onClick}
                    className={action.className || 'btn'}
                    disabled={action.disabled}
                    aria-label={action.ariaLabel}
                >
                    {action.icon && (
                        <span style={{marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center'}}>
                            {action.icon}
                        </span>
                    )}
                    {action.label}
                </Button>
            ))}
        </div>
    );
};

FinanceActionPanel.propTypes = {
    hasAdminRights: PropTypes.bool.isRequired,
    onInitYear: PropTypes.func,
    onAddMetric: PropTypes.func,
    onYearlyPlan: PropTypes.func,
    actions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired,
        variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'info', 'warning']),
        icon: PropTypes.node,
        className: PropTypes.string,
        disabled: PropTypes.bool,
        ariaLabel: PropTypes.string
    })),
    className: PropTypes.string
};

export default FinanceActionPanel; 
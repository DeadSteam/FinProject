import PropTypes from 'prop-types';
import React from 'react';
import './Button.module.css';

/**
 * Phase 10 Task 10.3: React.memo оптимизация
 * Расширенный Button компонент с поддержкой множественных вариантов
 * Сохраняет все существующие стили и добавляет новые возможности
 */
const Button = React.memo(({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    disabled = false, 
    loading = false, 
    icon = null,
    iconPosition = 'left',
    onClick,
    type = 'button',
    className = '',
    fullWidth = false,
    outline = false,
    rounded = false,
    ...props 
}) => {
    // Определяем базовые классы (сохраняем существующие)
    const baseClasses = 'btn';
    
    // Расширенные варианты (сохраняем существующие + новые)
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        info: 'btn-info',
        // Новые варианты с использованием существующих CSS переменных
        danger: 'btn-danger',
        warning: 'btn-warning',
        success: 'btn-success',
        ghost: 'btn-ghost',
        link: 'btn-link'
    };

    const getButtonClasses = () => {
        const classes = [baseClasses];
        
        // Варианты кнопок (сохраняем логику)
        if (variantClasses[variant]) {
            classes.push(variantClasses[variant]);
        } else {
            classes.push(variantClasses.primary);
        }
        
        // Размеры (сохраняем существующие)
        switch (size) {
            case 'xs':
                classes.push('btn-xs');
                break;
            case 'sm':
            case 'small':
                classes.push('btn-sm');
                break;
            case 'lg':
            case 'large':
                classes.push('btn-lg');
                break;
            case 'xl':
                classes.push('btn-xl');
                break;
            default:
                // medium - базовый размер
                break;
        }
        
        // Модификаторы
        if (outline) classes.push('btn-outline');
        if (fullWidth) classes.push('btn-full-width');
        if (rounded) classes.push('btn-rounded');
        if (loading) classes.push('btn-loading');
        
        // Иконка (сохраняем логику)
        if (icon || (children && typeof children === 'object' && children.type === 'svg')) {
            classes.push('btn-icon');
        }
        
        // Дополнительные классы
        if (className) {
            classes.push(className);
        }
        
        return classes.join(' ');
    };

    const renderIcon = () => {
        if (loading) {
            return (
                <svg 
                    className="animate-spin btn-spinner" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none"
                >
                    <circle 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4" 
                        strokeDasharray="32" 
                        strokeDashoffset="32"
                    >
                        <animate 
                            attributeName="stroke-dashoffset" 
                            dur="1s" 
                            values="32;0;32" 
                            repeatCount="indefinite"
                        />
                    </circle>
                </svg>
            );
        }

        if (icon && !loading) {
            return (
                <span className="btn-icon-wrapper">
                    {icon}
                </span>
            );
        }

        return null;
    };

    return (
        <button
            type={type}
            className={getButtonClasses()}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {iconPosition === 'left' && renderIcon()}
            {children && (
                <span className="btn-content">
                    {children}
                </span>
            )}
            {iconPosition === 'right' && renderIcon()}
        </button>
    );
});

Button.propTypes = {
    children: PropTypes.node,
    variant: PropTypes.oneOf([
        'primary', 'secondary', 'info', 'danger', 
        'warning', 'success', 'ghost', 'link'
    ]),
    size: PropTypes.oneOf(['xs', 'sm', 'small', 'md', 'lg', 'large', 'xl']),
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    icon: PropTypes.node,
    iconPosition: PropTypes.oneOf(['left', 'right']),
    onClick: PropTypes.func,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    className: PropTypes.string,
    fullWidth: PropTypes.bool,
    outline: PropTypes.bool,
    rounded: PropTypes.bool
};

export default Button; 
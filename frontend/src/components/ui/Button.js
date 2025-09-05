
import React from 'react';

const Button = ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    disabled = false, 
    loading = false, 
    icon = null,
    onClick,
    type = 'button',
    className = '',
    ...props 
}) => {
    // Определяем базовые классы
    const baseClasses = 'btn';
    
    // Определяем классы для вариантов
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        info: 'btn-info'
    };

    const getButtonClasses = () => {
        const classes = [baseClasses];
        
        // Варианты кнопок
        switch (variant) {
            case 'primary':
                classes.push(variantClasses.primary);
                break;
            case 'secondary':
                classes.push(variantClasses.secondary);
                break;
            case 'info':
                classes.push(variantClasses.info);
                break;
            default:
                classes.push(variantClasses.primary);
        }
        
        // Размеры
        switch (size) {
            case 'small':
                classes.push('btn-sm');
                break;
            case 'large':
                classes.push('btn-lg');
                break;
            default:
                // medium - базовый размер
                break;
        }
        
        // Иконка
        if (icon || (children && typeof children === 'object' && children.type === 'svg')) {
            classes.push('btn-icon');
        }
        
        // Дополнительные классы
        if (className) {
            classes.push(className);
        }
        
        return classes.join(' ');
    };

    return (
        <button
            type={type}
            className={getButtonClasses()}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && (
                <svg 
                    className="animate-spin mr-2" 
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
            )}
            {icon && !loading && (
                <span className="btn-icon-wrapper">
                    {icon}
                </span>
            )}
            {children}
        </button>
    );
};

export default Button; 
 
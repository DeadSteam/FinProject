import PropTypes from 'prop-types';
import React, { forwardRef, useState, useEffect } from 'react';
import './Input.module.css';

/**
 * Расширенный Input компонент с валидацией, масками и улучшенным UX
 * Сохраняет все существующие стили и добавляет новые возможности
 */
const Input = forwardRef(({ 
    type = 'text',
    placeholder = '',
    value,
    onChange,
    onBlur,
    onFocus,
    onClick,
    onKeyDown,
    disabled = false,
    error = '',
    label = '',
    icon = null,
    className = '',
    required = false,
    readOnly = false,
    // Новые возможности
    size = 'md',
    variant = 'default',
    validation = null,
    mask = null,
    maxLength = null,
    autoComplete = 'off',
    showPassword = false,
    clearable = false,
    loading = false,
    helperText = '',
    onClear,
    iconPosition = 'left',
    // Исключаем проблемные props которые не должны попадать в DOM
    selectedValues, // Пропускаем этот prop
    ...otherProps // Восстанавливаем остальные props
}, ref) => {
    // Создаем чистый объект props без проблемных свойств
    const cleanOtherProps = { ...otherProps };
    delete cleanOtherProps.iconPosition;
    delete cleanOtherProps.clearable;
    delete cleanOtherProps.onClear;
    delete cleanOtherProps.selectedValues;
    delete cleanOtherProps.iconPosition;
    const [inputId] = useState(`input-${Math.random().toString(36).substr(2, 9)}`);
    const [showPasswordToggle, setShowPasswordToggle] = useState(false);
    const [currentType, setCurrentType] = useState(type);
    const [focused, setFocused] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Обработка password visibility
    useEffect(() => {
        if (type === 'password' && showPassword) {
            setShowPasswordToggle(true);
        }
    }, [type, showPassword]);

    // Валидация при изменении значения
    useEffect(() => {
        if (validation && value) {
            const isValid = validation(value);
            setValidationError(isValid === true ? '' : (isValid || 'Invalid input'));
        } else {
            setValidationError('');
        }
    }, [value, validation]);

    const getInputClasses = () => {
        const classes = ['input'];
        
        // Размеры
        if (size === 'sm') classes.push('input-sm');
        if (size === 'lg') classes.push('input-lg');
        
        // Варианты
        if (variant === 'filled') classes.push('input-filled');
        if (variant === 'borderless') classes.push('input-borderless');
        
        // Состояния
        if (error || validationError) {
            classes.push('input-error');
        }
        if (focused) {
            classes.push('input-focused');
        }
        if (disabled) {
            classes.push('input-disabled');
        }
        if (loading) {
            classes.push('input-loading');
        }
        
        if (className) {
            classes.push(className);
        }
        
        return classes.join(' ');
    };

    const handleFocus = (e) => {
        setFocused(true);
        onFocus && onFocus(e);
    };

    const handleBlur = (e) => {
        setFocused(false);
        onBlur && onBlur(e);
    };

    const handleChange = (e) => {
        let newValue = e.target.value;
        
        // Применение маски если есть
        if (mask) {
            newValue = mask(newValue);
        }
        
        // Проверка maxLength
        if (maxLength && newValue.length > maxLength) {
            return;
        }
        
        onChange && onChange(e);
    };

    const handleClear = () => {
        if (onClear) {
            onClear();
        } else if (onChange) {
            // Создаем синтетическое событие для очистки
            const syntheticEvent = {
                target: { value: '' },
                type: 'change'
            };
            onChange(syntheticEvent);
        }
    };

    const togglePasswordVisibility = () => {
        setCurrentType(currentType === 'password' ? 'text' : 'password');
    };

    const renderIcon = (position) => {
        if (!icon || (position === 'right' && iconPosition !== 'right') || 
            (position === 'left' && iconPosition !== 'left')) {
            return null;
        }

        return (
            <div className={`input-icon input-icon-${position}`}>
                {icon}
            </div>
        );
    };

    const renderRightActions = () => {
        const actions = [];
        
        // Кнопка показа/скрытия пароля
        if (type === 'password' && showPasswordToggle) {
            actions.push(
                <button
                    key="password-toggle"
                    type="button"
                    className="input-action input-password-toggle"
                    onClick={togglePasswordVisibility}
                    tabIndex={-1}
                >
                    {currentType === 'password' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                    )}
                </button>
            );
        }
        
        // Кнопка очистки
        if (clearable && value && !disabled) {
            actions.push(
                <button
                    key="clear"
                    type="button"
                    className="input-action input-clear"
                    onClick={handleClear}
                    tabIndex={-1}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            );
        }
        
        // Индикатор загрузки
        if (loading) {
            actions.push(
                <div key="loading" className="input-action input-loading-spinner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416">
                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                </div>
            );
        }
        
        return actions.length > 0 ? (
            <div className="input-actions">
                {actions}
            </div>
        ) : null;
    };

    return (
        <div className={getInputClasses()}>
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            
            <div className="input-wrapper">
                {renderIcon('left')}
                
                <input
                    ref={ref}
                    id={inputId}
                    type={currentType}
                    value={value || ''}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onClick={onClick}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={readOnly}
                    required={required}
                    maxLength={maxLength}
                    autoComplete={autoComplete}
                    {...cleanOtherProps}
                />
                
                {renderIcon('right')}
                {renderRightActions()}
            </div>
            
            {(error || validationError || helperText) && (
                <div className="input-message">
                    {error && <span className="input-error-text">{error}</span>}
                    {validationError && <span className="input-error-text">{validationError}</span>}
                    {helperText && !error && !validationError && (
                        <span className="input-helper-text">{helperText}</span>
                    )}
                </div>
            )}
        </div>
    );
});

Input.propTypes = {
    type: PropTypes.string,
    placeholder: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    onBlur: PropTypes.func,
    onFocus: PropTypes.func,
    onClick: PropTypes.func,
    onKeyDown: PropTypes.func,
    disabled: PropTypes.bool,
    error: PropTypes.string,
    label: PropTypes.string,
    icon: PropTypes.node,
    className: PropTypes.string,
    required: PropTypes.bool,
    readOnly: PropTypes.bool,
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    variant: PropTypes.oneOf(['default', 'filled', 'borderless']),
    validation: PropTypes.func,
    mask: PropTypes.func,
    maxLength: PropTypes.number,
    autoComplete: PropTypes.string,
    showPassword: PropTypes.bool,
    clearable: PropTypes.bool,
    loading: PropTypes.bool,
    helperText: PropTypes.string,
    onClear: PropTypes.func,
    iconPosition: PropTypes.oneOf(['left', 'right'])
};

Input.displayName = 'Input';

export default Input; 
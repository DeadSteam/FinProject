import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
    type = 'text',
    placeholder = '',
    value,
    onChange,
    onBlur,
    onFocus,
    disabled = false,
    error = '',
    label = '',
    icon = null,
    className = '',
    required = false,
    ...props 
}, ref) => {
    const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
    
    const getInputClasses = () => {
        const classes = ['input'];
        
        if (error) {
            classes.push('input-error');
        }
        
        if (className) {
            classes.push(className);
        }
        
        return classes.join(' ');
    };

    return (
        <div className="input-group">
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                    {required && <span className="text-error"> *</span>}
                </label>
            )}
            
            <div className="input-wrapper">
                {icon && (
                    <span className="input-icon">
                        {icon}
                    </span>
                )}
                
                <input
                    ref={ref}
                    id={inputId}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    disabled={disabled}
                    className={getInputClasses()}
                    required={required}
                    {...props}
                />
            </div>
            
            {error && (
                <span className="error-message">
                    {error}
                </span>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input; 
 
 
 
 
 
 
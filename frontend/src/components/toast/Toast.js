import React, { useEffect, useState } from 'react';

const Toast = ({ 
    message = '', 
    type = 'info', // success, error, warning, info
    duration = 5000,
    onClose,
    position = 'top-right' // top-right, top-left, bottom-right, bottom-left
}) => {
    // Make sure message is a string
    const messageContent = typeof message === 'string' ? message : 
        (message && typeof message === 'object' ? JSON.stringify(message) : '');
    
    // Validate type
    const validTypes = ['success', 'error', 'warning', 'info'];
    const safeType = validTypes.includes(type) ? type : 'info';
    
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            if (onClose && typeof onClose === 'function') onClose();
        }, 300);
    };

    if (!isVisible) return null;

    const getToastClasses = () => {
        const classes = ['toast', `toast-${safeType}`, `toast-${position}`];
        
        if (isExiting) {
            classes.push('toast-exit');
        }
        
        return classes.join(' ');
    };

    const getIcon = () => {
        switch (safeType) {
            case 'success':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path 
                            d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>
                );
            case 'error':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path 
                            d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>
                );
            case 'warning':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path 
                            d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>
                );
            default:
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path 
                            d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>
                );
        }
    };

    return (
        <div className={getToastClasses()}>
            <div className="toast-icon">
                {getIcon()}
            </div>
            <div className="toast-content">
                <p className="toast-message">{messageContent}</p>
            </div>
            <button 
                className="toast-close" 
                onClick={handleClose}
                type="button"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path 
                        d="M18 6L6 18M6 6L18 18" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
        </div>
    );
};

export default Toast; 
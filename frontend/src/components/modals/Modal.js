import React, { useEffect, useRef, useCallback, forwardRef } from 'react';
import PropTypes from 'prop-types';
import styles from './Modal.module.css';

/**
 * Универсальный Modal компонент с поддержкой размеров, анимаций и улучшенным UX
 * Объединяет функциональность простого и расширенного модальных компонентов
 */
const Modal = forwardRef(({ 
    isOpen,
    onClose,
    title,
    children,
    footer,
    className = '',
    // Расширенные возможности
    size = 'md',
    centered = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    showCloseButton = true,
    animation = 'fade',
    preventBodyScroll = true,
    persistent = false,
    loading = false,
    ...props
}, ref) => {
    const previousActiveElement = useRef(null);

    // Обработка escape key
    const handleEscapeKey = useCallback((event) => {
        if (event.key === 'Escape' && closeOnEscape && !persistent) {
            onClose();
        }
    }, [closeOnEscape, persistent, onClose]);

    // Управление scroll body
    useEffect(() => {
        if (isOpen && preventBodyScroll) {
            previousActiveElement.current = document.activeElement;
            document.body.style.overflow = 'hidden';
            
            // Focus trap
            if (ref && ref.current) {
                ref.current.focus();
            }
        } else {
            document.body.style.overflow = '';
            
            // Restore focus
            if (previousActiveElement.current) {
                previousActiveElement.current.focus();
            }
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, preventBodyScroll, ref]);

    // Event listeners
    useEffect(() => {
        if (isOpen && closeOnEscape) {
            document.addEventListener('keydown', handleEscapeKey);
            return () => document.removeEventListener('keydown', handleEscapeKey);
        }
    }, [isOpen, handleEscapeKey]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && !persistent) {
            onClose();
        }
    };

    const getModalClasses = () => {
        const classes = [styles.modal];
        
        if (isOpen) {
            classes.push(styles.modalOpen);
        }
        
        if (animation) {
            const animationClass = styles[`modal${animation.charAt(0).toUpperCase() + animation.slice(1)}`];
            if (animationClass) {
                classes.push(animationClass);
            }
        }
        
        if (centered) {
            classes.push(styles.modalCentered);
        }
        
        if (loading) {
            classes.push(styles.modalLoading);
        }
        
        if (className) {
            classes.push(className);
        }
        
        return classes.join(' ');
    };

    const getModalContentClasses = () => {
        const classes = [styles.modalContent];
        
        // Размеры
        if (size === 'sm') classes.push(styles.modalSm);
        if (size === 'lg') classes.push(styles.modalLg); 
        if (size === 'xl') classes.push(styles.modalXl);
        if (size === 'full') classes.push(styles.modalFull);
        
        return classes.join(' ');
    };

    const renderCloseButton = () => {
        if (!showCloseButton) return null;

        return (
            <button 
                className={styles.modalClose} 
                onClick={onClose}
                disabled={persistent}
                aria-label="Close modal"
            >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        );
    };

    const renderHeader = () => {
        if (!title && !showCloseButton) return null;

        return (
            <div className={styles.modalHeader}>
                {title && <h3 className={styles.modalTitle}>{title}</h3>}
                {renderCloseButton()}
            </div>
        );
    };

    const renderLoading = () => {
        if (!loading) return null;

        return (
            <div className={styles.modalLoadingOverlay}>
                <div className={styles.modalSpinner}>
                    <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
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
                </div>
            </div>
        );
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className={getModalClasses()} 
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            {...props}
        >
            <div 
                ref={ref}
                className={getModalContentClasses()}
                tabIndex={-1}
            >
                {renderHeader()}
                
                <div className={styles.modalBody}>
                    {children}
                </div>
                
                {footer && (
                    <div className={styles.modalFooter}>
                        {footer}
                    </div>
                )}
                
                {renderLoading()}
            </div>
        </div>
    );
});

Modal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    children: PropTypes.node.isRequired,
    footer: PropTypes.node,
    className: PropTypes.string,
    size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
    centered: PropTypes.bool,
    closeOnBackdrop: PropTypes.bool,
    closeOnEscape: PropTypes.bool,
    showCloseButton: PropTypes.bool,
    animation: PropTypes.oneOf(['fade', 'slide', 'zoom']),
    preventBodyScroll: PropTypes.bool,
    persistent: PropTypes.bool,
    loading: PropTypes.bool
};

Modal.displayName = 'Modal';

export default React.memo(Modal);
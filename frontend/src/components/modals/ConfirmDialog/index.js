import PropTypes from 'prop-types';
import React from 'react';

import Button from '../../ui/Button';
import Modal from '../Modal';
import './ConfirmDialog.module.css';

/**
 * ConfirmDialog - составной компонент для подтверждений
 * Использует Modal и Button компоненты
 */
const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Подтверждение',
    message = 'Вы уверены?',
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    confirmVariant = 'primary',
    cancelVariant = 'secondary',
    icon = null,
    variant = 'default', // default, danger, warning, info
    loading = false,
    size = 'sm',
    ...props
}) => {
    const handleConfirm = () => {
        onConfirm?.();
    };

    const getIconForVariant = () => {
        if (icon) return icon;

        switch (variant) {
            case 'danger':
                return (
                    <svg className="confirm-dialog-icon confirm-dialog-icon-danger" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="confirm-dialog-icon confirm-dialog-icon-warning" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                );
            case 'info':
                return (
                    <svg className="confirm-dialog-icon confirm-dialog-icon-info" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                );
            default:
                return (
                    <svg className="confirm-dialog-icon confirm-dialog-icon-question" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                    </svg>
                );
        }
    };

    const getConfirmVariant = () => {
        if (confirmVariant !== 'primary') return confirmVariant;
        
        switch (variant) {
            case 'danger':
                return 'danger';
            case 'warning':
                return 'warning';
            default:
                return 'primary';
        }
    };

    const footer = (
        <div className="confirm-dialog-actions">
            <Button
                variant={cancelVariant}
                onClick={onClose}
                disabled={loading}
                size="md"
            >
                {cancelText}
            </Button>
            <Button
                variant={getConfirmVariant()}
                onClick={handleConfirm}
                loading={loading}
                size="md"
            >
                {confirmText}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            footer={footer}
            size={size}
            centered
            closeOnBackdrop={!loading}
            closeOnEscape={!loading}
            showCloseButton={!loading}
            persistent={loading}
            animation="zoom"
            className={`confirm-dialog confirm-dialog-${variant}`}
            {...props}
        >
            <div className="confirm-dialog-content">
                {getIconForVariant()}
                <div className="confirm-dialog-message">
                    {typeof message === 'string' ? (
                        <p>{message}</p>
                    ) : (
                        message
                    )}
                </div>
            </div>
        </Modal>
    );
};

ConfirmDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string,
    message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    confirmVariant: PropTypes.oneOf([
        'primary', 'secondary', 'info', 'danger', 
        'warning', 'success', 'ghost', 'link'
    ]),
    cancelVariant: PropTypes.oneOf([
        'primary', 'secondary', 'info', 'danger', 
        'warning', 'success', 'ghost', 'link'
    ]),
    icon: PropTypes.node,
    variant: PropTypes.oneOf(['default', 'danger', 'warning', 'info']),
    loading: PropTypes.bool,
    size: PropTypes.oneOf(['sm', 'md', 'lg'])
};

export default ConfirmDialog; 
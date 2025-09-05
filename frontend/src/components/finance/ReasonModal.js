import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../modals/Modal';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import styles from '../../styles/components/ReasonModal.module.css';
import { API_BASE_URL } from '../../config/api.js';

/**
 * Модальное окно для ввода причины отклонения
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Флаг открытия модального окна
 * @param {Function} props.onClose - Функция закрытия модального окна
 * @param {string} props.actualValueId - ID фактического значения
 * @param {string} props.currentReason - Текущая причина отклонения (если есть)
 * @param {Function} props.onSave - Callback после сохранения причины
 */
const ReasonModal = ({ isOpen, onClose, actualValueId, currentReason, onSave }) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    // Обновляем состояние при открытии модального окна
    useEffect(() => {
        if (isOpen) {
            setReason(currentReason || '');
        }
    }, [isOpen, currentReason]);

    /**
     * Обработчик сохранения причины
     */
    const handleSave = async () => {
        if (!reason.trim()) {
            showToast('Введите причину отклонения', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/finance/actual-values/${actualValueId}/reason`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: reason.trim() })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка ${response.status}: ${errorText}`);
            }

            showToast('Причина отклонения сохранена', 'success');
            onSave?.(reason.trim());
            onClose();
        } catch (error) {
            showToast(`Ошибка: ${error.message}`, 'error');
            console.error('Ошибка сохранения причины:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Причина отклонения">
            <div className={styles.reasonModal}>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Укажите причину отклонения от плана..."
                    rows={4}
                    className={styles.reasonTextarea}
                    disabled={loading}
                />
                <div className={styles.modalActions}>
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="secondary"
                        disabled={loading}
                    >
                        Отмена
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={loading || !reason.trim()}
                    >
                        {loading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

ReasonModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    actualValueId: PropTypes.string.isRequired,
    currentReason: PropTypes.string,
    onSave: PropTypes.func
};

export default React.memo(ReasonModal);
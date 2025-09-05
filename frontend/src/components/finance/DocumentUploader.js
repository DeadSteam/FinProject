import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import styles from '../../styles/components/DocumentUploader.module.css';
import { API_BASE_URL } from '../../config/api.js';

/**
 * Компонент для загрузки документов (чеков)
 * 
 * @component
 * @param {Object} props
 * @param {string} props.actualValueId - ID фактического значения
 * @param {Function} props.onUpload - Callback-функция, вызываемая после успешной загрузки
 */
const DocumentUploader = ({ actualValueId, onUpload }) => {
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const { showToast } = useToast();

    /**
     * Обработчик загрузки файла
     * @param {FileList|File[]} files - Файлы для загрузки
     */
    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;
        
        setLoading(true);
        try {
            for (const file of files) {
                // Проверяем тип файла
                if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                    showToast('Поддерживаются только изображения и PDF', 'error');
                    continue;
                }
                
                // Проверяем размер файла (макс. 10 МБ)
                if (file.size > 10 * 1024 * 1024) {
                    showToast(`Файл ${file.name} слишком большой (макс. 10 МБ)`, 'error');
                    continue;
                }
                
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch(`${API_BASE_URL}/finance/documents/?actual_value_id=${actualValueId}`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ошибка ${response.status}: ${errorText}`);
                }
                
                const document = await response.json();
                onUpload?.(document);
                
                showToast(`Документ ${file.name} успешно загружен`, 'success');
            }
        } catch (error) {
            showToast(`Ошибка загрузки: ${error.message}`, 'error');
            console.error('Ошибка загрузки документа:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Обработчик событий перетаскивания
     */
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    /**
     * Обработчик события сброса файла
     */
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        const files = Array.from(e.dataTransfer.files);
        handleFileUpload(files);
    };

    return (
        <div
            className={`${styles.documentUploader} ${dragActive ? styles.dragActive : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                style={{ display: 'none' }}
                id={`file-input-${actualValueId}`}
            />
            <label htmlFor={`file-input-${actualValueId}`}>
                <Button
                    type="button"
                    disabled={loading}
                    variant="secondary"
                    size="sm"
                >
                    📎 {loading ? 'Загрузка...' : 'Прикрепить'}
                </Button>
            </label>
        </div>
    );
};

DocumentUploader.propTypes = {
    actualValueId: PropTypes.string.isRequired,
    onUpload: PropTypes.func
};

export default DocumentUploader; 
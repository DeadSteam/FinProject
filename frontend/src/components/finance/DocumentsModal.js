import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../modals/Modal';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import styles from '../../styles/components/DocumentsModal.module.css';
import { API_BASE_URL } from '../../config/api.js';

const PreviewModal = ({ isOpen, onClose, doc }) => {
    if (!doc) return null;
    const isImage = doc.content_type && doc.content_type.startsWith('image/');
    const isPdf = doc.content_type === 'application/pdf';
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={doc.filename} size="lg">
            <div style={{textAlign: 'center', minHeight: 400}}>
                {isImage && <img src={doc.file_url + '?inline=1'} alt={doc.filename} style={{maxWidth: '100%', maxHeight: 500}} />}
                {isPdf && <iframe src={doc.file_url + '?inline=1'} title={doc.filename} width="100%" height="500px" style={{border: 'none'}} />}
                {!isImage && !isPdf && <p>Превью недоступно для этого типа файла.</p>}
            </div>
        </Modal>
    );
};

/**
 * Модальное окно для отображения и загрузки документов
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Флаг открытия модального окна
 * @param {Function} props.onClose - Функция закрытия модального окна
 * @param {string} props.actualValueId - ID фактического значения
 * @param {Function} props.onUpload - Callback после загрузки документа
 */
const DocumentsModal = ({ isOpen, onClose, actualValueId, onUpload }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const { showToast } = useToast();

    // Загружаем документы при открытии модального окна
    useEffect(() => {
        if (isOpen && actualValueId) {
            loadDocuments();
        }
    }, [isOpen, actualValueId]);

    /**
     * Загрузка списка документов
     */
    const loadDocuments = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/finance/documents/?actual_value_id=${actualValueId}`);
            if (!response.ok) {
                throw new Error(`Ошибка ${response.status}`);
            }
            const data = await response.json();
            setDocuments(data);
        } catch (error) {
            showToast(`Ошибка загрузки документов: ${error.message}`, 'error');
            console.error('Ошибка загрузки документов:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Обработчик загрузки файла
     */
    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;
        
        setUploading(true);
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
                setDocuments(prev => [...prev, document]);
                onUpload?.(document);
                
                showToast(`Документ ${file.name} успешно загружен`, 'success');
            }
        } catch (error) {
            showToast(`Ошибка загрузки: ${error.message}`, 'error');
            console.error('Ошибка загрузки документа:', error);
        } finally {
            setUploading(false);
        }
    };

    /**
     * Обработчик клика по кнопке добавления файла
     */
    const handleAddFileClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,.pdf';
        input.onchange = (e) => handleFileUpload(Array.from(e.target.files));
        input.click();
    };

    /**
     * Форматирование размера файла
     */
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Б';
        const k = 1024;
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    /**
     * Форматирование даты
     */
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleString('ru-RU');
    };

    /**
     * Удаление документа
     */
    const handleDeleteDocument = async (docId) => {
        if (!window.confirm('Удалить этот документ?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/finance/documents/${docId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Ошибка удаления');
            setDocuments(prev => prev.filter(d => d.id !== docId));
            showToast('Документ удалён', 'success');
        } catch (error) {
            showToast('Ошибка удаления: ' + error.message, 'error');
        }
    };

    return (
        <>
            <Modal 
                isOpen={isOpen} 
                onClose={onClose} 
                title="Документы" 
                size="lg"
            >
                <div className={styles.documentsModal}>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <p>Загрузка документов...</p>
                        </div>
                    ) : (
                        <>
                            {/* Список документов */}
                            <div className={styles.documentsList}>
                                {documents.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p>Документы не найдены</p>
                                        <p className={styles.emptyHint}>Добавьте первый документ</p>
                                    </div>
                                ) : (
                                    documents.map((doc) => (
                                        <div key={doc.id} className={styles.documentItem}>
                                            <div className={styles.documentIcon}>
                                                {doc.content_type?.startsWith('image/') ? (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                                        <polyline points="21,15 16,10 5,21"/>
                                                    </svg>
                                                ) : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className={styles.documentInfo}>
                                                <div className={styles.documentName} style={{fontWeight: 600, fontSize: '1.05em'}}>{doc.filename}</div>
                                                <div className={styles.documentMeta}>
                                                    <span>{formatFileSize(doc.file_size)}</span>
                                                    <span>•</span>
                                                    <span>{formatDate(doc.uploaded_at)}</span>
                                                </div>
                                            </div>
                                            <div className={styles.documentActions}>
                                                <button
                                                    className={styles.downloadBtn}
                                                    onClick={() => {
                                                        const a = document.createElement('a');
                                                        a.href = doc.file_url;
                                                        a.download = doc.filename;
                                                        a.target = '_blank';
                                                        a.rel = 'noopener noreferrer';
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        document.body.removeChild(a);
                                                    }}
                                                    title="Скачать"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <path d="M20 8.94a1.31 1.31 0 0 0-0.06-0.27l0-0.09a1.07 1.07 0 0 0-0.19-0.28h0l-6-6h0a1.07 1.07 0 0 0-0.28-0.19l-0.1 0A1.1 1.1 0 0 0 13.06 2H7A3 3 0 0 0 4 5V19a3 3 0 0 0 3 3H17a3 3 0 0 0 3-3V9S20 9 20 8.94ZM14 5.41L16.59 8H15a1 1 0 0 1-1-1ZM18 19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5A1 1 0 0 1 7 4h5V7a3 3 0 0 0 3 3h3Zm-4.71-4.71l-0.29 0.3V12a1 1 0 0 0-2 0v2.59l-0.29-0.3a1 1 0 0 0-1.42 1.42l2 2a1 1 0 0 0 0.33 0.21a0.94 0.94 0 0 0 0.76 0a1 1 0 0 0 0.33-0.21l2-2a1 1 0 0 0-1.42-1.42Z"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    className={styles.downloadBtn}
                                                    onClick={() => setPreviewDoc(doc)}
                                                    title="Просмотр"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                </button>
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    title="Удалить"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                        <path d="M19 7l-0.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Кнопка добавления документа */}
                            <div className={styles.addDocumentSection}>
                                <Button
                                    type="button"
                                    onClick={handleAddFileClick}
                                    disabled={uploading}
                                    variant="primary"
                                    size="md"
                                >
                                    {uploading ? (
                                        <>
                                            <div className={styles.uploadSpinner}></div>
                                            Загрузка...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                                    d="M12 4v16m8-8H4" />
                                            </svg>
                                            Добавить документ
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
            <PreviewModal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)} doc={previewDoc} />
        </>
    );
};

DocumentsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    actualValueId: PropTypes.string.isRequired,
    onUpload: PropTypes.func
};

export default React.memo(DocumentsModal);
import React, { useState, useRef } from 'react';
import Modal from '../Modal';
import Button from '../../ui/Button';
import Avatar from '../../common/Avatar/Avatar';
import { useToast } from '../../../context/ToastContext';
import { useAuthService } from '../../../services';
import styles from './AvatarChangeModal.module.css';

const AvatarChangeModal = ({ 
    isOpen, 
    onClose, 
    user, 
    onAvatarChanged 
}) => {
    const { showToast } = useToast();
    const authService = useAuthService();
    const fileInputRef = useRef(null);
    
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = (file) => {
        if (!file) return;

        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            showToast('Выберите изображение', 'error');
            return;
        }

        // Проверка размера файла (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Файл слишком большой (максимум 5MB)', 'error');
            return;
        }

        // Создание превью
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragIn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setDragActive(true);
        }
    };

    const handleDragOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!preview || !fileInputRef.current?.files[0]) {
            showToast('Выберите изображение', 'error');
            return;
        }

        setUploading(true);
        try {
            const file = fileInputRef.current.files[0];
            await authService.uploadAvatar(file);
            
            showToast('Аватар успешно обновлен', 'success');
            onAvatarChanged?.();
            handleClose();
        } catch (error) {
            console.error('Ошибка загрузки аватара:', error);
            showToast(error.message || 'Ошибка при загрузке аватара', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        setUploading(true);
        try {
            await authService.removeAvatar();
            showToast('Аватар удален', 'success');
            onAvatarChanged?.();
            handleClose();
        } catch (error) {
            console.error('Ошибка удаления аватара:', error);
            showToast(error.message || 'Ошибка при удалении аватара', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Смена аватара"
            size="md"
        >
            <div className={styles.container}>
                {/* Текущий аватар */}
                <div className={styles.currentAvatar}>
                    <h4>Текущий аватар</h4>
                    <Avatar user={user} size="large" />
                </div>

                {/* Область загрузки */}
                <div className={styles.uploadSection}>
                    <h4>Новый аватар</h4>
                    
                    <div 
                        className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
                        onDragEnter={handleDragIn}
                        onDragLeave={handleDragOut}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={openFileDialog}
                    >
                        {preview ? (
                            <div className={styles.preview}>
                                <img src={preview} alt="Превью" />
                                <div className={styles.previewOverlay}>
                                    <span>Нажмите для выбора другого файла</span>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.uploadPrompt}>
                                <div className={styles.uploadIcon}>📷</div>
                                <p>Перетащите изображение сюда или нажмите для выбора</p>
                                <p className={styles.uploadHint}>
                                    Поддерживаются: JPG, PNG, GIF (максимум 5MB)
                                </p>
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className={styles.hiddenInput}
                    />
                </div>

                {/* Кнопки действий */}
                <div className={styles.actions}>
                    <Button
                        onClick={handleUpload}
                        disabled={!preview || uploading}
                        loading={uploading}
                        variant="primary"
                    >
                        {uploading ? 'Загрузка...' : 'Сохранить'}
                    </Button>
                    
                    {user?.avatar_url && (
                        <Button
                            onClick={handleRemoveAvatar}
                            disabled={uploading}
                            variant="danger"
                        >
                            Удалить аватар
                        </Button>
                    )}
                    
                    <Button
                        onClick={handleClose}
                        disabled={uploading}
                        variant="secondary"
                    >
                        Отмена
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AvatarChangeModal; 
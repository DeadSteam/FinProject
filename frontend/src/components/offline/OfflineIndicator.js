import React, { useState, useEffect } from 'react';
import styles from './OfflineIndicator.module.css';

/**
 * Компонент индикатора состояния подключения
 * 
 * Возможности:
 * - Отображение статуса подключения (онлайн/офлайн)
 * - Показ количества несинхронизированных операций
 * - Индикатор процесса синхронизации
 * - Уведомления о восстановлении/потере связи
 */
const OfflineIndicator = ({
    isOnline = true,
    syncState = 'idle', // 'idle', 'syncing', 'error'
    pendingOperations = 0,
    lastSyncTime = null,
    onManualSync,
    onShowQueue,
    showDetailedInfo = false
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // Автоматически показываем детали при проблемах
    useEffect(() => {
        if (!isOnline || syncState === 'error' || pendingOperations > 0) {
            setIsExpanded(true);
        }
    }, [isOnline, syncState, pendingOperations]);

    const getStatusColor = () => {
        if (!isOnline) return '#ff6b6b'; // Красный - офлайн
        if (syncState === 'error') return '#ffa726'; // Оранжевый - ошибка
        if (syncState === 'syncing') return '#42a5f5'; // Синий - синхронизация
        if (pendingOperations > 0) return '#ffc107'; // Желтый - есть несинхронизированные
        return '#4caf50'; // Зеленый - все ок
    };

    const getStatusText = () => {
        if (!isOnline) return 'Офлайн режим';
        if (syncState === 'error') return 'Ошибка синхронизации';
        if (syncState === 'syncing') return 'Синхронизация...';
        if (pendingOperations > 0) return `${pendingOperations} операций ожидают`;
        return 'Подключение активно';
    };

    const getStatusIcon = () => {
        if (!isOnline) {
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
                </svg>
            );
        }
        
        if (syncState === 'syncing') {
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={styles.spinning}>
                    <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
                </svg>
            );
        }
        
        if (syncState === 'error') {
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
            );
        }
        
        if (pendingOperations > 0) {
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    <circle cx="18" cy="6" r="4"/>
                    <text x="18" y="9" textAnchor="middle" fontSize="8" fill="white">{Math.min(pendingOperations, 99)}</text>
                </svg>
            );
        }
        
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
        );
    };

    const formatLastSyncTime = () => {
        if (!lastSyncTime) return 'Никогда';
        
        const now = Date.now();
        const diff = now - lastSyncTime;
        
        if (diff < 60000) return 'Менее минуты назад';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
        
        return new Date(lastSyncTime).toLocaleDateString('ru-RU');
    };

    return (
        <div className={styles.offlineIndicator}>
            {/* Основной индикатор */}
            <div 
                className={`${styles.indicator} ${isExpanded ? styles.expanded : ''}`}
                style={{ backgroundColor: getStatusColor() }}
                onClick={() => setIsExpanded(!isExpanded)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <div className={styles.iconContainer}>
                    {getStatusIcon()}
                </div>
                
                {isExpanded && (
                    <div className={styles.statusText}>
                        {getStatusText()}
                    </div>
                )}
            </div>

            {/* Tooltip для краткой информации */}
            {showTooltip && !isExpanded && (
                <div className={styles.tooltip}>
                    <div className={styles.tooltipContent}>
                        <div className={styles.tooltipStatus}>{getStatusText()}</div>
                        {lastSyncTime && (
                            <div className={styles.tooltipSync}>
                                Последняя синхронизация: {formatLastSyncTime()}
                            </div>
                        )}
                        <div className={styles.tooltipHint}>Нажмите для подробностей</div>
                    </div>
                </div>
            )}

            {/* Детальная информация */}
            {isExpanded && (showDetailedInfo || !isOnline || syncState === 'error' || pendingOperations > 0) && (
                <div className={styles.detailsPanel}>
                    <div className={styles.detailsHeader}>
                        <span>Состояние подключения</span>
                        <button 
                            className={styles.closeBtn}
                            onClick={() => setIsExpanded(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div className={styles.detailsContent}>
                        <div className={styles.statusRow}>
                            <span className={styles.label}>Соединение:</span>
                            <span className={`${styles.value} ${isOnline ? styles.online : styles.offline}`}>
                                {isOnline ? 'Активно' : 'Отсутствует'}
                            </span>
                        </div>

                        <div className={styles.statusRow}>
                            <span className={styles.label}>Синхронизация:</span>
                            <span className={styles.value}>
                                {syncState === 'idle' && 'Готова'}
                                {syncState === 'syncing' && 'Выполняется...'}
                                {syncState === 'error' && 'Ошибка'}
                            </span>
                        </div>

                        {pendingOperations > 0 && (
                            <div className={styles.statusRow}>
                                <span className={styles.label}>В очереди:</span>
                                <span className={styles.value}>
                                    {pendingOperations} операций
                                    {onShowQueue && (
                                        <button 
                                            className={styles.linkBtn}
                                            onClick={onShowQueue}
                                        >
                                            Показать
                                        </button>
                                    )}
                                </span>
                            </div>
                        )}

                        {lastSyncTime && (
                            <div className={styles.statusRow}>
                                <span className={styles.label}>Последняя синхронизация:</span>
                                <span className={styles.value}>{formatLastSyncTime()}</span>
                            </div>
                        )}

                        {/* Действия */}
                        <div className={styles.actions}>
                            {isOnline && onManualSync && (
                                <button 
                                    className={styles.actionBtn}
                                    onClick={onManualSync}
                                    disabled={syncState === 'syncing'}
                                >
                                    {syncState === 'syncing' ? 'Синхронизация...' : 'Синхронизировать'}
                                </button>
                            )}
                            
                            {!isOnline && (
                                <div className={styles.offlineMessage}>
                                    Изменения сохраняются локально и будут синхронизированы при восстановлении соединения
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfflineIndicator; 
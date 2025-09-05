import React, { useState, useMemo } from 'react';
import styles from './VersionHistory.module.css';

/**
 * Компонент для отображения истории версий данных
 * 
 * Возможности:
 * - Отображение списка версий с временными метками
 * - Сравнение версий
 * - Откат к предыдущим версиям
 * - Фильтрация по типу изменений
 * - Поиск по метаданным
 */
const VersionHistory = ({
    versions = [],
    onRollback,
    onCompare,
    onClose,
    isLoading = false,
    selectedForCompare = null,
    onSelectForCompare
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');

    // Фильтрация и сортировка версий
    const filteredVersions = useMemo(() => {
        let filtered = versions.filter(version => {
            const matchesSearch = !searchTerm || 
                version.metadata?.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                version.metadata?.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                version.metadata?.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType = filterType === 'all' || 
                version.metadata?.action === filterType;
            
            return matchesSearch && matchesType;
        });

        return filtered.sort((a, b) => {
            const aTime = new Date(a.timestamp).getTime();
            const bTime = new Date(b.timestamp).getTime();
            return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
        });
    }, [versions, searchTerm, filterType, sortOrder]);

    // Получение уникальных типов действий для фильтра
    const actionTypes = useMemo(() => {
        const types = new Set();
        versions.forEach(version => {
            if (version.metadata?.action) {
                types.add(version.metadata.action);
            }
        });
        return Array.from(types);
    }, [versions]);

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActionDisplayName = (action) => {
        const actionNames = {
            'edit_metric_value': 'Изменение значения метрики',
            'add_metric': 'Добавление метрики',
            'delete_metric': 'Удаление метрики',
            'update_category': 'Обновление категории',
            'create_plan': 'Создание плана',
            'init_year': 'Инициализация года'
        };
        return actionNames[action] || action;
    };

    const handleCompareClick = (version) => {
        if (selectedForCompare === version.id) {
            onSelectForCompare(null);
        } else if (selectedForCompare) {
            onCompare(selectedForCompare, version.id);
            onSelectForCompare(null);
        } else {
            onSelectForCompare(version.id);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.versionHistory}>
                <div className={styles.header}>
                    <h3>История версий</h3>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <span>Загрузка истории версий...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.versionHistory}>
            <div className={styles.header}>
                <h3>История версий</h3>
                <button className={styles.closeBtn} onClick={onClose}>×</button>
            </div>

            {/* Фильтры и поиск */}
            <div className={styles.controls}>
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Поиск по действию, пользователю, категории..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.filters}>
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">Все действия</option>
                        {actionTypes.map(type => (
                            <option key={type} value={type}>
                                {getActionDisplayName(type)}
                            </option>
                        ))}
                    </select>

                    <button 
                        className={styles.sortBtn}
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        title={`Сортировка: ${sortOrder === 'desc' ? 'Новые сначала' : 'Старые сначала'}`}
                    >
                        {sortOrder === 'desc' ? '↓' : '↑'}
                    </button>
                </div>
            </div>

            {/* Инструкции для сравнения */}
            {selectedForCompare && (
                <div className={styles.compareInstructions}>
                    <span>Выберите вторую версию для сравнения или нажмите "Отмена"</span>
                    <button 
                        className={styles.cancelCompareBtn}
                        onClick={() => onSelectForCompare(null)}
                    >
                        Отмена
                    </button>
                </div>
            )}

            {/* Список версий */}
            <div className={styles.versionList}>
                {filteredVersions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>
                            {searchTerm || filterType !== 'all' 
                                ? 'Версии не найдены по заданным критериям'
                                : 'История версий пуста'
                            }
                        </p>
                    </div>
                ) : (
                    filteredVersions.map((version, index) => (
                        <div 
                            key={version.id} 
                            className={`${styles.versionItem} ${
                                selectedForCompare === version.id ? styles.selectedForCompare : ''
                            }`}
                        >
                            <div className={styles.versionHeader}>
                                <div className={styles.versionInfo}>
                                    <span className={styles.versionAction}>
                                        {getActionDisplayName(version.metadata?.action)}
                                    </span>
                                    <span className={styles.versionTime}>
                                        {formatTimestamp(version.timestamp)}
                                    </span>
                                </div>
                                <div className={styles.versionActions}>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => handleCompareClick(version)}
                                        title="Сравнить версии"
                                    >
                                        {selectedForCompare === version.id ? 'Отмена' : 'Сравнить'}
                                    </button>
                                    {index > 0 && (
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => onRollback(version.id)}
                                            title="Откатить к этой версии"
                                        >
                                            Откатить
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.versionDetails}>
                                {version.metadata?.user && (
                                    <span className={styles.versionUser}>
                                        Пользователь: {version.metadata.user}
                                    </span>
                                )}
                                {version.metadata?.categoryName && (
                                    <span className={styles.versionCategory}>
                                        Категория: {version.metadata.categoryName}
                                    </span>
                                )}
                                {version.metadata?.year && (
                                    <span className={styles.versionYear}>
                                        Год: {version.metadata.year}
                                    </span>
                                )}
                                {version.metadata?.shop && version.metadata.shop !== 'all' && (
                                    <span className={styles.versionShop}>
                                        Магазин: {version.metadata.shop}
                                    </span>
                                )}
                            </div>

                            {index === 0 && (
                                <div className={styles.currentVersionBadge}>
                                    Текущая версия
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Статистика */}
            <div className={styles.footer}>
                <span className={styles.stats}>
                    Показано: {filteredVersions.length} из {versions.length} версий
                </span>
            </div>
        </div>
    );
};

export default VersionHistory; 
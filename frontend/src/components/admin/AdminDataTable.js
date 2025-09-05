import React, { useState, useEffect, useCallback } from 'react';

import styles from '../../styles/pages/Admin.module.css';
import { formatPhone } from '../../utils/phoneUtils.js';
import { useConflictResolution } from '../../hooks/useConflictResolution';
import { useToast } from '../../context/AppContext';

/**
 * @typedef {'users' | 'categories' | 'shops' | 'metrics'} EntityType
 */

/**
 * Универсальная и адаптивная таблица для отображения и управления данными в админ-панели.
 * Поддерживает CRUD операции, кастомный рендеринг ячеек и разрешение конфликтов.
 * 
 * @param {object} props - Пропсы компонента.
 * @param {Array<object>} [props.data=[]] - Массив данных для отображения.
 * @param {EntityType} props.entityType - Тип сущности для определения конфигурации таблицы.
 * @param {function(object): void} props.onEdit - Callback-функция для редактирования элемента.
 * @param {function(string): void} props.onDelete - Callback-функция для удаления элемента.
 * @param {function(object): void} [props.onConflictResolved] - Callback при успешном разрешении конфликта.
 * @param {boolean} [props.loading=false] - Флаг состояния загрузки данных.
 * @returns {React.ReactElement}
 */
function AdminDataTable({ 
    data = [], 
    entityType, 
    onEdit, 
    onDelete,
    onConflictResolved, // Новый callback для уведомления о разрешенных конфликтах
    loading = false 
}) {
    const { showToast } = useToast();
    
    // 🔄 Конфигурация для разрешения конфликтов
    const conflictConfig = {
        enableAutoDetection: true,
        checkInterval: 30000, // Проверка каждые 30 секунд
        deepComparison: true,
        ignoreFields: ['_id', '_rev', 'lastModified', 'updatedAt', 'loading'],
        defaultStrategy: 'manual', // Ручное разрешение для админских данных
        autoResolveThreshold: 'low',
        showNotifications: true,
        enableLogging: process.env.NODE_ENV === 'development'
    };

    const {
        detectConflict,
        resolveConflict
    } = useConflictResolution(conflictConfig);

    // 🔄 Состояние для конфликтов
    const [activeConflicts, setActiveConflicts] = useState(new Map());
    const [conflictResolutionModal, setConflictResolutionModal] = useState(null);
    const [editingItems, setEditingItems] = useState(new Set()); // Элементы в процессе редактирования
    const [lastKnownData, setLastKnownData] = useState(new Map()); // Последние известные версии данных

    /**
     * Эффект для отслеживания изменений данных и обнаружения конфликтов.
     * Сравнивает текущие данные с последней известной версией.
     */
    useEffect(() => {
        const checkForConflicts = async () => {
            for (const item of data) {
                const lastKnown = lastKnownData.get(item.id);
                
                if (lastKnown && !editingItems.has(item.id)) {
                    // Проверяем на конфликты только если элемент не редактируется нами
                    try {
                        // Проверяем, что detectConflict является функцией
                        if (typeof detectConflict === 'function') {
                            const conflict = detectConflict(
                                entityType,
                                item.id,
                                lastKnown,
                                item,
                                lastKnown
                            );

                            if (conflict && conflict.fieldConflicts && conflict.fieldConflicts.length > 0) {
                                setActiveConflicts(prev => new Map(prev.set(item.id, conflict)));
                                
                                if (conflict.severity === 'high' || conflict.severity === 'critical') {
                                    showToast('Обнаружен конфликт данных: Элемент "' + getItemDisplayName(item) + '" был изменен другим пользователем', 'warning');
                                }
                            }
                        } else {
                            console.warn('detectConflict is not available or not a function');
                        }
                    } catch (error) {
                        console.error('Ошибка обнаружения конфликта:', error);
                    }
                }
            }
            
            // Обновляем последние известные данные
            const newLastKnownData = new Map();
            data.forEach(item => {
                newLastKnownData.set(item.id, { ...item });
            });
            setLastKnownData(newLastKnownData);
        };

        if (data.length > 0) {
            checkForConflicts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, entityType, editingItems, showToast, detectConflict]);

    /**
     * Получает отображаемое имя для элемента на основе его типа.
     * @param {object} item - Элемент данных.
     * @returns {string} Отображаемое имя.
     */
    const getItemDisplayName = (item) => {
        const config = getTableConfig(entityType);
        return config.getTitle(item) || `${entityType} #${item.id}`;
    };

    /**
     * Обрабатывает начало редактирования элемента.
     * Если для элемента существует конфликт, открывает модальное окно разрешения.
     * @type {function(object): void}
     */
    const handleEditStart = useCallback((item) => {
        setEditingItems(prev => new Set(prev.add(item.id)));
        
        // Проверяем на конфликт перед началом редактирования
        const conflict = activeConflicts.get(item.id);
        if (conflict) {
            setConflictResolutionModal({
                conflict,
                item,
                onResolve: handleConflictResolve,
                onCancel: () => setConflictResolutionModal(null)
            });
            return;
        }
        
        onEdit(item);
    }, [activeConflicts, onEdit]);

    /**
     * Обрабатывает завершение редактирования элемента.
     * @type {function(string): void}
     */
    const handleEditEnd = useCallback((itemId) => {
        setEditingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
        });
    }, []);

    /**
     * Обрабатывает разрешение конфликта.
     * @param {object} resolution - Объект с данными для разрешения.
     * @param {object} resolution.conflict - Исходный объект конфликта.
     * @param {string} resolution.strategy - Выбранная стратегия разрешения.
     * @param {object} [resolution.mergedData] - Объединенные данные (для ручного мержа).
     */
    const handleConflictResolve = async (resolution) => {
        try {
            const { conflict, strategy, mergedData } = resolution;
            
            const resolvedData = await resolveConflict(conflict.id, {
                strategy,
                mergedData,
                user: 'current_user' // TODO: получить из контекста авторизации
            });

            // Убираем конфликт из активных
            setActiveConflicts(prev => {
                const newMap = new Map(prev);
                newMap.delete(conflict.entityId);
                return newMap;
            });

            setConflictResolutionModal(null);

            // Уведомляем родительский компонент
            if (onConflictResolved) {
                onConflictResolved(resolvedData);
            }

            showToast('Конфликт разрешен: Конфликт для "' + conflict.entityId + '" успешно разрешен', 'success');

        } catch (error) {
            showToast('Ошибка разрешения конфликта: ' + error.message, 'error');
        }
    };

    /**
     * Возвращает конфигурацию таблицы (колонки, рендеры) для указанного типа сущности.
     * @param {EntityType} type - Тип сущности.
     * @returns {object} Конфигурация таблицы.
     */
    const getTableConfig = (type) => {
        const configs = {
            users: {
                columns: [
                    { key: 'user', title: 'Пользователь', render: renderUserCell },
                    { key: 'username', title: 'Логин' },
                    { key: 'phone_number', title: 'Телефон', render: renderPhoneCell },
                    { key: 'role', title: 'Роль', render: renderRoleCell },
                    { key: 'status', title: 'Статус', render: renderStatusCell },
                    { key: 'actions', title: 'Действия', render: renderActionsCell }
                ],
                mobileFields: [
                    { key: 'phone_number', label: 'Телефон', render: renderPhoneCell },
                    { key: 'role', label: 'Роль', render: renderRoleCell },
                    { key: 'status', label: 'Статус', render: renderStatusCell }
                ],
                getAvatar: (item) => item.username?.substring(0, 2).toUpperCase() || 'НА',
                getTitle: (item) => item.username,
                getSubtitle: (item) => item.email
            },
            categories: {
                columns: [
                    { key: 'name', title: 'Название' },
                    { key: 'description', title: 'Описание', render: renderDescriptionCell },
                    { key: 'image', title: 'Изображение', render: renderImageCell },
                    { key: 'status', title: 'Статус', render: renderStatusCell },
                    { key: 'actions', title: 'Действия', render: renderActionsCell }
                ],
                mobileFields: [
                    { key: 'status', label: 'Статус', render: renderStatusCell }
                ],
                getAvatar: (item) => renderImageCell(item),
                getTitle: (item) => item.name,
                getSubtitle: (item) => item.description || 'Нет описания'
            },
            shops: {
                columns: [
                    { key: 'name', title: 'Название' },
                    { key: 'address', title: 'Адрес', render: renderAddressCell },
                    { key: 'description', title: 'Описание', render: renderDescriptionCell },
                    { key: 'number_of_staff', title: 'Персонал', render: renderStaffCell },
                    { key: 'status', title: 'Статус', render: renderStatusCell },
                    { key: 'actions', title: 'Действия', render: renderActionsCell }
                ],
                mobileFields: [
                    { key: 'description', label: 'Описание', render: renderDescriptionCell },
                    { key: 'number_of_staff', label: 'Персонал', render: renderStaffCell },
                    { key: 'status', label: 'Статус', render: renderStatusCell }
                ],
                getAvatar: () => (
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                ),
                getTitle: (item) => item.name,
                getSubtitle: (item) => item.address || 'Адрес не указан'
            },
            metrics: {
                columns: [
                    { key: 'name', title: 'Название' },
                    { key: 'category', title: 'Категория', render: renderCategoryCell },
                    { key: 'unit', title: 'Единица измерения', render: renderUnitCell },
                    { key: 'actions', title: 'Действия', render: renderActionsCell }
                ],
                mobileFields: [
                    { key: 'category', label: 'Категория', render: renderCategoryCell },
                    { key: 'unit', label: 'Единица измерения', render: renderUnitCell }
                ],
                getAvatar: () => 'М',
                getTitle: (item) => item.name,
                getSubtitle: (item) => `${item.category?.name || ''} - ${item.unit || ''}`
            },
            'yearly-plans': {
                columns: [
                    { key: 'year', title: 'Год', render: renderYearCell },
                    { key: 'metric', title: 'Метрика', render: renderMetricNameCell },
                    { key: 'shop', title: 'Магазин', render: renderShopNameCell },
                    { key: 'plan_value', title: 'Плановое значение', render: renderPlanValueCell },
                    { key: 'actions', title: 'Действия', render: renderActionsCell }
                ],
                mobileFields: [
                    { key: 'year', label: 'Год', render: renderYearCell },
                    { key: 'plan_value', label: 'Плановое значение', render: renderPlanValueCell }
                ],
                getAvatar: () => '📋',
                getTitle: (item) => renderMetricNameCell(item),
                getSubtitle: (item) => renderShopNameCell(item)
            }
        };
        
        return configs[type] || configs.users;
    };

    // Функции рендеринга для разных типов ячеек
    function renderUserCell(item) {
        return (
            <div className={styles.userCell}>
                <div className={styles.avatar}>
                    {item.username?.substring(0, 2).toUpperCase() || 'НА'}
                </div>
                <div className={styles.details}>
                    <div className={styles.name}>{item.username}</div>
                    <div className={styles.email}>{item.email}</div>
                </div>
            </div>
        );
    }

    function renderPhoneCell(item) {
        return formatPhone(item.phone_number, 'display') || 'Не указан';
    }

    function renderRoleCell(item) {
        return item.role?.name || 'Не назначена';
    }

    function renderStatusCell(item) {
        const isActive = item.status;
        const statusText = entityType === 'categories' 
            ? (isActive ? 'Активна' : 'Неактивна')
            : (isActive ? 'Активен' : 'Неактивен');
            
        return (
            <span className={`${styles.status} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                {statusText}
            </span>
        );
    }

    function renderDescriptionCell(item) {
        return item.description || 'Нет описания';
    }

    function renderAddressCell(item) {
        return item.address || 'Не указан';
    }

    function renderStaffCell(item) {
        return `${item.number_of_staff || 0} чел.`;
    }

    function renderImageCell(item) {
        if (item.image_id && item.image) {
            return (
                <div className={styles.categoryIcon}>
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                        <path d={item.image.svg_data} />
                    </svg>
                </div>
            );
        }
        return 'Нет изображения';
    }

    function renderCategoryCell(item) {
        return item.category?.name || 'Не указана';
    }

    function renderUnitCell(item) {
        return item.unit || 'Не указана';
    }

    // Функции рендеринга для годовых планов
    function renderYearCell(item) {
        if (item.year) {
            return item.year.toString();
        }
        // Если year_id есть, но нет объекта year
        return item.year_id ? item.year_id.toString() : 'Не указан';
    }

    function renderMetricNameCell(item) {
        // Если есть объект metric
        if (item.metric && item.metric.name) {
            return item.metric.name;
        }
        // Если есть только metric_name (из API)
        if (item.metric_name) {
            return item.metric_name;
        }
        return 'Не указана';
    }

    function renderShopNameCell(item) {
        // Если есть объект shop
        if (item.shop && item.shop.name) {
            return item.shop.name;
        }
        // Если есть только shop_name (из API)
        if (item.shop_name) {
            return item.shop_name;
        }
        return 'Не указан';
    }

    function renderPlanValueCell(item) {
        if (item.plan_value === null || item.plan_value === undefined) {
            return '0';
        }
        return new Intl.NumberFormat('ru-RU').format(item.plan_value);
    }

    function renderActionsCell(item) {
        const hasConflict = activeConflicts.has(item.id);
        const isBeingEdited = editingItems.has(item.id);
        
        return (
            <div className={styles.actionsCell}>
                {/* 🔄 Индикатор конфликта */}
                {hasConflict && (
                    <div className={styles.conflictIndicator} title="Обнаружен конфликт данных">
                        <svg fill="#ff6b6b" viewBox="0 0 24 24" width="16" height="16">
                            <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z"/>
                        </svg>
                    </div>
                )}
                
                {/* 🔄 Индикатор редактирования */}
                {isBeingEdited && (
                    <div className={styles.editingIndicator} title="Редактируется">
                        <svg fill="#4ecdc4" viewBox="0 0 24 24" width="16" height="16">
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </div>
                )}
                
                <button 
                    className={`${styles.rowAction} ${hasConflict ? styles.conflictAction : ''}`}
                    onClick={() => handleEditStart(item)}
                    title={hasConflict ? "Редактировать (есть конфликт)" : "Редактировать"}
                >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button 
                    className={styles.rowAction}
                    onClick={() => onDelete(item.id)}
                    title="Удалить"
                    disabled={isBeingEdited}
                >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 7l-0.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        );
    }

    const config = getTableConfig(entityType);

    if (loading) {
        return (
            <div className={styles.tableLoading}>
                <div className={styles.spinner}></div>
                <span>Загрузка данных...</span>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0l-2-5H6l-2 5"/>
                    </svg>
                </div>
                <p className={styles.emptyMessage}>Нет данных для отображения</p>
            </div>
        );
    }

    return (
        <>
            {/* 🔄 Модальное окно разрешения конфликтов */}
            {conflictResolutionModal && (
                <div className={styles.conflictModal}>
                    <div className={styles.conflictModalContent}>
                        <div className={styles.conflictModalHeader}>
                            <h3>Обнаружен конфликт данных</h3>
                            <button 
                                className={styles.conflictModalClose}
                                onClick={() => setConflictResolutionModal(null)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className={styles.conflictModalBody}>
                            <p>
                                Элемент <strong>"{getItemDisplayName(conflictResolutionModal.item)}"</strong> 
                                был изменен другим пользователем. Выберите действие:
                            </p>
                            
                            <div className={styles.conflictActions}>
                                <button 
                                    className={styles.conflictActionBtn}
                                    onClick={() => handleConflictResolve({
                                        conflict: conflictResolutionModal.conflict,
                                        strategy: 'client_wins',
                                        mergedData: conflictResolutionModal.item
                                    })}
                                >
                                    Использовать мои изменения
                                </button>
                                
                                <button 
                                    className={styles.conflictActionBtn}
                                    onClick={() => handleConflictResolve({
                                        conflict: conflictResolutionModal.conflict,
                                        strategy: 'server_wins',
                                        mergedData: conflictResolutionModal.conflict.server
                                    })}
                                >
                                    Использовать изменения сервера
                                </button>
                                
                                <button 
                                    className={styles.conflictActionBtn}
                                    onClick={() => {
                                        // Открываем редактирование для ручного слияния
                                        setConflictResolutionModal(null);
                                        onEdit(conflictResolutionModal.item);
                                    }}
                                >
                                    Редактировать вручную
                                </button>
                            </div>
                            
                            {/* Показываем детали конфликта */}
                            <div className={styles.conflictDetails}>
                                <h4>Детали конфликта:</h4>
                                <div className={styles.conflictInfo}>
                                    <span className={styles.conflictSeverity}>
                                        Серьезность: {conflictResolutionModal.conflict.severity || 'Средняя'}
                                    </span>
                                    <span className={styles.conflictType}>
                                        Тип: {conflictResolutionModal.conflict.type || 'Одновременное редактирование'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Десктопная таблица */}
            <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            {config.columns.map((column, index) => (
                                <th key={index}>{column.title}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr key={item.id}>
                                {config.columns.map((column, index) => (
                                    <td key={index}>
                                        {column.render 
                                            ? column.render(item) 
                                            : item[column.key]
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Мобильные карточки */}
            <div className={styles.mobileCardsList}>
                {data.map(item => (
                    <div key={item.id} className={styles.mobileCard}>
                        <div className={styles.mobileCardHeader}>
                            <div className={styles.mobileCardAvatar}>
                                {config.getAvatar(item)}
                            </div>
                            <div>
                                <div className={styles.mobileCardTitle}>{config.getTitle(item)}</div>
                                <div className={styles.mobileCardSubtitle}>{config.getSubtitle(item)}</div>
                            </div>
                        </div>
                        
                        <div className={styles.mobileCardBody}>
                            {config.mobileFields.map((field, index) => (
                                <div key={index} className={styles.mobileCardField}>
                                    <span className={styles.mobileCardLabel}>{field.label}:</span>
                                    <span className={styles.mobileCardValue}>
                                        {field.render 
                                            ? field.render(item) 
                                            : item[field.key]
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <div className={styles.mobileCardActions}>
                            {/* 🔄 Индикаторы для мобильной версии */}
                            {(activeConflicts.has(item.id) || editingItems.has(item.id)) && (
                                <div className={styles.mobileStatusIndicators}>
                                    {activeConflicts.has(item.id) && (
                                        <span className={styles.mobileConflictBadge}>Конфликт</span>
                                    )}
                                    {editingItems.has(item.id) && (
                                        <span className={styles.mobileEditingBadge}>Редактируется</span>
                                    )}
                                </div>
                            )}
                            
                            <button 
                                className={`${styles.mobileActionBtn} ${activeConflicts.has(item.id) ? styles.conflictAction : ''}`}
                                onClick={() => handleEditStart(item)}
                                title={activeConflicts.has(item.id) ? "Редактировать (есть конфликт)" : "Редактировать"}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                                Редактировать
                            </button>
                            <button 
                                className={`${styles.mobileActionBtn} ${styles.danger}`}
                                onClick={() => onDelete(item.id)}
                                title="Удалить"
                                disabled={editingItems.has(item.id)}
                            >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 7l-0.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/>
                                </svg>
                                Удалить
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

// 🔄 Expose методы для управления состоянием редактирования
AdminDataTable.handleEditEnd = (tableRef, itemId) => {
    if (tableRef?.current?.handleEditEnd) {
        tableRef.current.handleEditEnd(itemId);
    }
};

AdminDataTable.getConflictStatus = (tableRef) => {
    if (tableRef?.current?.getConflictStatus) {
        return tableRef.current.getConflictStatus();
    }
    return { hasConflicts: false, conflictCount: 0 };
};

export default React.memo(AdminDataTable);
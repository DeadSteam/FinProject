import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';

import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AdminContext } from '../../components/layout/AdminLayout';
import { useToast } from '../../context/ToastContext';
import { 
    useCrud, 
    useForm, 
    useFilter, 
    useModal, 
    usePermissions, 
    useApiMutation,
    useDebounce,
    useDebouncedCallback,
    useClickOutside,
    useLocalStorage,
    useToggle
} from '../../hooks';
import styles from '../../styles/pages/Admin.module.css';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../modals/Modal';

import AdminDataTable from './AdminDataTable';
import AdminHeader from './AdminHeader';

/**
 * Универсальный компонент для админских CRUD страниц
 * Устраняет дублирование кода между AdminUsers, AdminCategories, AdminShops, AdminMetrics
 */
function AdminCrudPage({
    // Конфигурация сущности
    entityConfig: {
        name,           // 'пользователь', 'категория', 'магазин', 'метрика'
        namePlural,     // 'пользователи', 'категории', 'магазины', 'метрики'
        entityType,     // 'users', 'categories', 'shops', 'metrics'
        service,        // userService, categoryService, etc.
        
        // Конфигурация формы
        formFields,     // Поля формы с начальными значениями
        validationRules,// Правила валидации
        searchFields,   // Поля для поиска
        
        // Конфигурация фильтров
        filters,        // Дополнительные фильтры
        
        // Кастомные обработчики (опционально)
        customHandlers: {
            beforeSave,     // Функция предобработки данных перед сохранением
            afterLoad,      // Функция постобработки после загрузки
            validateForm,   // Кастомная валидация формы
            formatForEdit,  // Форматирование данных для редактирования
        } = {}
    },
    
    // Дополнительные компоненты
    additionalFilters,  // JSX для дополнительных фильтров
    customFormFields,   // JSX для кастомных полей формы
    additionalData = {},// Дополнительные данные (роли, изображения и т.д.)
    additionalHeaderButtons // Дополнительные кнопки в хедере
}) {
    const { showToast } = useToast();
    const { toggleSidebar } = useContext(AdminContext);
    
    // Проверки прав доступа с новым usePermissions
    const {
        canCreateUsers,
        canEditUsers, 
        canDeleteUsers,
        canAccessAdmin,
        canAccess,
        isAdmin
    } = usePermissions();
    
    // Уведомления через useToast
    const showSuccess = (title, message) => showToast(`${title}: ${message}`, 'success');
    const showError = (title, message) => showToast(`${title}: ${message}`, 'error');
    const showWarning = (title, message) => showToast(`${title}: ${message}`, 'warning');

    // Создаем сервис адаптер для useCrud
    const serviceAdapter = {
        getAll: () => {
            // Для каждого типа сущности используем правильный метод
            switch (entityType) {
                case 'users':
                    return service.getUsers();
                case 'categories':
                    return service.getCategories();
                case 'shops':
                    return service.getShops();
                case 'metrics':
                    return service.getMetrics();
                case 'yearly-plans':
                    return service.api.get('/finance/yearly-plans');
                default:
                    return service.getAll ? service.getAll() : Promise.reject(new Error(`Метод getAll не найден для ${entityType}`));
            }
        },
        create: (data) => {
            switch (entityType) {
                case 'users':
                    return service.createUser(data);
                case 'categories':
                    return service.createCategory(data);
                case 'shops':
                    return service.createShop(data);
                case 'metrics':
                    return service.createMetric(data);
                case 'yearly-plans':
                    // Для годовых планов используем distributeYearlyPlan
                    return service.distributeYearlyPlan(
                        data.metric_id,
                        data.shop_id,
                        parseInt(data.year_id),
                        parseFloat(data.plan_value)
                    );
                default:
                    return service.create ? service.create(data) : Promise.reject(new Error(`Метод create не найден для ${entityType}`));
            }
        },
        update: (id, data) => {
            switch (entityType) {
                case 'users':
                    return service.updateUser(id, data);
                case 'categories':
                    return service.updateCategory(id, data);
                case 'shops':
                    return service.updateShop(id, data);
                case 'metrics':
                    return service.updateMetric(id, data);
                case 'yearly-plans':
                    return service.api.put(`/finance/yearly-plans/${id}`, data);
                default:
                    return service.update ? service.update(id, data) : Promise.reject(new Error(`Метод update не найден для ${entityType}`));
            }
        },
        delete: (id) => {
            switch (entityType) {
                case 'users':
                    return service.deleteUser(id);
                case 'categories':
                    return service.deleteCategory(id);
                case 'shops':
                    return service.deleteShop(id);
                case 'metrics':
                    return service.deleteMetric(id);
                case 'yearly-plans':
                    return service.api.delete(`/finance/yearly-plans/${id}`);
                default:
                    return service.delete ? service.delete(id) : Promise.reject(new Error(`Метод delete не найден для ${entityType}`));
            }
        }
    };

        // Сервис адаптер с логированием
    const enhancedServiceAdapter = {
        ...serviceAdapter,
        create: (data) => {
            return serviceAdapter.create(data);
        },
        update: (id, data) => {
            return serviceAdapter.update(id, data);
        }
    };

    // Основные хуки для CRUD операций
    const crudOperations = useCrud(enhancedServiceAdapter, name);

    // API мутации для улучшенной обработки
    const createMutation = useApiMutation(enhancedServiceAdapter.create, {
        onSuccess: () => {
            showSuccess('Создание', `${name.charAt(0).toUpperCase() + name.slice(1)} успешно создан${name.endsWith('а') ? 'а' : ''}`);
            crudOperations.refresh();
            modal.close();
        },
        onError: (error) => {
            showError('Ошибка создания', error.message);
        }
    });

    const updateMutation = useApiMutation(({ id, data }) => enhancedServiceAdapter.update(id, data), {
        onSuccess: () => {
            showSuccess('Обновление', `${name.charAt(0).toUpperCase() + name.slice(1)} успешно обновлен${name.endsWith('а') ? 'а' : ''}`);
            crudOperations.refresh();
            modal.close();
        },
        onError: (error) => {
            showError('Ошибка обновления', error.message);
        }
    });

    const deleteMutation = useApiMutation(enhancedServiceAdapter.delete, {
        onSuccess: () => {
            showSuccess('Удаление', `${name.charAt(0).toUpperCase() + name.slice(1)} успешно удален${name.endsWith('а') ? 'а' : ''}`);
            crudOperations.refresh();
        },
        onError: (error) => {
            showError('Ошибка удаления', error.message);
        }
    });

    // ВАЖНО: Хуки должны быть в правильном порядке!
    
    // 1. Локальное хранение настроек фильтров (объявляем ПЕРВЫМ)
    const [savedFilters, setSavedFilters] = useLocalStorage(`admin-${entityType}-filters`, {
        searchTerm: '',
        statusFilter: 'all',
        pageSize: 10
    });

    // 2. Переключатели для интерфейса (пока не используются)
    
    // 3. Debounced поиск для оптимизации
    const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm || '');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // 4. Создаем правильные начальные значения на основе конфигурации полей
    const createInitialValues = (formFields) => {
        const initialValues = {};
        Object.keys(formFields).forEach(fieldName => {
            const fieldConfig = formFields[fieldName];
            switch (fieldConfig.type) {
                case 'checkbox':
                    initialValues[fieldName] = false;
                    break;
                case 'number':
                    initialValues[fieldName] = fieldConfig.min || 0;
                    break;
                case 'select':
                    initialValues[fieldName] = '';
                    break;
                default:
                    initialValues[fieldName] = '';
            }
        });
        return initialValues;
    };

    // 5. Хуки для модального окна и формы
    const modal = useModal();
    const form = useForm(createInitialValues(formFields), validationRules);
    
    // 6. Хук для закрытия модалки по клику вне
    const modalRef = useClickOutside(() => {
        if (modal.isOpen && !form.isDirty) {
            modal.close();
        }
    });

    // 7. Улучшенная фильтрация с учетом debounced поиска
    const itemsFilter = useFilter(
        crudOperations.items,
        {
            // Стандартный фильтр по статусу
            status: (item, value) => {
                if (value === 'all') return true;
                return value === 'active' ? item.status : !item.status;
            },
            // Дополнительные фильтры
            ...filters
        },
        { 
            searchFields,
            searchTerm: debouncedSearchTerm // Используем debounced версию
        }
    );

    // 8. Простая пагинация без API (будем использовать локальную)
    const pageSize = savedFilters?.pageSize || 10;
    const [currentPage, setCurrentPage] = useState(1);
    
    // Простая пагинация на клиенте
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return itemsFilter.filteredItems.slice(startIndex, endIndex);
    }, [itemsFilter.filteredItems, currentPage, pageSize]);

    const totalPages = Math.ceil(itemsFilter.filteredItems.length / pageSize);

    // Методы пагинации
    const goToPage = useCallback((page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setSavedFilters(prev => ({ ...prev, currentPage: page }));
        }
    }, [totalPages, setSavedFilters]);

    const goToFirstPage = useCallback(() => goToPage(1), [goToPage]);
    const goToPreviousPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
    const goToNextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);
    const goToLastPage = useCallback(() => goToPage(totalPages), [goToPage, totalPages]);

    // Состояние для дополнительных данных
    const [additionalState, setAdditionalState] = useState({});

    // Сохранение настроек фильтров при изменении
    useEffect(() => {
        setSavedFilters(prev => ({
            ...prev,
            searchTerm: debouncedSearchTerm
        }));
    }, [debouncedSearchTerm, setSavedFilters]);

    // Обработчик поиска с debounce
    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);
    }, []);

    // Debounced callback для дополнительной оптимизации API вызовов (пока не используется)

    // Загрузка данных при монтировании
    useEffect(() => {
        const loadData = async () => {
            await crudOperations.load();
            
            // Выполняем дополнительную загрузку данных если есть
            if (afterLoad) {
                try {
                    const extraData = await afterLoad();
                    setAdditionalState(extraData || {});
                } catch (error) {
                    showError('Ошибка загрузки', `Ошибка при загрузке дополнительных данных: ${error.message}`);
                }
            }
        };
        
        loadData();
    }, []);

    // Обработчики событий
    const handleAdd = () => {
        // Проверяем права на создание
        const canCreate = canAccess(entityType, 'create');
        if (!canCreate) {
            showError('Недостаточно прав', 'У вас нет прав для создания записей');
            return;
        }
        
        // Сбрасываем форму с правильными начальными значениями
        form.reset(createInitialValues(formFields));
        modal.open(null);
    };

    const handleEdit = (item) => {
        // Проверяем права на редактирование
        const canEdit = canAccess(entityType, 'update', { ownerId: item.user_id });
        if (!canEdit) {
            showError('Недостаточно прав', 'У вас нет прав для редактирования этой записи');
            return;
        }
        
        const formData = formatForEdit ? formatForEdit(item) : item;
        form.setFormValues(formData);
        modal.open(item);
    };

    const handleDelete = async (itemId) => {
        // Проверяем права на удаление
        const canDelete = canAccess(entityType, 'delete');
        if (!canDelete) {
            showError('Недостаточно прав', 'У вас нет прав для удаления записей');
            return;
        }

        // Подтверждение удаления
        const confirmMessage = `Вы уверены, что хотите удалить ${name}?`;
        if (!window.confirm(confirmMessage)) {
            return;
        }
        
        // Используем мутацию для удаления
        deleteMutation.mutate(itemId);
    };

    const handleSave = async (formValues) => {
        try {
            // Кастомная валидация если есть
            if (validateForm) {
                const validationResult = await validateForm(formValues, modal.data);
                if (!validationResult.isValid) {
                    showError('Ошибка валидации', validationResult.message);
                    return false;
                }
            }

            // Предобработка данных если есть
            const processedData = beforeSave ? await beforeSave(formValues, modal.data) : formValues;

            if (modal.data) {
                // Редактирование - используем updateMutation
                updateMutation.mutate({ id: modal.data.id, data: processedData });
            } else {
                // Создание - используем createMutation
                createMutation.mutate(processedData);
            }
            
            return true;
        } catch (error) {
            showError('Ошибка сохранения', `Ошибка при сохранении: ${error.message}`);
            return false;
        }
    };

    const handleFormFieldChange = (field, value) => {
        form.handleChange(field, value);
    };

    // Рендер формы
    const renderFormFields = () => {
        return Object.entries(formFields).map(([fieldName, fieldConfig]) => {
            // Получаем правильное значение поля с проверкой типа
            let fieldValue = form.values[fieldName];
            if (fieldValue === undefined || fieldValue === null) {
                fieldValue = fieldConfig.type === 'checkbox' ? false : '';
            }
            const fieldError = form.errors[fieldName];

            // Если есть кастомное поле - используем его
            if (customFormFields && customFormFields[fieldName]) {
                const CustomField = customFormFields[fieldName];
                return (
                    <CustomField
                        key={fieldName}
                        value={fieldValue}
                        onChange={(value) => handleFormFieldChange(fieldName, value)}
                        error={fieldError}
                        additionalState={additionalState}
                    />
                );
            }

            // Стандартные поля
            switch (fieldConfig.type) {
                case 'text':
                case 'email':
                case 'password':
                case 'number':
                    return (
                        <div key={fieldName} className={styles.formGroup}>
                            <label htmlFor={fieldName} className={styles.formLabel}>
                                {fieldConfig.label} 
                                {fieldConfig.required && <span className="required">*</span>}
                            </label>
                            <Input
                                id={fieldName}
                                type={fieldConfig.type}
                                value={fieldValue}
                                onChange={(e) => handleFormFieldChange(fieldName, e.target.value)}
                                placeholder={fieldConfig.placeholder}
                                required={fieldConfig.required}
                                min={fieldConfig.min}
                                max={fieldConfig.max}
                            />
                            {fieldError && (
                                <div className="error-message">{fieldError}</div>
                            )}
                        </div>
                    );

                case 'textarea':
                    return (
                        <div key={fieldName} className={styles.formGroup}>
                            <label htmlFor={fieldName} className={styles.formLabel}>
                                {fieldConfig.label}
                                {fieldConfig.required && <span className="required">*</span>}
                            </label>
                            <textarea
                                id={fieldName}
                                className={styles.formControl}
                                rows={fieldConfig.rows || 3}
                                value={fieldValue}
                                onChange={(e) => handleFormFieldChange(fieldName, e.target.value)}
                                placeholder={fieldConfig.placeholder}
                                required={fieldConfig.required}
                            />
                            {fieldError && (
                                <div className="error-message">{fieldError}</div>
                            )}
                        </div>
                    );

                case 'select':
                    return (
                        <div key={fieldName} className={styles.formGroup}>
                            <label htmlFor={fieldName} className={styles.formLabel}>
                                {fieldConfig.label}
                                {fieldConfig.required && <span className="required">*</span>}
                            </label>
                            <select
                                id={fieldName}
                                className={styles.formControl}
                                value={fieldValue}
                                onChange={(e) => handleFormFieldChange(fieldName, e.target.value)}
                                required={fieldConfig.required}
                            >
                                <option value="">{fieldConfig.placeholder || `Выберите ${fieldConfig.label.toLowerCase()}`}</option>
                                {fieldConfig.options?.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {fieldError && (
                                <div className="error-message">{fieldError}</div>
                            )}
                        </div>
                    );

                case 'checkbox':
                    // Для checkbox правильно извлекаем boolean значение
                    const isChecked = typeof fieldValue === 'boolean' ? fieldValue : false;
                    return (
                        <div key={fieldName} className={styles.formGroup}>
                            <input
                                type="checkbox"
                                id={fieldName}
                                checked={isChecked}
                                onChange={(e) => handleFormFieldChange(fieldName, e.target.checked)}
                            />
                            <label htmlFor={fieldName} className={styles.checkboxLabel}>
                                {fieldConfig.label}
                            </label>
                        </div>
                    );

                default:
                    return null;
            }
        });
    };

    if (crudOperations.loading) {
        return <LoadingSpinner text={`Загрузка ${namePlural.toLowerCase()}...`} />;
    }

    return (
        <div>
            <AdminHeader
                title={`Управление ${namePlural.toLowerCase()}`}
                searchValue={searchTerm}
                onSearchChange={handleSearchChange}
                onAddClick={handleAdd}
                addButtonText={`Добавить ${name}`}
                onToggleSidebar={toggleSidebar}
                additionalButtons={Array.isArray(additionalHeaderButtons) ? additionalHeaderButtons : []}
            >
                {/* Стандартные фильтры */}
                <div className={styles.filterControls}>
                    <select 
                        className={styles.filterSelect}
                        value={itemsFilter.filters.status || 'all'}
                        onChange={(e) => itemsFilter.setFilter('status', e.target.value)}
                    >
                        <option value="all">Все статусы</option>
                        <option value="active">Активные</option>
                        <option value="inactive">Неактивные</option>
                    </select>
                    
                    {/* Дополнительные фильтры */}
                    {additionalFilters && additionalFilters({
                        filter: itemsFilter,
                        additionalData,
                        additionalState
                    })}

                    {/* Индикатор поиска с debounce */}
                    {searchTerm !== debouncedSearchTerm && (
                        <div className={styles.searchIndicator}>
                            🔍 Поиск...
                        </div>
                    )}
                </div>


            </AdminHeader>

            {/* Таблица данных с пагинацией */}
            <div className={styles.tableContainer}>
                <AdminDataTable
                    data={paginatedData}
                    entityType={entityType}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    loading={crudOperations.loading || deleteMutation.isLoading}
                />

                {/* Пагинация */}
                {itemsFilter.filteredItems.length > pageSize && (
                    <div className={styles.pagination}>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={goToFirstPage}
                            disabled={currentPage === 1}
                        >
                            ⏮️ Первая
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                        >
                            ◀️ Назад
                        </Button>
                        
                        <span className={styles.pageInfo}>
                            Страница {currentPage} из {totalPages}
                        </span>
                        
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={goToNextPage}
                            disabled={currentPage >= totalPages}
                        >
                            Вперед ▶️
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={goToLastPage}
                            disabled={currentPage >= totalPages}
                        >
                            Последняя ⏭️
                        </Button>
                    </div>
                )}
            </div>

            {/* Модальное окно с улучшенным UX */}
            <Modal
                ref={modalRef}
                isOpen={modal.isOpen}
                onClose={modal.close}
                title={modal.data ? `Редактировать ${name}` : `Добавить ${name}`}
                size="lg"
            >
                <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(handleSave); }}>
                    {renderFormFields()}
                    
                    <div className={styles.modalActions}>
                        <Button type="button" variant="secondary" onClick={modal.close}>
                            Отмена
                        </Button>
                        <Button 
                            type="submit" 
                            variant="primary"
                            loading={createMutation.isLoading || updateMutation.isLoading}
                            disabled={createMutation.isLoading || updateMutation.isLoading}
                        >
                            {modal.data ? 'Обновить' : 'Создать'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default React.memo(AdminCrudPage);
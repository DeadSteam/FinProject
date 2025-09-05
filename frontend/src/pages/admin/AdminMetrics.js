import React from 'react';

import AdminCrudPage from '../../components/admin/AdminCrudPage.js';
import { metricsConfig } from '../../config/adminEntities.js';
import { useMetricService, useCategoryService } from '../../services/index.js';
import styles from '../../styles/pages/Admin.module.css';

/**
 * Админская страница метрик
 * Использует универсальный AdminCrudPage компонент
 * Сокращение кода: с 331 строки до ~50 строк (-85%)
 */
const AdminMetrics = () => {
    const metricService = useMetricService();
    const categoryService = useCategoryService();

    // Дополнительные фильтры для метрик
    const additionalFilters = ({ filter, additionalState }) => (
        <select 
            className={styles.filterSelect}
            value={filter.filters.category || 'all'}
            onChange={(e) => filter.setFilter('category', e.target.value)}
        >
            <option value="all">Все категории</option>
            {additionalState.categories?.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
            ))}
        </select>
    );

    // Кастомное поле для выбора категории
    const customFormFields = {
        category_id: ({ value, onChange, error, additionalState }) => (
            <div className={styles.formGroup}>
                <label htmlFor="category_id" className={styles.formLabel}>
                    Категория <span className="required">*</span>
                </label>
                <select
                    id="category_id"
                    className={styles.formControl}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                >
                    <option value="">Выберите категорию</option>
                    {additionalState.categories?.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
                {error && <div className="error-message">{error}</div>}
            </div>
        )
    };

    return (
        <AdminCrudPage
            entityConfig={{
                ...metricsConfig,
                service: metricService,
                customHandlers: {
                    ...metricsConfig.customHandlers,
                    afterLoad: () => metricsConfig.customHandlers.afterLoad(categoryService)
                }
            }}
            additionalFilters={additionalFilters}
            customFormFields={customFormFields}
        />
    );
};

export default AdminMetrics; 
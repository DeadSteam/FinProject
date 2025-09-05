

import AdminCrudPage from '../../components/admin/AdminCrudPage.js';
import { categoriesConfig } from '../../config/adminEntities.js';
import { useCategoryService } from '../../services/index.js';
import styles from '../../styles/pages/Admin.module.css';

/**
 * Админская страница категорий
 * Использует универсальный AdminCrudPage компонент
 * Сокращение кода: с 284 строк до ~80 строк (-72%)
 */
const AdminCategories = () => {
    const categoryService = useCategoryService();

    // Кастомные поля формы для категорий
    const customFormFields = {
        image_id: ({ value, onChange, error, additionalState }) => (
            <div className={styles.formGroup}>
                <label htmlFor="image_id" className={styles.formLabel}>Изображение</label>
                <select
                    id="image_id"
                    className={styles.formControl}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">Выберите изображение</option>
                    {additionalState.images?.map(image => (
                        <option key={image.id} value={image.id}>{image.name}</option>
                    ))}
                </select>
                
                {/* Галерея изображений */}
                <div className={styles.imageGalleryContainer} style={{ marginTop: '1rem' }}>
                    {additionalState.images?.map(image => (
                        <div 
                            key={image.id} 
                            className={`${styles.imageItem} ${value == image.id ? styles.selected : ''}`}
                            onClick={() => onChange(image.id.toString())}
                        >
                            <div className={styles.categoryIcon}>
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                    <path d={image.svg_data} />
                                </svg>
                            </div>
                            <div className={styles.imageName}>
                                {image.name}
                            </div>
                        </div>
                    ))}
                </div>
                
                {error && <div className="error-message">{error}</div>}
            </div>
        )
    };

    return (
        <AdminCrudPage
            entityConfig={{
                ...categoriesConfig,
                service: categoryService,
                customHandlers: {
                    ...categoriesConfig.customHandlers,
                    afterLoad: () => categoriesConfig.customHandlers.afterLoad(categoryService)
                }
            }}
            customFormFields={customFormFields}
        />
    );
};

export default AdminCategories; 


import AdminCrudPage from '../../components/admin/AdminCrudPage.js';
import { InitYearModal } from '../../components/modals';
import Button from '../../components/ui/Button.js';
import { yearlyPlansConfig } from '../../config/adminEntities.js';
import { useToast } from '../../context/AppContext.js';
import { useModal } from '../../hooks/index.js';
import { useMetricService, useShopService } from '../../services/index.js';
import styles from '../../styles/pages/Admin.module.css';

/**
 * Админская страница годовых планов
 * Использует универсальный AdminCrudPage компонент
 * Сокращение кода: с 447 строк до ~150 строк (-67%)
 */
const AdminYearlyPlans = () => {
    const metricService = useMetricService();
    const shopService = useShopService();
    const { showToast } = useToast();
    const initYearModal = useModal();

    // Дополнительные фильтры для годовых планов
    const additionalFilters = ({ filter, additionalState }) => (
        <>
            <select 
                className={styles.filterSelect}
                value={filter.filters.year || 'all'}
                onChange={(e) => filter.setFilter('year', e.target.value)}
            >
                <option value="all">Все годы</option>
                {additionalState.years?.map(year => {
                    const yearValue = typeof year === 'object' && year !== null ? year.year : year;
                    const yearKey = typeof year === 'object' && year !== null ? year.id || year.year : year;
                    return (
                        <option key={`year-${yearKey}`} value={yearValue}>{yearValue}</option>
                    );
                })}
            </select>
            
            <select 
                className={styles.filterSelect}
                value={filter.filters.metric || 'all'}
                onChange={(e) => filter.setFilter('metric', e.target.value)}
            >
                <option value="all">Все метрики</option>
                {additionalState.metrics?.map(metric => (
                    <option key={metric.id} value={metric.id}>{metric.name}</option>
                ))}
            </select>
        </>
    );

    // Кастомные поля формы для годовых планов
    const customFormFields = {
        year_id: ({ value, onChange, error, additionalState }) => (
            <div className={styles.formGroup}>
                <label htmlFor="year_id" className={styles.formLabel}>
                    Год <span className="required">*</span>
                </label>
                <select
                    id="year_id"
                    className={styles.formControl}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                >
                    <option value="">Выберите год</option>
                    {additionalState.years?.map(year => {
                        const yearValue = typeof year === 'object' && year !== null ? year.year : year;
                        const yearKey = typeof year === 'object' && year !== null ? year.id || year.year : year;
                        return (
                            <option key={`modal-year-${yearKey}`} value={yearValue}>{yearValue}</option>
                        );
                    })}
                </select>
                {error && <div className="error-message">{error}</div>}
            </div>
        ),
        
        metric_id: ({ value, onChange, error, additionalState }) => (
            <div className={styles.formGroup}>
                <label htmlFor="metric_id" className={styles.formLabel}>
                    Метрика <span className="required">*</span>
                </label>
                <select
                    id="metric_id"
                    className={styles.formControl}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                >
                    <option value="">Выберите метрику</option>
                    {additionalState.metrics?.map(metric => (
                        <option key={metric.id} value={metric.id}>{metric.name}</option>
                    ))}
                </select>
                {error && <div className="error-message">{error}</div>}
            </div>
        ),
        
        shop_id: ({ value, onChange, error, additionalState }) => (
            <div className={styles.formGroup}>
                <label htmlFor="shop_id" className={styles.formLabel}>
                    Магазин <span className="required">*</span>
                </label>
                <select
                    id="shop_id"
                    className={styles.formControl}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                >
                    <option value="">Выберите магазин</option>
                    {additionalState.shops?.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                </select>
                {error && <div className="error-message">{error}</div>}
            </div>
        ),
        
        plan_value: ({ value, onChange, error }) => (
            <div className={styles.formGroup}>
                <label htmlFor="plan_value" className={styles.formLabel}>
                    Плановое значение <span className="required">*</span>
                </label>
                <input
                    id="plan_value"
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.formControl}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Введите плановое значение"
                    required
                />
                {error && <div className="error-message">{error}</div>}
                <div className={styles.infoMessage}>
                    План будет равномерно распределен по месяцам года.
                </div>
            </div>
        )
    };

    // Дополнительные кнопки в хедере
    const additionalHeaderButtons = (
        <Button onClick={() => initYearModal.open()} variant="secondary">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Инициализировать год
        </Button>
    );

    // Обработчик успешной инициализации года
    const handleInitYearSuccess = async (year) => {
        showToast(`Периоды для ${year} года успешно созданы`, 'success');
        // Можно добавить перезагрузку данных если необходимо
    };

    return (
        <>
            <AdminCrudPage
                entityConfig={{
                    ...yearlyPlansConfig,
                    service: metricService,
                    customHandlers: {
                        ...yearlyPlansConfig.customHandlers,
                        afterLoad: () => yearlyPlansConfig.customHandlers.afterLoad(metricService, shopService)
                    }
                }}
                additionalFilters={additionalFilters}
                customFormFields={customFormFields}
                additionalHeaderButtons={additionalHeaderButtons}
            />

            {/* Модальное окно инициализации года */}
            <InitYearModal
                isOpen={initYearModal.isOpen}
                onClose={initYearModal.close}
                onSuccess={handleInitYearSuccess}
            />
        </>
    );
};

export default AdminYearlyPlans;

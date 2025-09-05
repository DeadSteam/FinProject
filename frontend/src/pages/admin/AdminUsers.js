import AdminCrudPage from '../../components/admin/AdminCrudPage.js';
import { usersConfig } from '../../config/adminEntities.js';
import { useUserService } from '../../services/index.js';
import styles from '../../styles/pages/Admin.module.css';
import { applyPhoneMask } from '../../utils/phoneUtils.js';

/**
 * Админская страница пользователей
 * Использует универсальный AdminCrudPage компонент
 * Сокращение кода: с 221 строки до ~50 строк (-77%)
 */
const AdminUsers = () => {
    const userService = useUserService();

    // Дополнительные фильтры для пользователей
    const additionalFilters = ({ filter, additionalState }) => (
        <select 
            className={styles.filterSelect}
            value={filter.filters.role || 'all'}
            onChange={(e) => filter.setFilter('role', e.target.value)}
        >
            <option value="all">Все роли</option>
            {additionalState.roles?.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
            ))}
        </select>
    );

    // Кастомное поле для телефона с маской
    const customFormFields = {
        phone: ({ value, onChange, error }) => (
            <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.formLabel}>Номер телефона</label>
                <input
                    id="phone"
                    type="tel"
                    className={styles.formControl}
                    value={value}
                    onChange={(e) => {
                        const formatted = applyPhoneMask(e.target.value);
                        onChange(formatted);
                    }}
                    placeholder="+7 (999) 999-99-99"
                    maxLength="18"
                />
                {error && <div className="error-message">{error}</div>}
            </div>
        ),
        
        role_id: ({ value, onChange, error, additionalState }) => (
            <div className={styles.formGroup}>
                <label htmlFor="role_id" className={styles.formLabel}>
                    Роль <span className="required">*</span>
                </label>
                <select
                    id="role_id"
                    className={styles.formControl}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                >
                    <option value="">Выберите роль</option>
                    {additionalState.roles?.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                </select>
                {error && <div className="error-message">{error}</div>}
            </div>
        )
    };

    return (
        <AdminCrudPage
            entityConfig={{
                ...usersConfig,
                service: userService,
                customHandlers: {
                    ...usersConfig.customHandlers,
                    afterLoad: () => usersConfig.customHandlers.afterLoad(userService)
                }
            }}
            additionalFilters={additionalFilters}
            customFormFields={customFormFields}
        />
    );
};

export default AdminUsers; 
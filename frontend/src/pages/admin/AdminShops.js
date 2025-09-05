

import AdminCrudPage from '../../components/admin/AdminCrudPage.js';
import { shopsConfig } from '../../config/adminEntities.js';
import { useShopService } from '../../services/index.js';

/**
 * Упрощённая админская страница магазинов
 * Использует универсальный AdminCrudPage компонент
 * Сокращение кода: с 351 строки до ~20 строк (-94%)
 */
const AdminShops = () => {
    const shopService = useShopService();

    return (
        <AdminCrudPage
            entityConfig={{
                ...shopsConfig,
                service: shopService
            }}
        />
    );
};

export default AdminShops; 
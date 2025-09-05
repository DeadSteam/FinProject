/**
 * Интерфейс для сервиса категорий
 * Определяет контракт для всех реализаций сервиса категорий
 * Соблюдение принципов ISP (Interface Segregation) и DIP (Dependency Inversion)
 */

/**
 * @typedef {object} Category
 * @property {number} id
 * @property {string} name
 * @property {string|null} description
 */

/**
 * @typedef {object} ICategoryService
 * @property {() => Promise<Category[]>} getAllCategories - Fetches all categories.
 * @property {(id: number) => Promise<Category>} getCategoryById - Fetches a single category by its ID.
 * @property {(categoryData: Omit<Category, 'id'>) => Promise<Category>} createCategory - Creates a new category.
 * @property {(id: number, categoryData: Partial<Category>) => Promise<Category>} updateCategory - Updates an existing category.
 * @property {(id: number) => Promise<void>} deleteCategory - Deletes a category.
 */

export class ICategoryService {
    /**
     * Получение списка категорий
     * @param {Object} params - Параметры запроса
     * @returns {Promise<Object>} - Список категорий
     */
    async getCategories(params = {}) {
        throw new Error('Method "getCategories" must be implemented');
    }

    /**
     * Получение категории по ID
     * @param {number} id - ID категории
     * @returns {Promise<Object>} - Данные категории
     */
    async getCategoryById(id) {
        throw new Error('Method "getCategoryById" must be implemented');
    }

    /**
     * Создание новой категории
     * @param {Object} categoryData - Данные категории
     * @returns {Promise<Object>} - Созданная категория
     */
    async createCategory(categoryData) {
        throw new Error('Method "createCategory" must be implemented');
    }

    /**
     * Обновление категории
     * @param {number} id - ID категории
     * @param {Object} categoryData - Обновленные данные
     * @returns {Promise<Object>} - Обновленная категория
     */
    async updateCategory(id, categoryData) {
        throw new Error('Method "updateCategory" must be implemented');
    }

    /**
     * Удаление категории
     * @param {number} id - ID категории
     * @returns {Promise<Object>} - Результат удаления
     */
    async deleteCategory(id) {
        throw new Error('Method "deleteCategory" must be implemented');
    }
} 
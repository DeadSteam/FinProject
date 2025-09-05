import { ICategoryService } from './ICategoryService.js';

/**
 * Mock implementation for ICategoryService.
 * @implements {ICategoryService}
 */
export class MockCategoryService extends ICategoryService {
    constructor() {
        super();
        this.categories = [
            { id: 1, name: 'Продукты', description: 'Еда и напитки' },
            { id: 2, name: 'Транспорт', description: 'Автобус, такси, метро' },
            { id: 3, name: 'Развлечения', description: 'Кино, концерты, парки' },
        ];
        this.nextId = 4;
    }

    async getAllCategories() {
        console.log('Mock: Fetching all categories');
        return Promise.resolve(this.categories);
    }

    async getCategoryById(id) {
        console.log(`Mock: Fetching category with id ${id}`);
        const category = this.categories.find(c => c.id === id);
        return category ? Promise.resolve(category) : Promise.reject(new Error('Category not found'));
    }

    async createCategory(categoryData) {
        console.log('Mock: Creating category', categoryData);
        const newCategory = { ...categoryData, id: this.nextId++ };
        this.categories.push(newCategory);
        return Promise.resolve(newCategory);
    }

    async updateCategory(id, categoryData) {
        console.log(`Mock: Updating category ${id} with`, categoryData);
        const index = this.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            this.categories[index] = { ...this.categories[index], ...categoryData };
            return Promise.resolve(this.categories[index]);
        }
        return Promise.reject(new Error('Category not found'));
    }

    async deleteCategory(id) {
        console.log(`Mock: Deleting category ${id}`);
        const index = this.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            this.categories.splice(index, 1);
            return Promise.resolve();
        }
        return Promise.reject(new Error('Category not found'));
    }
} 
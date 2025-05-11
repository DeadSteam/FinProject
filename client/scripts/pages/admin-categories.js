import { CategoriesService } from '../services/CategoriesService.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        const categoriesService = new CategoriesService();
        categoriesService.init();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Ошибка загрузки модуля категорий');
    }
});
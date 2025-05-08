import { ShopsService } from '../services/ShopsService.js';

// Инициализация сервиса магазинов при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Инициализация страницы управления магазинами...");
    
    try {
        // Инициализируем сервис магазинов
        const shopsService = new ShopsService();
        shopsService.init();
    } catch (error) {
        console.error("Ошибка при инициализации страницы:", error);
        alert("Произошла ошибка при загрузке данных. Пожалуйста, проверьте работу сервера и перезагрузите страницу.");
    }
}); 
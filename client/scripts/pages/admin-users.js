import { UsersService } from '../services/UsersService.js';

// Инициализация сервиса пользователей при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Инициализация страницы управления пользователями...");
    
    try {
        // Инициализируем сервис пользователей
        const usersService = new UsersService();
        usersService.init();
    } catch (error) {
        console.error("Ошибка при инициализации страницы:", error);
        alert("Произошла ошибка при загрузке данных. Пожалуйста, проверьте работу сервера и перезагрузите страницу.");
    }
}); 
import {MetricsService} from '../services/MetricsService.js'

// Инициализация сервиса метрик при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Инициализируем метрик
        const  metricsService = new MetricsService();
        metricsService.init();
    } catch (error) {
        console.error("Ошибка при инициализации страницы:", error);
        alert("Произошла ошибка при загрузке данных. Пожалуйста, проверьте работу сервера и перезагрузите страницу.");
    }
});


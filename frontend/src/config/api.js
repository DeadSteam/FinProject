// Конфигурация API
export const config = {
    API_VERSION: window.APP_CONFIG?.API_VERSION || 'v1'
};

// Универсальная функция для получения базового URL API
// Используется везде вместо хардкода адресов
export function getApiBaseUrl() {
    // Приоритет 1: Готовая конфигурация из window.APP_CONFIG
    if (window.APP_CONFIG?.API_BASE_URL) {
        return window.APP_CONFIG.API_BASE_URL;
    }
    
    // Приоритет 2: Автоматическое определение для dev окружения
    if (window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port)) {
        return `http://localhost:8000/api/${config.API_VERSION}`;
    }
    
    // Приоритет 3: Относительный путь для всех остальных случаев (prod, docker, nginx)
    return `/api/${config.API_VERSION}`;
}

// Экспортируем базовый URL для использования в других модулях
export const API_BASE_URL = getApiBaseUrl();

// Функция для получения WebSocket URL
export function getWebSocketUrl() {
    // Приоритет 1: Готовая конфигурация из window.APP_CONFIG
    if (window.APP_CONFIG?.WS_URL) {
        return window.APP_CONFIG.WS_URL;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Приоритет 2: Автоматическое определение для dev окружения
    if (window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port)) {
        return `${protocol}//${window.location.hostname}:8000/ws`;
    }
    
    // Приоритет 3: Тот же хост для всех остальных случаев
    return `${protocol}//${window.location.host}/ws`;
}

// Дополнительные константы для API
export const API_ENDPOINTS = {
    // Авторизация
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        REGISTER: '/auth/register',
        ME: '/auth/me'
    },
    
    // Пользователи
    USERS: {
        LIST: '/users',
        CREATE: '/users',
        UPDATE: (id) => `/users/${id}`,
        DELETE: (id) => `/users/${id}`,
        ME: '/users/me'
    },
    
    // Финансы
    FINANCE: {
        CATEGORIES: '/finance/categories',
        STORES: '/finance/stores',
        BUDGET: '/finance/budget',
        REPORTS: '/finance/reports',
        DETAILS: '/finance/details'
    },
    
    // Админ
    ADMIN: {
        DASHBOARD: '/admin/dashboard',
        METRICS: '/admin/metrics',
        USERS: '/admin/users',
        CATEGORIES: '/admin/categories',
        STORES: '/admin/stores'
    },
    
    // Аналитика
    ANALYTICS: {
        EVENTS: '/analytics',
        REPORTS: '/analytics/reports',
        DASHBOARD: '/analytics/dashboard'
    }
};

// Конфигурация для запросов
export const REQUEST_CONFIG = {
    TIMEOUT: window.APP_CONFIG?.TIMEOUT || 30000, // 30 секунд
    RETRY_ATTEMPTS: window.APP_CONFIG?.RETRY_ATTEMPTS || 3,
    RETRY_DELAY: window.APP_CONFIG?.RETRY_DELAY || 1000 // 1 секунда
}; 
// Updated: 2025-05-31 19:48 - NO PROCESS DEPENDENCY
export const config = {
    API_VERSION: 'v1'
};

// Автоматически определяем базовый URL в зависимости от среды
function getApiBaseUrl() {
    // Если запущено на localhost:3000 (разработка без Docker)
    if (window.location.hostname === 'localhost' && window.location.port === '3000') {
        return `http://localhost:8000/api/${config.API_VERSION}`;
    }
    
    // Для всех остальных случаев (включая Docker с nginx) используем относительный путь
    return `/api/${config.API_VERSION}`;
}

export const API_BASE_URL = getApiBaseUrl(); 
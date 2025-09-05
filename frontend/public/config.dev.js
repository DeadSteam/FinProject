// Frontend Development Configuration
window.APP_CONFIG = {
  // API Settings
  API_VERSION: 'v1',
  API_BASE_URL: '/api/v1', // Относительный путь для dev и продакшна
  
  // App Settings
  APP_NAME: 'PriFin',
  APP_ENV: 'development',
  
  // Features
  ENABLE_OFFLINE_MODE: true,
  ENABLE_ANALYTICS: false, // Отключаем в режиме разработки
  
  // Performance
  CACHE_TIMEOUT: 0, // Отключаем кэширование в режиме разработки
  
  // Services config
  SERVICES: {
    USERS: true,
    FINANCE: true,
    ANALYTICS: true
  },

  // Development options
  DEV: {
    SHOW_LOGS: true,
    MOCK_API: false // Установите true, если хотите использовать моки вместо реального API
  }
}; 
// Frontend Runtime Configuration
window.APP_CONFIG = {
  // API Settings
  API_VERSION: 'v1',
  API_BASE_URL: '/api/v1', // Относительный путь для продакшна с nginx
  
  // App Settings
  APP_NAME: 'PriFin',
  APP_ENV: 'production',
  
  // Features
  ENABLE_OFFLINE_MODE: true,
  ENABLE_ANALYTICS: true,
  
  // Performance
  CACHE_TIMEOUT: 3600, // 1 час в секундах
  
  // Services config
  SERVICES: {
    USERS: true,
    FINANCE: true,
    ANALYTICS: true
  }
};
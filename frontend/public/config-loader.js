// Dynamic configuration loader
(function() {
  // Универсальное определение dev окружения
  const isDevelopment = window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
  const configFile = isDevelopment ? '/config.dev.js' : '/config.js';
  
  const script = document.createElement('script');
  script.src = configFile;
  script.onload = function() {
    if (isDevelopment) {
      console.log('Configuration loaded:', configFile);
    }
  };
  script.onerror = function() {
    if (isDevelopment) {
      console.error('Failed to load configuration:', configFile);
    }
    // Fallback to default config
    window.APP_CONFIG = {
      API_VERSION: 'v1',
      API_BASE_URL: isDevelopment ? 'http://localhost:8000/api/v1' : '/api/v1',
      APP_NAME: 'PriFin',
      APP_ENV: isDevelopment ? 'development' : 'production',
      ENABLE_OFFLINE_MODE: true,
      ENABLE_ANALYTICS: !isDevelopment,
      CACHE_TIMEOUT: isDevelopment ? 0 : 300000,
      SERVICES: {
        USERS: true,
        FINANCE: true,
        ANALYTICS: true
      },
      DEV: {
        SHOW_LOGS: isDevelopment,
        MOCK_API: false
      }
    };
  };
  
  document.head.appendChild(script);
})(); 
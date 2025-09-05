/**
 * Скрипт для переключения на production конфигурацию
 * 
 * Запуск:
 * node switch-to-prod.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Переключение на production конфигурацию...');

const prodConfigPath = path.join(__dirname, 'public', 'config.js');
const originalConfigPath = path.join(__dirname, 'public', 'config.js.backup');

// Создаем backup оригинальной конфигурации, если его нет
if (!fs.existsSync(originalConfigPath)) {
  const currentConfig = fs.readFileSync(prodConfigPath, 'utf8');
  fs.writeFileSync(originalConfigPath, currentConfig, 'utf8');
  console.log('💾 Создан backup оригинальной конфигурации');
}

// Восстанавливаем production конфигурацию
try {
  const prodConfig = `// Frontend Runtime Configuration
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
};`;

  fs.writeFileSync(prodConfigPath, prodConfig, 'utf8');
  console.log('✅ Production конфигурация восстановлена');
  console.log('🚀 Теперь можно запускать docker compose up -d');
} catch (error) {
  console.error('❌ Ошибка при восстановлении production конфигурации:', error);
  process.exit(1);
} 
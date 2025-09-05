/**
 * Скрипт для запуска frontend в режиме разработки с hot reloading
 * 
 * Запуск:
 * node dev.js
 * 
 * Или через npm:
 * npm run dev:local
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Копируем config.dev.js в config.js в папке public
console.log('🔧 Подготовка dev-конфигурации...');
const devConfigPath = path.join(__dirname, 'public', 'config.dev.js');
const configPath = path.join(__dirname, 'public', 'config.js');

try {
  const devConfig = fs.readFileSync(devConfigPath, 'utf8');
  fs.writeFileSync(configPath, devConfig, 'utf8');
  console.log('✅ Dev-конфигурация успешно установлена');
} catch (error) {
  console.error('❌ Ошибка при копировании dev-конфигурации:', error);
  process.exit(1);
}

// Запускаем webpack dev server
console.log('🚀 Запуск webpack-dev-server...');
try {
  // Используем cross-env для установки переменных окружения
  execSync('npx cross-env NODE_ENV=development webpack serve --mode development --open', 
    { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Ошибка при запуске webpack-dev-server:', error);
  process.exit(1);
} 
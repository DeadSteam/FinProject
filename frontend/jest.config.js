module.exports = {
  // Тестовое окружение
  testEnvironment: 'jsdom',
  
  // Корневая директория для тестов
  rootDir: '.',
  
  // Паттерны для поиска тестовых файлов
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
  ],
  
  // Модули которые нужно трансформировать
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Настройка для модулей
  moduleNameMapper: {
    // CSS Modules
    '\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '\\.(css|sass|scss)$': 'identity-obj-proxy',
    
    // Алиасы из webpack config
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@contexts/(.*)$': '<rootDir>/src/context/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    
    // Изображения и файлы
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    '\\.(ttf|eot|woff|woff2)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
  
  // Файлы настройки для тестов
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  
  // Покрытие кода
  collectCoverage: false, // Включим позже
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/setupTests.js',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}',
    '!src/**/__mocks__/**',
    '!src/examples/**'
  ],
  
  // Пороги покрытия (пока отключены)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Директории которые Jest должен игнорировать
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Очистка моков между тестами
  clearMocks: true,
  
  // Восстановление моков между тестами
  restoreMocks: true,
  
  // Таймаут для тестов (5 секунд)
  testTimeout: 5000,
  
  // Максимальное количество воркеров
  maxWorkers: '50%',
  
  // Детализация вывода
  verbose: true
}; 
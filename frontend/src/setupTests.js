/**
 * Настройка Jest для тестирования React приложения
 * Этот файл выполняется автоматически перед каждым тестом
 */

// Расширяем возможности Jest для тестирования DOM
import '@testing-library/jest-dom';

// Мок для fetch API (вместо node-fetch)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Мок для localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Мок для sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Мок для window.location
delete window.location;
window.location = {
  href: 'http://localhost:3001',
  origin: 'http://localhost:3001',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Мок для window.matchMedia (для responsive тестов)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Мок для IntersectionObserver (для lazy loading тестов)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Мок для ResizeObserver (для responsive компонентов)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Мок для console методов в тестах (опционально)
// global.console = {
//   ...console,
//   // Отключаем console.log в тестах
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Настройка таймаутов для анимаций
jest.setTimeout(10000);

// Добавляем custom matchers для более удобного тестирования
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Глобальная очистка после каждого теста
afterEach(() => {
  // Очищаем все моки localStorage/sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Сбрасываем все моки
  jest.clearAllMocks();
});

// Настройка для тестирования Context API
export const createMockContext = (defaultValue) => {
  const context = {
    Provider: ({ children, value = defaultValue }) => children,
    Consumer: ({ children }) => children(defaultValue),
    defaultValue,
  };
  return context;
};

// Утилита для создания wrapper'а с провайдерами
export const createWrapper = (providers = []) => {
  return ({ children }) => {
    return providers.reduceRight(
      (acc, Provider) => <Provider>{acc}</Provider>,
      children
    );
  };
}; 
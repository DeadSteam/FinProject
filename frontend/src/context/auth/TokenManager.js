import { createContext, useContext } from 'react';

// Константы для хранения токенов
const STORAGE_KEYS = {
  TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'currentUser'
};

// Константы для действий
const TOKEN_ACTIONS = {
  SET_TOKENS: 'SET_TOKENS',
  CLEAR_TOKENS: 'CLEAR_TOKENS',
  UPDATE_TOKEN: 'UPDATE_TOKEN'
};

/**
 * PerformanceTracker - отдельный класс для отслеживания производительности (SRP)
 */
export class PerformanceTracker {
  constructor(componentName) {
    this.componentName = componentName;
    this.operations = {};
    this.totalCalls = 0;
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  measureOperation(operationName, fn) {
    if (!this.isEnabled) {
      return fn();
    }

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (!this.operations[operationName]) {
      this.operations[operationName] = {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      };
    }
    
    const op = this.operations[operationName];
    op.count++;
    op.totalDuration += duration;
    op.averageDuration = op.totalDuration / op.count;
    op.maxDuration = Math.max(op.maxDuration, duration);
    op.minDuration = Math.min(op.minDuration, duration);
    
    this.totalCalls++;
    
    // Логируем медленные операции
    if (duration > 10 && process.env.NODE_ENV === 'development') {
      console.warn(`🐌 Slow ${this.componentName} operation: ${operationName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  showStats() {
    if (!this.isEnabled || process.env.NODE_ENV !== 'development') return;
    
    console.group(`📊 ${this.componentName} Performance Stats`);
    console.log('Total operations:', this.totalCalls);
    
    Object.entries(this.operations).forEach(([name, stats]) => {
      console.log(`${name}:`, {
        calls: stats.count,
        avgDuration: `${stats.averageDuration.toFixed(2)}ms`,
        maxDuration: `${stats.maxDuration.toFixed(2)}ms`,
        minDuration: `${stats.minDuration.toFixed(2)}ms`
      });
    });
    
    console.groupEnd();
  }

  reset() {
    this.operations = {};
    this.totalCalls = 0;
  }
}

/**
 * Интерфейс для работы с хранилищем токенов (DIP - Dependency Inversion Principle)
 * Позволяет заменять реализацию хранилища без изменения логики
 */
export class ITokenStorage {
  setItem(key, value) {
    throw new Error('setItem method must be implemented');
  }
  
  getItem(key) {
    throw new Error('getItem method must be implemented');
  }
  
  removeItem(key) {
    throw new Error('removeItem method must be implemented');
  }
  
  clear() {
    throw new Error('clear method must be implemented');
  }
}

/**
 * Реализация хранилища на основе localStorage
 */
export class LocalStorageTokenStorage extends ITokenStorage {
  setItem(key, value) {
    localStorage.setItem(key, value);
  }
  
  getItem(key) {
    return localStorage.getItem(key);
  }
  
  removeItem(key) {
    localStorage.removeItem(key);
  }
  
  clear() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

/**
 * Реализация хранилища на основе sessionStorage (альтернатива)
 */
export class SessionStorageTokenStorage extends ITokenStorage {
  setItem(key, value) {
    sessionStorage.setItem(key, value);
  }
  
  getItem(key) {
    return sessionStorage.getItem(key);
  }
  
  removeItem(key) {
    sessionStorage.removeItem(key);
  }
  
  clear() {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  }
}

/**
 * Валидатор JWT токенов (SRP - единственная ответственность)
 */
export class TokenValidator {
  /**
   * Проверяет валидность JWT токена
   * @param {string} token - JWT токен для проверки
   * @returns {boolean} - true если токен валидный
   */
  static isValid(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      const payload = JSON.parse(atob(parts[1]));
      
      // Проверяем срок действия
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return false;
      }

      return true;
    } catch (error) {
      console.warn('TokenValidator: Ошибка валидации токена:', error);
      return false;
    }
  }

  /**
   * Извлекает payload из JWT токена
   * @param {string} token - JWT токен
   * @returns {object|null} - payload токена или null при ошибке
   */
  static getPayload(token) {
    if (!this.isValid(token)) {
      return null;
    }

    try {
      const parts = token.split('.');
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.warn('TokenValidator: Ошибка извлечения payload:', error);
      return null;
    }
  }

  /**
   * Проверяет, истекает ли токен в ближайшее время
   * @param {string} token - JWT токен
   * @param {number} minutesThreshold - порог в минутах (по умолчанию 5)
   * @returns {boolean} - true если токен скоро истечет
   */
  static isExpiringSoon(token, minutesThreshold = 5) {
    const payload = this.getPayload(token);
    if (!payload || !payload.exp) {
      return false;
    }

    const expirationTime = payload.exp * 1000;
    const now = Date.now();
    const timeToExpiration = expirationTime - now;
    const thresholdMs = minutesThreshold * 60 * 1000;

    return timeToExpiration <= thresholdMs;
  }

  /**
   * Возвращает время до истечения токена в миллисекундах
   * @param {string} token - JWT токен
   * @returns {number|null} - время в миллисекундах до истечения или null
   */
  static getTimeToExpiration(token) {
    const payload = this.getPayload(token);
    if (!payload || !payload.exp) {
      return null;
    }

    const expirationTime = payload.exp * 1000;
    const now = Date.now();
    
    return Math.max(0, expirationTime - now);
  }

  /**
   * Извлекает информацию о пользователе из токена
   * @param {string} token - JWT токен
   * @returns {object|null} - информация о пользователе или null
   */
  static getUserFromToken(token) {
    const payload = this.getPayload(token);
    if (!payload) {
      return null;
    }

    // Возвращаем стандартные поля пользователя из JWT
    return {
      id: payload.sub || payload.userId || payload.user_id,
      email: payload.email,
      firstName: payload.firstName || payload.first_name,
      lastName: payload.lastName || payload.last_name,
      role: payload.role || payload.userRole || 'user',
      permissions: payload.permissions || [],
      isAdmin: payload.isAdmin || payload.is_admin || false,
      exp: payload.exp,
      iat: payload.iat
    };
  }
}

/**
 * TokenManager - основной класс для управления токенами (SRP + DI + OCP)
 * 
 * Принципы SOLID:
 * - SRP: отвечает только за управление токенами
 * - OCP: расширяем через наследование и композицию
 * - LSP: наследники полностью заменяют базовый класс
 * - ISP: использует только нужные интерфейсы
 * - DIP: зависит от абстракций, а не от конкретных реализаций
 */
export class TokenManager {
  /**
   * @param {ITokenStorage} storage - хранилище токенов (DI)
   * @param {PerformanceTracker} performanceTracker - трекер производительности (опционально)
   */
  constructor(storage, performanceTracker = null) {
    if (!storage || typeof storage.setItem !== 'function') {
      throw new Error('TokenManager requires valid storage implementation');
    }
    
    this.storage = storage;
    this.performanceTracker = performanceTracker || new PerformanceTracker('TokenManager');
    this.observers = new Set(); // Для Observer pattern
    
    // Валидируем интерфейс хранилища
    this._validateStorageInterface(storage);
  }

  /**
   * Валидация интерфейса хранилища (Contract validation)
   */
  _validateStorageInterface(storage) {
    const requiredMethods = ['setItem', 'getItem', 'removeItem', 'clear'];
    const missingMethods = requiredMethods.filter(method => typeof storage[method] !== 'function');
    
    if (missingMethods.length > 0) {
      throw new Error(`Storage implementation missing methods: ${missingMethods.join(', ')}`);
    }
  }

  /**
   * Сохранение токенов в хранилище
   * @param {object} tokens - объект с токенами
   * @param {string} tokens.token - основной токен
   * @param {string} tokens.refreshToken - токен обновления
   */
  setTokens({ token, refreshToken }) {
    const operation = () => {
      if (!token) {
        throw new Error('Token is required');
      }

      // Валидируем токен перед сохранением
      if (!TokenValidator.isValid(token)) {
        throw new Error('Invalid token provided');
      }

      this.storage.setItem(STORAGE_KEYS.TOKEN, token);
      
      if (refreshToken) {
        this.storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      // Сохраняем информацию о пользователе из токена
      const userInfo = TokenValidator.getUserFromToken(token);
      if (userInfo) {
        this.storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userInfo));
      }

      // Уведомляем наблюдателей
      this._notifyTokenChange(TOKEN_ACTIONS.SET_TOKENS, { token, refreshToken, user: userInfo });
      
      return true;
    };

    return this.performanceTracker.measureOperation('setTokens', operation);
  }

  /**
   * Получение сохраненных токенов
   * @returns {object} - объект с токенами и информацией о пользователе
   */
  getStoredTokens() {
    const operation = () => {
      const token = this.storage.getItem(STORAGE_KEYS.TOKEN);
      const refreshToken = this.storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const userString = this.storage.getItem(STORAGE_KEYS.USER);
      
      let user = null;
      if (userString) {
        try {
          user = JSON.parse(userString);
        } catch (error) {
          console.warn('TokenManager: Ошибка парсинга пользователя из localStorage:', error);
          // Очищаем некорректные данные
          this.storage.removeItem(STORAGE_KEYS.USER);
        }
      }

      return {
        token: token || null,
        refreshToken: refreshToken || null,
        user
      };
    };

    return this.performanceTracker.measureOperation('getStoredTokens', operation);
  }

  /**
   * Очистка всех токенов
   * @returns {boolean} - результат операции
   */
  clearTokens() {
    const operation = () => {
      const currentTokens = this.getStoredTokens();
      
      this.storage.removeItem(STORAGE_KEYS.TOKEN);
      this.storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      this.storage.removeItem(STORAGE_KEYS.USER);
      
      // Уведомляем наблюдателей
      this._notifyTokenChange(TOKEN_ACTIONS.CLEAR_TOKENS, currentTokens);
      
      return true;
    };

    return this.performanceTracker.measureOperation('clearTokens', operation);
  }

  /**
   * Проверка валидности токена
   * @param {string} token - токен для проверки (опционально, если не передан - проверяется сохраненный)
   * @returns {boolean} - результат проверки
   */
  isValidToken(token) {
    const tokenToCheck = token || this.getStoredTokens().token;
    return this.performanceTracker.measureOperation('isValidToken', () => 
      TokenValidator.isValid(tokenToCheck)
    );
  }

  /**
   * Декодирование токена
   * @param {string} token - токен для декодирования (опционально)
   * @returns {object|null} - декодированный payload или null
   */
  decodeToken(token) {
    const tokenToDecode = token || this.getStoredTokens().token;
    return this.performanceTracker.measureOperation('decodeToken', () => 
      TokenValidator.getPayload(tokenToDecode)
    );
  }

  /**
   * Получение времени до истечения токена
   * @param {string} token - токен для проверки (опционально)
   * @returns {number|null} - время в миллисекундах до истечения
   */
  getTokenExpirationTime(token) {
    const tokenToCheck = token || this.getStoredTokens().token;
    return this.performanceTracker.measureOperation('getTokenExpirationTime', () => 
      TokenValidator.getTimeToExpiration(tokenToCheck)
    );
  }

  /**
   * Получение информации о пользователе из токена
   * @param {string} token - токен для извлечения (опционально)
   * @returns {object|null} - информация о пользователе
   */
  getUserFromToken(token) {
    const tokenToCheck = token || this.getStoredTokens().token;
    return this.performanceTracker.measureOperation('getUserFromToken', () => 
      TokenValidator.getUserFromToken(tokenToCheck)
    );
  }

  /**
   * Проверка необходимости обновления токена
   * @param {string} token - токен для проверки (опционально)
   * @param {number} minutesThreshold - порог в минутах (по умолчанию 5)
   * @returns {boolean} - нужно ли обновлять токен
   */
  shouldRefreshToken(token, minutesThreshold = 5) {
    const tokenToCheck = token || this.getStoredTokens().token;
    return this.performanceTracker.measureOperation('shouldRefreshToken', () => 
      TokenValidator.isExpiringSoon(tokenToCheck, minutesThreshold)
    );
  }

  /**
   * Получение всех данных из хранилища (для debug)
   * @returns {object} - все данные из хранилища
   */
  getAllStorageData() {
    const tokens = this.getStoredTokens();
    const stats = this.performanceTracker.operations;
    
    return {
      ...tokens,
      performanceStats: stats,
      storageType: this.storage.constructor.name,
      isTokenValid: this.isValidToken(),
      timeToExpiration: this.getTokenExpirationTime(),
      shouldRefresh: this.shouldRefreshToken()
    };
  }

  /**
   * Показать статистику производительности
   */
  showPerformanceStats() {
    this.performanceTracker.showStats();
  }

  /**
   * Полная очистка всех данных включая статистику
   */
  clearAllData() {
    this.clearTokens();
    this.performanceTracker.reset();
    this.observers.clear();
  }

  /**
   * Подписка на изменения токенов (Observer pattern)
   * @param {function} callback - функция обратного вызова
   * @returns {function} - функция для отписки
   */
  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Уведомление наблюдателей об изменениях (Observer pattern)
   * @param {string} action - тип действия
   * @param {object} data - данные изменения
   */
  _notifyTokenChange(action, data) {
    this.observers.forEach(callback => {
      try {
        callback({ action, data, timestamp: Date.now() });
      } catch (error) {
        console.error('TokenManager: Ошибка в observer callback:', error);
      }
    });
  }
}

/**
 * Factory функция для создания TokenManager с localStorage
 * @param {boolean} enablePerformanceTracking - включить отслеживание производительности
 * @returns {TokenManager} - экземпляр TokenManager
 */
export function createLocalStorageTokenManager(enablePerformanceTracking = false) {
  const storage = new LocalStorageTokenStorage();
  const performanceTracker = enablePerformanceTracking 
    ? new PerformanceTracker('TokenManager') 
    : null;
  
  return new TokenManager(storage, performanceTracker);
}

/**
 * Factory функция для создания TokenManager с sessionStorage
 * @param {boolean} enablePerformanceTracking - включить отслеживание производительности
 * @returns {TokenManager} - экземпляр TokenManager
 */
export function createSessionStorageTokenManager(enablePerformanceTracking = false) {
  const storage = new SessionStorageTokenStorage();
  const performanceTracker = enablePerformanceTracking 
    ? new PerformanceTracker('TokenManager') 
    : null;
  
  return new TokenManager(storage, performanceTracker);
}

// Создаем синглтон экземпляр для обратной совместимости
const tokenManager = createLocalStorageTokenManager(process.env.NODE_ENV === 'development');

// Хук для использования TokenManager
export function useTokenManager() {
  return tokenManager;
}

// Экспортируем TokenManager для использования в провайдерах
export default tokenManager; 
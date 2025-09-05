import React, { createContext, useContext, useCallback } from 'react';

import { useContextTracker, createContextProfiler, usePerformanceProfiler } from '../../utils/performance.js';

import { useAuthStateDispatch, AUTH_STATE_ACTIONS, useAuthState } from './AuthStateContext.js';
import '../interfaces/IAuthActionsContext.js';
import '../interfaces/IAuthStateContext.js';

/**
 * AuthActionsContext - отвечает ТОЛЬКО за действия авторизации (SRP)
 * 
 * Ответственности:
 * - Предоставление функций для входа/выхода
 * - Обновление состояния через AuthStateContext
 * - Валидация данных форм
 * - Обработка ошибок действий
 * 
 * Использует Dependency Inversion Principle (DIP):
 * - Зависит от абстракций (TokenManager, AuthService)
 * - Не зависит от конкретных реализаций
 */

// Создаем контекст для действий
/** @type {React.Context<IAuthActionsContext>} */
export const AuthActionsContext = createContext();

// Профайлер для Context (только в development)
const AuthActionsProfiler = createContextProfiler('AuthActionsContext');

/**
 * AuthActionsProvider - провайдер действий авторизации
 * Использует TokenManager и AuthService через DI принцип
 */
export function AuthActionsProvider({ children, tokenManager, authService }) {
  const dispatch = useAuthStateDispatch();
  const { startMeasurement, endMeasurement } = usePerformanceProfiler('AuthActions');

  /**
   * Авторизация пользователя
   * @param {string} identifier - email или телефон
   * @param {string} password - пароль
   * @returns {Promise<boolean>} - успех операции
   */
  const login = useCallback(async (identifier, password) => {
    startMeasurement();
    
    try {
      // Валидация входных данных
      if (!identifier || !password) {
        throw new Error('Заполните все поля');
      }

      dispatch({ 
        type: AUTH_STATE_ACTIONS.SET_LOADING, 
        payload: true 
      });

      // API вызов через сервис (используем правильный формат для backend)
      const response = await authService.login({ identifier, password });
      
      if (response.access_token) {
        // Сохранение токенов через TokenManager
        tokenManager.setTokens({
          token: response.access_token,
          refreshToken: response.refresh_token
        });

        // Получаем данные пользователя с помощью токена
        try {
          const userData = await authService.getCurrentUser();
          
          // Обновление состояния с данными пользователя
          dispatch({
            type: AUTH_STATE_ACTIONS.SET_AUTH_SUCCESS,
            payload: {
              user: userData,
              token: response.access_token,
              refreshToken: response.refresh_token
            }
          });

          endMeasurement();
          return true;
        } catch (userError) {
          // Если не удалось получить данные пользователя, очищаем токены
          if (process.env.NODE_ENV === 'development') {
            console.error('Ошибка получения данных пользователя:', userError);
          }
          tokenManager.clearTokens();
          
          dispatch({
            type: AUTH_STATE_ACTIONS.SET_AUTH_FAILURE,
            payload: { error: 'Не удалось получить данные пользователя' }
          });
          
          endMeasurement();
          return false;
        }
      } else {
        throw new Error('Не получены токены авторизации');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Ошибка входа:', error);
      }
      
      dispatch({
        type: AUTH_STATE_ACTIONS.SET_AUTH_FAILURE,
        payload: { error: error.message }
      });
      
      endMeasurement();
      return false;
    }
  }, [dispatch, tokenManager, authService, startMeasurement, endMeasurement]);

  /**
   * Выход из системы
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    startMeasurement();
    
    try {
      // Очистка токенов
      tokenManager.clearTokens();
      
      // API вызов для инвалидации токена на сервере
      try {
        await authService.logout();
      } catch (error) {
        // Игнорируем ошибки API при выходе
        if (process.env.NODE_ENV === 'development') {
          console.warn('Ошибка при выходе с сервера:', error);
        }
      }
      
      // Очистка состояния
      dispatch({ type: AUTH_STATE_ACTIONS.CLEAR_AUTH });
      
      endMeasurement();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Ошибка выхода:', error);
      }
      endMeasurement();
    }
  }, [dispatch, tokenManager, authService, startMeasurement, endMeasurement]);

  /**
   * Регистрация нового пользователя
   * @param {RegistrationData} userData - данные пользователя
   * @returns {Promise<boolean>} - успех операции
   */
  const register = useCallback(async (userData) => {
    startMeasurement();
    
    try {
      // Валидация данных
      const { email, password, firstName, lastName, phone } = userData;
      
      if (!email || !password || !firstName || !lastName) {
        throw new Error('Все обязательные поля должны быть заполнены');
      }

      dispatch({ 
        type: AUTH_STATE_ACTIONS.SET_LOADING, 
        payload: true 
      });

      // API вызов
      const response = await authService.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone
      });

      if (response.access_token) {
        // Сохранение токенов
        tokenManager.setTokens({
          token: response.access_token,
          refreshToken: response.refresh_token
        });

        // Получаем данные пользователя с помощью токена
        try {
          const userData = await authService.getCurrentUser();
          
          // Обновление состояния с данными пользователя
          dispatch({
            type: AUTH_STATE_ACTIONS.SET_AUTH_SUCCESS,
            payload: {
              user: userData,
              token: response.access_token,
              refreshToken: response.refresh_token
            }
          });

          endMeasurement();
          return true;
        } catch (userError) {
          // Если не удалось получить данные пользователя, очищаем токены
          console.error('Ошибка получения данных пользователя при регистрации:', userError);
          tokenManager.clearTokens();
          
          dispatch({
            type: AUTH_STATE_ACTIONS.SET_AUTH_FAILURE,
            payload: { error: 'Не удалось получить данные пользователя' }
          });
          
          endMeasurement();
          return false;
        }
      } else {
        throw new Error('Не получены токены регистрации');
      }
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      
      dispatch({
        type: AUTH_STATE_ACTIONS.SET_AUTH_FAILURE,
        payload: { error: error.message }
      });
      
      endMeasurement();
      return false;
    }
  }, [dispatch, tokenManager, authService, startMeasurement, endMeasurement]);

  /**
   * Восстановление пароля
   * @param {string} email - email для восстановления
   * @returns {Promise<boolean>} - успех операции
   */
  const resetPassword = useCallback(async (email) => {
    startMeasurement();
    
    try {
      if (!email) {
        throw new Error('Email обязателен');
      }

      await authService.resetPassword({ email });
      endMeasurement();
      return true;
    } catch (error) {
      console.error('Ошибка восстановления пароля:', error);
      endMeasurement();
      throw error;
    }
  }, [authService, startMeasurement, endMeasurement]);

  /**
   * Инициализация состояния из сохраненных токенов
   * @returns {Promise<void>}
   */
  const initializeAuth = useCallback(async () => {
    try {
      dispatch({ 
        type: AUTH_STATE_ACTIONS.SET_LOADING, 
        payload: true 
      });

      // Проверяем сохраненные токены
      const tokens = tokenManager.getStoredTokens();
      
      if (tokens.token && tokenManager.isValidToken(tokens.token)) {
        // Получаем данные пользователя по токену
        try {
          const userData = await authService.getCurrentUser();
          
          dispatch({
            type: AUTH_STATE_ACTIONS.SET_AUTH_SUCCESS,
            payload: {
              user: userData,
              token: tokens.token,
              refreshToken: tokens.refreshToken
            }
          });
        } catch (error) {
          console.warn('Токен недействителен, очищаем авторизацию:', error.message);
          // Токен недействителен, очищаем
          tokenManager.clearTokens();
          dispatch({ type: AUTH_STATE_ACTIONS.CLEAR_AUTH });
        }
      } else {
        // Нет действительных токенов
        dispatch({ type: AUTH_STATE_ACTIONS.CLEAR_AUTH });
      }
    } catch (error) {
      console.error('Ошибка инициализации auth:', error);
      dispatch({ type: AUTH_STATE_ACTIONS.CLEAR_AUTH });
    } finally {
      // ВСЕГДА завершаем загрузку, даже при ошибках
      dispatch({ 
        type: AUTH_STATE_ACTIONS.SET_LOADING, 
        payload: false 
      });
    }
  }, [dispatch, tokenManager, authService]);

  /**
   * Очистка ошибок
   */
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_STATE_ACTIONS.CLEAR_ERROR });
  }, [dispatch]);

  // Мемоизированное значение действий
  /** @type {IAuthActionsContext} */
  const value = React.useMemo(() => ({
    login,
    logout,
    register,
    resetPassword,
    initializeAuth,
    clearError,
  }), [login, logout, register, resetPassword, initializeAuth, clearError]);

  // Отслеживаем изменения Context в development
  useContextTracker('AuthActions', value);

  return (
    <AuthActionsProfiler>
      <AuthActionsContext.Provider value={value}>
        {children}
      </AuthActionsContext.Provider>
    </AuthActionsProfiler>
  );
}

/**
 * Хук для использования действий авторизации
 * @returns {IAuthActionsContext}
 */
export function useAuthActions() {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthActionsProvider');
  }
  return context;
}

/**
 * Комбинированный хук для управления сессией (вход/выход)
 * @returns {{
 *  login: (credentials: LoginCredentials) => Promise<boolean>,
 *  logout: () => Promise<void>,
 *  initializeAuth: () => Promise<void>
 * }}
 */
export function useAuthSession() {
  const { login, logout, initializeAuth } = useAuthActions();
  return { login, logout, initializeAuth };
}

/**
 * Хук для регистрации
 * @returns {{ register: (userData: RegistrationData) => Promise<boolean> }}
 */
export function useAuthRegistration() {
  const { register } = useAuthActions();
  return { register };
}

/**
 * Хук для восстановления пароля
 * @returns {{ resetPassword: (email: string) => Promise<boolean> }}
 */
export function usePasswordReset() {
  const { resetPassword } = useAuthActions();
  return { resetPassword };
}

/**
 * Хук для инициализации
 * @returns {{ initializeAuth: () => Promise<void> }}
 */
export function useAuthInitialization() {
  const { initializeAuth } = useAuthActions();
  return { initializeAuth };
}

/**
 * Хук для управления ошибками
 * @returns {{ clearError: () => void, error: Error|null }}
 */
export function useAuthErrorManagement() {
  const { clearError } = useAuthActions();
  const { error } = useAuthState();
  return { clearError, error };
} 








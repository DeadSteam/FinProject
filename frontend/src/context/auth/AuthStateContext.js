import React, { createContext, useContext, useReducer } from 'react';

import { useContextTracker, createContextProfiler } from '../../utils/performance.js';
import '../interfaces/IAuthStateContext.js';

/**
 * AuthStateContext - отвечает ТОЛЬКО за состояние авторизации (SRP)
 * 
 * Ответственности:
 * - Хранение состояния: user, tokens, isAuthenticated, isLoading, error
 * - Управление состоянием через reducer
 * - Предоставление типизированного интерфейса
 * 
 * @type {React.Context<IAuthStateContext>}
 * 
 * НЕ отвечает за:
 * - API вызовы
 * - localStorage операции
 * - JWT валидацию
 * - Бизнес-логику
 */

// Действия для reducer
export const AUTH_STATE_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_AUTH_SUCCESS: 'SET_AUTH_SUCCESS',
  SET_AUTH_FAILURE: 'SET_AUTH_FAILURE',
  CLEAR_AUTH: 'CLEAR_AUTH',
  SET_USER: 'SET_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Начальное состояние
const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

/**
 * Reducer для управления состоянием авторизации
 * Следует принципу чистых функций - только изменение состояния
 */
function authStateReducer(state, action) {
  switch (action.type) {
    case AUTH_STATE_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
      
    case AUTH_STATE_ACTIONS.SET_AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      
    case AUTH_STATE_ACTIONS.SET_AUTH_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };
      
    case AUTH_STATE_ACTIONS.CLEAR_AUTH:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
      
    case AUTH_STATE_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token || state.token,
        isAuthenticated: true,
        isLoading: false,
      };
      
    case AUTH_STATE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    case AUTH_STATE_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: action.payload.user,
      };
      
    default:
      return state;
  }
}

// Создаем контекст только для состояния
/** @type {React.Context<IAuthStateContext>} */
export const AuthStateContext = createContext();

// Профайлер для Context (только в development)
const AuthStateProfiler = createContextProfiler('AuthStateContext');

/**
 * AuthStateProvider - провайдер состояния авторизации
 * Предоставляет только состояние и dispatch для его изменения
 */
export function AuthStateProvider({ children }) {
  const [state, dispatch] = useReducer(authStateReducer, initialState);

  // Мемоизированное значение для предотвращения лишних ре-рендеров
  // Разделяем на отдельные объекты для более точной мемоизации
  /** @type {AuthState} */
  const stateValue = React.useMemo(() => ({
    user: state.user,
    token: state.token,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
  }), [
    state.user,
    state.token, 
    state.refreshToken,
    state.isAuthenticated,
    state.isLoading,
    state.error
  ]);

  // Dispatch мемоизирован отдельно (он никогда не меняется)
  const dispatchValue = React.useMemo(() => ({ dispatch }), [dispatch]);

  // Комбинированное значение
  /** @type {IAuthStateContext} */
  const value = React.useMemo(() => ({
    ...stateValue,
    ...dispatchValue,
  }), [stateValue, dispatchValue]);

  // Отслеживаем изменения Context в development
  useContextTracker('AuthState', value);

  return (
    <AuthStateProfiler>
      <AuthStateContext.Provider value={value}>
        {children}
      </AuthStateContext.Provider>
    </AuthStateProfiler>
  );
}

/**
 * Хук для использования состояния авторизации
 * Предоставляет типизированный доступ к состоянию
 * @returns {AuthState}
 */
export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within an AuthStateProvider');
  }
  
  // Возвращаем только состояние (без dispatch)
  const { dispatch, ...state } = context;
  return state;
}

/**
 * Хук для диспетчера состояния (для использования в AuthActions)
 * Отдельный хук для соблюдения принципа разделения ответственности
 * @returns {React.Dispatch<any>}
 */
export function useAuthStateDispatch() {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthStateDispatch must be used within an AuthStateProvider');
  }
  return context.dispatch;
}

/**
 * Селективные хуки для оптимизации производительности
 * Позволяют подписываться только на нужные части состояния
 */

// Хук только для пользователя
/** @returns {UserProfile|null} */
export function useAuthUser() {
  const { user } = useAuthState();
  return user;
}

// Хук только для статуса загрузки
/** @returns {boolean} */
export function useAuthLoading() {
  const { isLoading } = useAuthState();
  return isLoading;
}

// Хук только для статуса авторизации
/** @returns {{isAuthenticated: boolean, isLoading: boolean}} */
export function useAuthStatus() {
  const { isAuthenticated, isLoading } = useAuthState();
  return React.useMemo(() => ({ isAuthenticated, isLoading }), [isAuthenticated, isLoading]);
}

// Хук только для ошибок
/** @returns {Error|null} */
export function useAuthError() {
  const { error } = useAuthState();
  return error;
}

// Хук только для токенов
/** @returns {{token: string|null, refreshToken: string|null}} */
export function useAuthTokens() {
  const { token, refreshToken } = useAuthState();
  return React.useMemo(() => ({ token, refreshToken }), [token, refreshToken]);
} 
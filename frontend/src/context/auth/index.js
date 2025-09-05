/**
 * Композитный AuthContext - объединяет все части авторизации
 * Обеспечивает обратную совместимость с предыдущей версией
 * 
 * Архитектура следует принципам SOLID:
 * - SRP: каждый контекст отвечает за свою область
 * - DIP: зависимости инжектируются через провайдеры
 * - ISP: интерфейсы разделены по ответственности
 */

import React from 'react';


// Сервисы для Dependency Injection
import { AuthService } from '../../services/api/AuthService.js';
import { UserService } from '../../services/api/UserService.js';
import { ApiClient } from '../../services/http/ApiClient.js';

import { AuthActionsProvider, useAuthActions, useAuthSession, useAuthRegistration, usePasswordReset, useAuthInitialization, useAuthErrorManagement } from './AuthActionsContext.js';
import { AuthStateProvider, useAuthState, useAuthUser, useAuthLoading, useAuthStatus, useAuthError, useAuthTokens } from './AuthStateContext.js';
import tokenManager, { useTokenManager } from './TokenManager.js';
import { UserProfileProvider, useUserProfile, useProfileUpdate, usePasswordManagement, useAvatarManagement, useUserSettings, useAccountDeactivation, useRoleCheck } from './UserProfileContext.js';

/**
 * Комбинированный провайдер для всех Auth контекстов
 * Использует Dependency Injection для передачи сервисов
 */
export function AuthProvider({ children }) {
  // Создаем экземпляр API клиента и сервисов
  const apiClient = React.useMemo(() => new ApiClient(), []);
  const authService = React.useMemo(() => new AuthService(apiClient), [apiClient]);
  const userService = React.useMemo(() => new UserService(apiClient), [apiClient]);

  return (
    <AuthStateProvider>
      <AuthActionsProvider tokenManager={tokenManager} authService={authService}>
        <UserProfileProvider userService={userService}>
          {children}
        </UserProfileProvider>
      </AuthActionsProvider>
    </AuthStateProvider>
  );
}

/**
 * Композитный хук для обратной совместимости
 * Объединяет все функции из разных контекстов
 */
export function useAuth() {
  const state = useAuthState();
  const actions = useAuthActions();
  const profile = useUserProfile();

  // Мемоизируем комбинированный объект
  return React.useMemo(() => ({
    // Состояние (из AuthStateContext)
    ...state,
    
    // Действия авторизации (из AuthActionsContext)
    ...actions,
    
    // Управление профилем (из UserProfileContext)
    ...profile,
    
    // Дополнительные удобные свойства
    isLoggedIn: state.isAuthenticated,
    currentUser: state.user,
    hasError: Boolean(state.error),
  }), [state, actions, profile]);
}

/**
 * Хук для получения только состояния авторизации (оптимизированный)
 * Предотвращает ре-рендеры при изменении действий
 */
export function useAuthStateOnly() {
  return useAuthState();
}

/**
 * Хук для получения только действий авторизации (оптимизированный)
 * Предотвращает ре-рендеры при изменении состояния
 */
export function useAuthActionsOnly() {
  return useAuthActions();
}

/**
 * Хук для получения только функций профиля (оптимизированный)
 * Предотвращает ре-рендеры при изменении состояния авторизации
 */
export function useUserProfileOnly() {
  return useUserProfile();
}

// Re-export всех селективных хуков для удобства
export {
  // AuthState селективные хуки
  useAuthUser,
  useAuthLoading,
  useAuthStatus,
  useAuthError,
  useAuthTokens,
  
  // AuthActions селективные хуки
  useAuthSession,
  useAuthRegistration,
  usePasswordReset,
  useAuthInitialization,
  useAuthErrorManagement,
  
  // UserProfile селективные хуки
  useProfileUpdate,
  usePasswordManagement,
  useAvatarManagement,
  useUserSettings,
  useAccountDeactivation,
  useRoleCheck,
  
  // TokenManager хук
  useTokenManager,
};

// Re-export провайдеров для отдельного использования
export {
  AuthStateProvider,
  AuthActionsProvider,
  UserProfileProvider,
};

// Re-export TokenManager
export { default as tokenManager } from './TokenManager.js';

/**
 * Утилиты для тестирования и разработки
 */

/**
 * Хук для получения всех данных авторизации (для debug)
 * Использовать только в development режиме
 */
export function useAuthDebug() {
  const state = useAuthState();
  const actions = useAuthActions();
  const profile = useUserProfile();
  const tokenManagerData = tokenManager.getAllStorageData();

  if (process.env.NODE_ENV === 'development') {
    return {
      state,
      actions: Object.keys(actions),
      profile: Object.keys(profile),
      tokenManager: tokenManagerData,
      breakdown: {
        stateSize: JSON.stringify(state).length,
        actionsCount: Object.keys(actions).length,
        profileActionsCount: Object.keys(profile).length,
      }
    };
  }
  
  return null;
}

/**
 * Компонент для мониторинга производительности Auth Context'ов
 * Использовать только в development
 */
export function AuthPerformanceMonitor({ children }) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Показываем статистику каждые 30 секунд
      const interval = setInterval(() => {
        if (process.env.NODE_ENV === 'development') {
          console.group('🔍 Auth Context Performance Report');
          console.log('TokenManager stats:');
          tokenManager.showPerformanceStats();
          console.groupEnd();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, []);

  return children;
}

/**
 * HOC для автоматической инициализации авторизации
 * Автоматически вызывает initializeAuth при монтировании
 */
export function withAuthInitialization(WrappedComponent) {
  return function AuthInitializedComponent(props) {
    const { initializeAuth } = useAuthActions();
    
    React.useEffect(() => {
      initializeAuth();
    }, [initializeAuth]);

    return <WrappedComponent {...props} />;
  };
}

/**
 * Провайдер с автоматической инициализацией
 */
export function AuthProviderWithInit({ children }) {
  return (
    <AuthProvider>
      <AuthPerformanceMonitor>
        {withAuthInitialization(() => children)()}
      </AuthPerformanceMonitor>
    </AuthProvider>
  );
}
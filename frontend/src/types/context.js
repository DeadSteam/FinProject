import PropTypes from 'prop-types';

import { UserType, LoadingStateType, EventHandlerType, AppSettingsType } from './index.js';

// ============ AUTH CONTEXT ТИПЫ ============

/**
 * Состояние авторизации (только данные)
 */
export const AuthStateContextType = PropTypes.shape({
  // Состояние аутентификации
  isAuthenticated: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  
  // Данные пользователя
  user: UserType,
  
  // Токены
  token: PropTypes.string,
  refreshToken: PropTypes.string,
  expiresAt: PropTypes.string,
  
  // Права доступа
  permissions: PropTypes.arrayOf(PropTypes.string),
  roles: PropTypes.arrayOf(PropTypes.string),
});

/**
 * Действия авторизации (только функции)
 */
export const AuthActionsContextType = PropTypes.shape({
  // Основные действия
  login: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
  register: PropTypes.func.isRequired,
  
  // Управление токенами
  refreshToken: PropTypes.func.isRequired,
  validateToken: PropTypes.func.isRequired,
  
  // Восстановление пароля
  requestPasswordReset: PropTypes.func.isRequired,
  resetPassword: PropTypes.func.isRequired,
  
  // Проверка прав
  hasPermission: PropTypes.func.isRequired,
  hasRole: PropTypes.func.isRequired,
});

/**
 * Профиль пользователя (отдельный контекст)
 */
export const UserProfileContextType = PropTypes.shape({
  // Данные профиля
  profile: UserType,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  
  // Действия с профилем
  updateProfile: PropTypes.func.isRequired,
  uploadAvatar: PropTypes.func.isRequired,
  changePassword: PropTypes.func.isRequired,
  
  // Настройки
  settings: AppSettingsType,
  updateSettings: PropTypes.func.isRequired,
});

// ============ DATA CONTEXT ТИПЫ ============

/**
 * Кэш данных
 */
export const DataCacheContextType = PropTypes.shape({
  // Кэшированные данные
  cache: PropTypes.object.isRequired,
  
  // Методы кэширования
  get: PropTypes.func.isRequired,
  set: PropTypes.func.isRequired,
  invalidate: PropTypes.func.isRequired,
  clear: PropTypes.func.isRequired,
  
  // Настройки кэша
  ttl: PropTypes.number,
  maxSize: PropTypes.number,
});

/**
 * Синхронизация данных
 */
export const DataSyncContextType = PropTypes.shape({
  // Состояние синхронизации
  isSyncing: PropTypes.bool.isRequired,
  lastSyncAt: PropTypes.string,
  syncError: PropTypes.string,
  
  // Методы синхронизации
  sync: PropTypes.func.isRequired,
  forcSync: PropTypes.func.isRequired,
  
  // Конфликты
  conflicts: PropTypes.arrayOf(PropTypes.object),
  resolveConflict: PropTypes.func.isRequired,
});

// ============ UI CONTEXT ТИПЫ ============

/**
 * Состояние UI (модалки, сайдбар и т.д.)
 */
export const UIStateContextType = PropTypes.shape({
  // Модальные окна
  modals: PropTypes.object.isRequired,
  
  // Сайдбар
  sidebar: PropTypes.shape({
    isOpen: PropTypes.bool.isRequired,
    collapsed: PropTypes.bool.isRequired,
  }),
  
  // Загрузчики
  loadingStates: PropTypes.object.isRequired,
  
  // Тема
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
  
  // Действия
  openModal: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  setLoading: PropTypes.func.isRequired,
  setTheme: PropTypes.func.isRequired,
});

/**
 * Уведомления
 */
export const ToastContextType = PropTypes.shape({
  // Список уведомлений
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
      title: PropTypes.string,
      message: PropTypes.string.isRequired,
      duration: PropTypes.number,
      actions: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          action: PropTypes.func.isRequired,
        })
      ),
    })
  ).isRequired,
  
  // Методы управления
  addToast: PropTypes.func.isRequired,
  removeToast: PropTypes.func.isRequired,
  clearToasts: PropTypes.func.isRequired,
  
  // Удобные методы
  success: PropTypes.func.isRequired,
  error: PropTypes.func.isRequired,
  warning: PropTypes.func.isRequired,
  info: PropTypes.func.isRequired,
});

// ============ BUSINESS CONTEXT ТИПЫ ============

/**
 * Финансовый контекст
 */
export const FinanceContextType = PropTypes.shape({
  // Данные
  metrics: PropTypes.array.isRequired,
  categories: PropTypes.array.isRequired,
  shops: PropTypes.array.isRequired,
  
  // Состояние загрузки
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  
  // Действия
  loadData: PropTypes.func.isRequired,
  refreshData: PropTypes.func.isRequired,
  
  // Фильтры
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  
  // Выбранный период
  selectedPeriod: PropTypes.shape({
    year: PropTypes.number.isRequired,
    month: PropTypes.number,
  }),
  setSelectedPeriod: PropTypes.func.isRequired,
});

// ============ СОСТАВНЫЕ КОНТЕКСТЫ ============

/**
 * Полный контекст авторизации
 */
export const FullAuthContextType = PropTypes.shape({
  ...AuthStateContextType,
  ...AuthActionsContextType,
});

/**
 * Полный контекст данных
 */
export const FullDataContextType = PropTypes.shape({
  ...DataCacheContextType,
  ...DataSyncContextType,
});

/**
 * Полный UI контекст
 */
export const FullUIContextType = PropTypes.shape({
  ...UIStateContextType,
  ...ToastContextType,
});

// ============ ПРОВАЙДЕРЫ ============

/**
 * Пропсы для провайдера контекста
 */
export const ContextProviderPropsType = PropTypes.shape({
  children: PropTypes.node.isRequired,
  config: PropTypes.object,
  initialState: PropTypes.object,
  onError: EventHandlerType,
  enableDevtools: PropTypes.bool,
});

/**
 * Конфигурация контекста
 */
export const ContextConfigType = PropTypes.shape({
  // API настройки
  apiUrl: PropTypes.string.isRequired,
  timeout: PropTypes.number,
  retries: PropTypes.number,
  
  // Кэш настройки
  cacheEnabled: PropTypes.bool,
  cacheTtl: PropTypes.number,
  
  // Debug настройки
  debug: PropTypes.bool,
  logActions: PropTypes.bool,
  
  // UI настройки
  theme: PropTypes.oneOf(['light', 'dark']),
  locale: PropTypes.string,
});

// ============ ХУКИ ============

/**
 * Результат хука авторизации
 */
export const UseAuthResultType = PropTypes.shape({
  ...AuthStateContextType,
  ...AuthActionsContextType,
});

/**
 * Результат хука данных
 */
export const UseDataResultType = PropTypes.shape({
  ...DataCacheContextType,
  ...DataSyncContextType,
});

/**
 * Результат хука UI
 */
export const UseUIResultType = PropTypes.shape({
  ...UIStateContextType,
  ...ToastContextType,
});

// ============ ЭКСПОРТ ============

export default {
  // Auth контексты
  AuthStateContextType,
  AuthActionsContextType,
  UserProfileContextType,
  FullAuthContextType,
  
  // Data контексты
  DataCacheContextType,
  DataSyncContextType,
  FullDataContextType,
  
  // UI контексты
  UIStateContextType,
  ToastContextType,
  FullUIContextType,
  
  // Business контексты
  FinanceContextType,
  
  // Провайдеры
  ContextProviderPropsType,
  ContextConfigType,
  
  // Хуки
  UseAuthResultType,
  UseDataResultType,
  UseUIResultType,
}; 
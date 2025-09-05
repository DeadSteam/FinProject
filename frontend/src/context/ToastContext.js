import React, { createContext, useContext, useReducer, useState, useCallback, useMemo } from 'react';

import { useContextTracker, createContextProfiler } from '../utils/performance.js';
import { 
  createToastConfig, 
  generateToastId, 
  TOAST_TYPES 
} from '../components/toast';

// Типы действий для Toast
const TOAST_ACTIONS = {
  SHOW_TOAST: 'SHOW_TOAST',
  HIDE_TOAST: 'HIDE_TOAST',
  CLEAR_ALL_TOASTS: 'CLEAR_ALL_TOASTS',
};

// Начальное состояние
const initialState = {
  toasts: [], // Поддержка множественных тостов
};

// Редьюсер для управления тостами
const toastReducer = (state, action) => {
  switch (action.type) {
    case TOAST_ACTIONS.SHOW_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
      
    case TOAST_ACTIONS.HIDE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload),
      };
      
    case TOAST_ACTIONS.CLEAR_ALL_TOASTS:
      return {
        ...state,
        toasts: [],
      };
      
    default:
      return state;
  }
};

// Создаем контекст
const ToastContext = createContext();

// Профайлер для Context (только в development)
const ToastProfiler = createContextProfiler('ToastContext');

// Провайдер Toast контекста
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  // Добавление нового toast
  const addToast = useCallback((message, type = 'info', options = {}) => {
    const {
      duration = type === 'error' ? 5000 : 3000,
      persistent = false,
      action = null,
      position = 'top-right'
    } = options;

    const id = generateToastId();
    
    const newToast = {
      id,
      message,
      type,
      duration,
      persistent,
      action,
      position,
      timestamp: Date.now(),
      isVisible: true
    };

    setToasts(prev => [...prev, newToast]);

    // Автоматическое удаление (если не persistent)
    if (!persistent && duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  // Удаление toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Удаление всех toast
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Обновление toast
  const updateToast = useCallback((id, updates) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  // Группировка toast по позициям
  const toastsByPosition = useMemo(() => {
    return toasts.reduce((acc, toast) => {
      const position = toast.position || 'top-right';
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push(toast);
      return acc;
    }, {});
  }, [toasts]);

  const value = {
    // Состояние
    toasts,
    toastsByPosition,
    
    // Действия
    addToast,
    removeToast,
    clearToasts,
    updateToast,
    
    // Вспомогательные методы
    showToast: addToast, // Алиас для addToast
    success: (message, options) => addToast(message, TOAST_TYPES.SUCCESS, options),
    error: (message, options) => addToast(message, TOAST_TYPES.ERROR, options),
    warning: (message, options) => addToast(message, TOAST_TYPES.WARNING, options),
    info: (message, options) => addToast(message, TOAST_TYPES.INFO, options),
  };

  return (
    <ToastProfiler>
      <ToastContext.Provider value={value}>
        {children}
      </ToastContext.Provider>
    </ToastProfiler>
  );
};

// Основной хук для работы с Toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Хук только для состояния Toast
export const useToastState = () => {
  const { toasts, toastsByPosition } = useToast();
  return { toasts, toastsByPosition };
};

/**
 * Селективные хуки для оптимизации производительности
 */

// Хук только для действий с toast'ами
export const useToastActions = () => {
  const { addToast, removeToast, clearToasts, updateToast } = useToast();
  return { addToast, removeToast, clearToasts, updateToast };
};

// Хук для типизированных уведомлений
export const useToastNotifications = () => {
  const { success, error, warning, info } = useToast();
  return { success, error, warning, info };
};

// Хук для быстрых уведомлений об операциях
export const useOperationToasts = () => {
  const { success, error } = useToast();
  
  return {
    notifySuccess: (operation) => success(`${operation} выполнено успешно`),
    notifyError: (operation, errorMsg) => error(`Ошибка ${operation}: ${errorMsg}`),
    notifySaved: () => success('Данные сохранены'),
    notifyDeleted: () => success('Элемент удален'),
    notifyUpdated: () => success('Данные обновлены'),
    notifyCreated: () => success('Элемент создан'),
  };
};

export { ToastContext };

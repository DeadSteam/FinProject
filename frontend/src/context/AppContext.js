import React, { useContext } from 'react';

import { AuthProvider, useAuth } from './auth';
import { DataProvider, useData } from './DataContext';
import { ModalProvider, useModal } from './ModalContext';
import { ToastProvider, useToast } from './ToastContext';
import { UIProvider, useUI } from './UIContext';

// Композитный провайдер для всех контекстов
export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <ToastProvider>
          <ModalProvider>
            <DataProvider>
              {children}
            </DataProvider>
          </ModalProvider>
        </ToastProvider>
      </UIProvider>
    </AuthProvider>
  );
};

// Объединенный хук для доступа ко всем контекстам
export const useApp = () => {
  const auth = useAuth();
  const ui = useUI();
  const data = useData();
  const modal = useModal();
  const toastContext = useToast();

  return {
    auth,
    ui,
    data,
    modal,
    // Только необходимые функции из toast вместо всего объекта
    showToast: toastContext.showToast,
    success: toastContext.success,
    error: toastContext.error,
    warning: toastContext.warning,
    info: toastContext.info,
    clearToasts: toastContext.clearToasts
  };
};

// Экспортируем отдельные хуки для более точного контроля
export { useUI, useData, useAuth, useToast, useModal }; 
 
 
 
 
 
 
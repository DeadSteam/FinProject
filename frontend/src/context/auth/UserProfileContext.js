import React, { createContext, useContext, useCallback } from 'react';

import { API_BASE_URL } from '../../config/api.js';
import { useContextTracker, createContextProfiler, usePerformanceProfiler } from '../../utils/performance.js';

import { useAuthActions } from './AuthActionsContext.js';
import { useAuthState, useAuthStateDispatch, AUTH_STATE_ACTIONS } from './AuthStateContext.js';
import { tokenManager } from './TokenManager.js';


/**
 * UserProfileContext - отвечает ТОЛЬКО за управление профилем пользователя (SRP)
 * 
 * Ответственности:
 * - Обновление данных профиля
 * - Изменение пароля
 * - Управление настройками пользователя
 * - Загрузка аватара
 * 
 * Использует Dependency Inversion Principle (DIP):
 * - Зависит от абстракций (UserService, FileService)
 * - Не зависит от конкретных реализаций API
 */

// Создаем контекст для управления профилем
export const UserProfileContext = createContext();

// Профайлер для Context (только в development)
const UserProfileProfiler = createContextProfiler('UserProfileContext');

/**
 * UserProfileProvider - провайдер управления профилем пользователя
 * Использует UserService через DI принцип
 */
export function UserProfileProvider({ children, userService }) {
  const { user } = useAuthState();
  const dispatch = useAuthStateDispatch();
  const { updateUser } = useAuthActions();
  const { startMeasurement, endMeasurement } = usePerformanceProfiler('UserProfile');

  /**
   * Обновление профиля пользователя
   * @param {object} profileData - новые данные профиля
   * @returns {Promise<boolean>} - успех операции
   */
  const updateProfile = useCallback(async (profileData) => {
    startMeasurement();
    
    try {
      // Валидация данных
      const { firstName, lastName, email, phoneNumber } = profileData;
      
      if (!firstName || !lastName || !email) {
        throw new Error('Имя, фамилия и email обязательны');
      }

      // Валидация email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Неверный формат email');
      }

      // API вызов через сервис
      const response = await userService.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber
      });

      // Обновляем состояние пользователя
      dispatch({
        type: AUTH_STATE_ACTIONS.UPDATE_USER,
        payload: { user: response }
      });

      endMeasurement();
      return true;
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      endMeasurement();
      throw error;
    }
  }, [dispatch, userService, startMeasurement, endMeasurement]);

  /**
   * Изменение пароля
   * @param {object} passwordData - данные для изменения пароля
   * @returns {Promise<boolean>} - успех операции
   */
  const changePassword = useCallback(async (passwordData) => {
    startMeasurement();
    
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;
      
      // Валидация данных
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Все поля пароля обязательны');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Новые пароли не совпадают');
      }

      if (newPassword.length < 8) {
        throw new Error('Пароль должен содержать минимум 8 символов');
      }

      // API вызов
      await userService.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      endMeasurement();
      return true;
    } catch (error) {
      console.error('Ошибка изменения пароля:', error);
      endMeasurement();
      throw error;
    }
  }, [userService, startMeasurement, endMeasurement]);

  /**
   * Загрузка аватара пользователя
   * @param {File} avatarFile - файл аватара
   * @returns {Promise<string>} - URL загруженного аватара
   */
  const uploadAvatar = useCallback(async (avatarFile) => {
    startMeasurement();
    
    try {
      // Валидация файла
      if (!avatarFile) {
        throw new Error('Файл аватара обязателен');
      }

      // Проверка типа файла
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(avatarFile.type)) {
        throw new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)');
      }

      // Проверка размера файла (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (avatarFile.size > maxSize) {
        throw new Error('Размер файла не должен превышать 5MB');
      }

      // Создаем FormData для загрузки
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      // API вызов
      const response = await userService.uploadAvatar(formData);

      // Обновляем пользователя с новым аватаром
      dispatch({
        type: AUTH_STATE_ACTIONS.UPDATE_USER,
        payload: { 
          user: { 
            avatar_url: response.avatar_url 
          }
        }
      });

      endMeasurement();
      return response.avatar_url;
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      endMeasurement();
      throw error;
    }
  }, [dispatch, userService, startMeasurement, endMeasurement]);

  /**
   * Удаление аватара пользователя
   * @returns {Promise<boolean>} - успех операции
   */
  const removeAvatar = useCallback(async () => {
    startMeasurement();
    
    try {
      // API вызов
      await userService.removeAvatar();

      // Обновляем пользователя без аватара
      dispatch({
        type: AUTH_STATE_ACTIONS.UPDATE_USER,
        payload: { 
          user: { 
            avatar_url: null 
          }
        }
      });

      endMeasurement();
      return true;
    } catch (error) {
      console.error('Ошибка удаления аватара:', error);
      endMeasurement();
      throw error;
    }
  }, [dispatch, userService, startMeasurement, endMeasurement]);

  /**
   * Обновление настроек пользователя
   * @param {object} settings - объект с настройками
   * @returns {Promise<boolean>} - успех операции
   */
  const updateSettings = useCallback(async (settings) => {
    startMeasurement();
    
    try {
      // API вызов
      const response = await userService.updateSettings(settings);

      // Обновляем пользователя с новыми настройками
      dispatch({
        type: AUTH_STATE_ACTIONS.UPDATE_USER,
        payload: { 
          user: { 
            settings: response.settings 
          }
        }
      });

      endMeasurement();
      return true;
    } catch (error) {
      console.error('Ошибка обновления настроек:', error);
      endMeasurement();
      throw error;
    }
  }, [dispatch, userService, startMeasurement, endMeasurement]);

  /**
   * Получение полных данных профиля с сервера
   * @returns {Promise<object>} - данные профиля
   */
  const refreshProfile = useCallback(async () => {
    startMeasurement();
    
    try {
      // API вызов
      const userData = await userService.getCurrentUser();

      // Обновляем состояние полными данными
      dispatch({
        type: AUTH_STATE_ACTIONS.UPDATE_USER,
        payload: { user: userData }
      });

      endMeasurement();
      return userData;
    } catch (error) {
      console.error('Ошибка обновления данных профиля:', error);
      endMeasurement();
      throw error;
    }
  }, [dispatch, userService, startMeasurement, endMeasurement]);

  /**
   * Деактивация аккаунта пользователя
   * @param {string} reason - причина деактивации
   * @returns {Promise<boolean>} - успех операции
   */
  const deactivateAccount = useCallback(async (reason) => {
    startMeasurement();
    
    try {
      if (!reason) {
        throw new Error('Причина деактивации обязательна');
      }

      // API вызов
      await userService.deactivateAccount({ reason });

      // Очищаем состояние авторизации
      dispatch({ type: AUTH_STATE_ACTIONS.CLEAR_AUTH });

      endMeasurement();
      return true;
    } catch (error) {
      console.error('Ошибка деактивации аккаунта:', error);
      endMeasurement();
      throw error;
    }
  }, [dispatch, userService, startMeasurement, endMeasurement]);

  // Получаем состояние на верхнем уровне
  const state = useAuthState();

  /**
   * Проверка роли пользователя
   * @param {string} role - требуемая роль
   * @returns {boolean} - имеет ли пользователь роль
   */
  const hasRole = useCallback((role) => {
    if (!state.user) return false;
    
    // Проверяем роль пользователя
    const userRole = state.user.role?.name || state.user.role;
    
    // Админ имеет доступ ко всем ролям
    if (userRole === 'admin') return true;
    
    // Точное совпадение роли
    return userRole === role;
  }, [state.user]);

  // Мемоизированное значение действий
  const value = React.useMemo(() => ({
    updateProfile,
    changePassword,
    uploadAvatar,
    removeAvatar,
    updateSettings,
    refreshProfile,
    deactivateAccount,
    hasRole,
  }), [
    updateProfile,
    changePassword,
    uploadAvatar,
    removeAvatar,
    updateSettings,
    refreshProfile,
    deactivateAccount,
    hasRole,
  ]);

  // Отслеживаем изменения Context в development
  useContextTracker('UserProfile', value);

  return (
    <UserProfileProfiler>
      <UserProfileContext.Provider value={value}>
        {children}
      </UserProfileContext.Provider>
    </UserProfileProfiler>
  );
}

/**
 * Хук для использования функций управления профилем
 */
export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}

/**
 * Селективные хуки для оптимизации производительности
 * Позволяют подписываться только на нужные функции
 */

// Хук только для обновления основных данных профиля
export function useProfileUpdate() {
  const { updateProfile, refreshProfile } = useUserProfile();
  return React.useMemo(() => ({ updateProfile, refreshProfile }), [updateProfile, refreshProfile]);
}

// Хук только для работы с паролем
export function usePasswordManagement() {
  const { changePassword } = useUserProfile();
  return changePassword;
}

// Хук только для работы с аватаром
export function useAvatarManagement() {
  const { uploadAvatar, removeAvatar } = useUserProfile();
  return React.useMemo(() => ({ uploadAvatar, removeAvatar }), [uploadAvatar, removeAvatar]);
}

// Хук только для настроек
export function useUserSettings() {
  const { updateSettings } = useUserProfile();
  return updateSettings;
}

// Хук для деактивации аккаунта
export function useAccountDeactivation() {
  const { deactivateAccount } = useUserProfile();
  return deactivateAccount;
}

// Хук для проверки ролей
export function useRoleCheck() {
  const { hasRole } = useUserProfile();
  return hasRole;
} 
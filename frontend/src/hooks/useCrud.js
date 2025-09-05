import { useState, useCallback } from 'react';

import { useToast } from '../context/AppContext';

/**
 * Универсальный хук для CRUD операций
 * Заменяет повторяющуюся логику в AdminUsers, AdminCategories, AdminShops, AdminMetrics и др.
 * 
 * @param {Object} service - Сервис для работы с API (UserService, CategoryService и т.д.)
 * @param {string} entityName - Название сущности для сообщений ('пользователь', 'категория')
 * @param {Object} options - Дополнительные опции
 * @returns {Object} Объект с данными и методами CRUD
 */
export const useCrud = (service, entityName, options = {}) => {
  const { showToast } = useToast();
  
  // Состояние
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Опции по умолчанию
  const {
    loadOnMount = true,
    showSuccessMessages = true,
    showErrorMessages = true,
    confirmDelete = true
  } = options;

  /**
   * Загрузка списка элементов
   */
  const load = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await service.getAll(params);
      
      setItems(Array.isArray(result) ? result : []);
      
      return result;
    } catch (err) {
      const errorMessage = `Ошибка при загрузке ${entityName}ов: ${err.message}`;
      setError(errorMessage);
      
      if (showErrorMessages) {
        const timeoutId = setTimeout(() => showToast(errorMessage, 'error'), 0);
        // Cleanup при размонтировании компонента
        return () => clearTimeout(timeoutId);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, showToast, showErrorMessages]);

  /**
   * Создание нового элемента
   */
  const create = useCallback(async (data) => {
    try {
      setLoading(true);
      
      const result = await service.create(data);
      
      // Добавляем новый элемент в список
      setItems(prev => [...prev, result]);
      
      if (showSuccessMessages) {
        const timeoutId = setTimeout(() => showToast(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} успешно создан${entityName.endsWith('а') ? 'а' : ''}`, 'success'), 0);
        // Cleanup при размонтировании компонента
        return () => clearTimeout(timeoutId);
      }
      
      return result;
    } catch (err) {
      const errorMessage = `Ошибка при создании ${entityName}а: ${err.message}`;
      setError(errorMessage);
      
      if (showErrorMessages) {
        const timeoutId = setTimeout(() => showToast(errorMessage, 'error'), 0);
        // Cleanup при размонтировании компонента
        return () => clearTimeout(timeoutId);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, showToast, showSuccessMessages, showErrorMessages]);

  /**
   * Обновление существующего элемента
   */
  const update = useCallback(async (id, data) => {
    try {
      setLoading(true);
      
      const result = await service.update(id, data);
      
      // Обновляем элемент в списке
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...result } : item
      ));
      
      if (showSuccessMessages) {
        setTimeout(() => showToast(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} успешно обновлен${entityName.endsWith('а') ? 'а' : ''}`, 'success'), 0);
      }
      
      return result;
    } catch (err) {
      const errorMessage = `Ошибка при обновлении ${entityName}а: ${err.message}`;
      setError(errorMessage);
      
      if (showErrorMessages) {
        setTimeout(() => showToast(errorMessage, 'error'), 0);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, showToast, showSuccessMessages, showErrorMessages]);

  /**
   * Удаление элемента
   */
  const remove = useCallback(async (id, customConfirmMessage) => {
    const confirmMessage = customConfirmMessage || 
      `Вы уверены, что хотите удалить этот ${entityName}?`;
    
    if (confirmDelete && !window.confirm(confirmMessage)) {
      return false;
    }
    
    try {
      setLoading(true);
      
      await service.delete(id);
      
      // Удаляем элемент из списка
      setItems(prev => prev.filter(item => item.id !== id));
      
      if (showSuccessMessages) {
        setTimeout(() => showToast(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} успешно удален${entityName.endsWith('а') ? 'а' : ''}`, 'success'), 0);
      }
      
      return true;
    } catch (err) {
      const errorMessage = `Ошибка при удалении ${entityName}а: ${err.message}`;
      setError(errorMessage);
      
      if (showErrorMessages) {
        setTimeout(() => showToast(errorMessage, 'error'), 0);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, showToast, showSuccessMessages, showErrorMessages, confirmDelete]);

  /**
   * Получение элемента по ID
   */
  const getById = useCallback(async (id) => {
    try {
      setLoading(true);
      
      const result = await service.getById ? 
        service.getById(id) : 
        service.get(`/${id}`);
      
      return result;
    } catch (err) {
      const errorMessage = `Ошибка при получении ${entityName}а: ${err.message}`;
      setError(errorMessage);
      
      if (showErrorMessages) {
        setTimeout(() => showToast(errorMessage, 'error'), 0);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, showToast, showErrorMessages]);

  /**
   * Обновление локального состояния без API вызова
   */
  const updateLocal = useCallback((id, updates) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  /**
   * Очистка ошибок
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Обновление списка (перезагрузка)
   */
  const refresh = useCallback(async (params) => {
    return await load(params);
  }, [load]);

  return {
    // Данные
    items,
    loading,
    error,
    selectedItem,
    
    // Методы CRUD
    load,
    create,
    update,
    remove,
    getById,
    refresh,
    
    // Вспомогательные методы
    updateLocal,
    clearError,
    setSelectedItem,
    setItems
  };
};
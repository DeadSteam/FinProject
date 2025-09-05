import { TOAST_TYPES, TOAST_DURATIONS } from './ToastTypes';

/**
 * Создает объект конфигурации для toast уведомления
 * 
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления (success, error, warning, info)
 * @param {Object} options - Дополнительные параметры
 * @returns {Object} - Объект конфигурации toast
 */
export const createToastConfig = (message, type = TOAST_TYPES.INFO, options = {}) => {
  return {
    message,
    type,
    duration: options.duration || 
              (type === TOAST_TYPES.ERROR ? TOAST_DURATIONS.NORMAL : TOAST_DURATIONS.SHORT),
    position: options.position || 'top-right',
    persistent: options.persistent || false,
    action: options.action || null
  };
};

/**
 * Возвращает сгенерированный уникальный ID для toast
 * 
 * @returns {string} - Уникальный идентификатор
 */
export const generateToastId = () => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Возвращает стандартные сообщения для часто используемых операций
 */
export const standardMessages = {
  saved: 'Данные сохранены',
  deleted: 'Элемент удален',
  updated: 'Данные обновлены',
  created: 'Элемент создан',
  operationSuccess: (operation) => `${operation} выполнено успешно`,
  operationError: (operation, errorMsg) => `Ошибка ${operation}: ${errorMsg}`
}; 
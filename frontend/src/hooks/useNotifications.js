import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { useToast } from '../context/ToastContext.js';

/**
 * useNotifications - Универсальная система уведомлений
 * 
 * Поддерживает:
 * - Различные типы уведомлений (toast, popup, banner, badge)
 * - Приоритеты и группировка
 * - Автоудаление и персистентные уведомления
 * - Действия и кнопки в уведомлениях
 * - Push уведомления (если поддерживается)
 * - Очередь уведомлений
 * - Шаблоны и локализация
 * 
 * @param {Object} options - Конфигурация системы уведомлений
 * @returns {Object} - API для работы с уведомлениями
 */
export function useNotifications(options = {}) {
  const {
    // Глобальные настройки
    maxNotifications = 5,
    defaultDuration = 5000,
    position = 'top-right',
    enableSound = false,
    enablePush = false,
    
    // Шаблоны уведомлений
    templates = {},
    
    // Группировка
    enableGrouping = true,
    maxGroupSize = 3,
    
    // Персистентность
    persistInStorage = false,
    storageKey = 'app_notifications',
    
    // Callbacks
    onNotificationShow,
    onNotificationHide,
    onNotificationClick,
    onNotificationAction,
  } = options;

  const { showToast, removeToast: hideToast } = useToast();
  
  // Состояние уведомлений
  const [notifications, setNotifications] = useState([]);
  const [queue, setQueue] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  // Refs для управления
  const notificationIdCounter = useRef(0);
  const activeTimeouts = useRef(new Map());
  const audioRef = useRef(null);

  // Загрузка сохраненных уведомлений
  useEffect(() => {
    if (persistInStorage) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setNotifications(parsed.filter(n => n.persistent));
          setUnreadCount(parsed.filter(n => !n.read).length);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to load saved notifications:', error);
        }
      }
    }
  }, [persistInStorage, storageKey]);

  // Сохранение уведомлений
  useEffect(() => {
    if (persistInStorage) {
      const persistentNotifications = notifications.filter(n => n.persistent);
      localStorage.setItem(storageKey, JSON.stringify(persistentNotifications));
    }
  }, [notifications, persistInStorage, storageKey]);

  // Инициализация звука
  useEffect(() => {
    if (enableSound && !audioRef.current) {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.3;
    }
  }, [enableSound]);

  // Генерация ID для уведомлений
  const generateId = useCallback(() => {
    return `notification_${++notificationIdCounter.current}_${Date.now()}`;
  }, []);

  // Воспроизведение звука
  const playSound = useCallback((type = 'default') => {
    if (!enableSound || !audioRef.current) return;
    
    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Игнорируем ошибки воспроизведения
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to play notification sound:', error);
      }
    }
  }, [enableSound]);

  // Создание уведомления
  const createNotification = useCallback((config) => {
    const {
      type = 'info',
      title,
      message,
      duration = defaultDuration,
      persistent = false,
      priority = 'normal',
      group,
      icon,
      image,
      actions = [],
      data = {},
      template,
      onClick,
      onAction,
      showToastVariant = true,
    } = config;

    // Применяем шаблон если указан
    let finalConfig = { ...config };
    if (template && templates[template]) {
      finalConfig = { ...templates[template], ...config };
    }

    const notification = {
      id: generateId(),
      type: finalConfig.type || type,
      title: finalConfig.title || title,
      message: finalConfig.message || message,
      duration: persistent ? null : (finalConfig.duration || duration),
      persistent: finalConfig.persistent || persistent,
      priority: finalConfig.priority || priority,
      group: finalConfig.group || group,
      icon: finalConfig.icon || icon,
      image: finalConfig.image || image,
      actions: finalConfig.actions || actions,
      data: finalConfig.data || data,
      timestamp: Date.now(),
      read: false,
      onClick: finalConfig.onClick || onClick,
      onAction: finalConfig.onAction || onAction,
      showToastVariant: finalConfig.showToastVariant !== false,
    };

    return notification;
  }, [generateId, defaultDuration, templates]);

  // Добавление уведомления
  const addNotification = useCallback((config) => {
    const notification = createNotification(config);
    
    setNotifications(prev => {
      // Проверяем лимит уведомлений
      if (prev.length >= maxNotifications) {
        // Удаляем самое старое неперсистентное уведомление
        const nonPersistent = prev.filter(n => !n.persistent);
        if (nonPersistent.length > 0) {
          const oldest = nonPersistent[0];
          clearTimeout(activeTimeouts.current.get(oldest.id));
          activeTimeouts.current.delete(oldest.id);
        }
      }

      // Группировка уведомлений
      if (enableGrouping && notification.group) {
        const grouped = prev.filter(n => n.group === notification.group);
        if (grouped.length >= maxGroupSize) {
          // Заменяем группу сводным уведомлением
          const summary = {
            ...notification,
            id: generateId(),
            title: `${notification.title} и еще ${grouped.length}`,
            message: `${grouped.length + 1} уведомлений в группе "${notification.group}"`,
            isGroupSummary: true,
            groupCount: grouped.length + 1,
          };
          
          // Удаляем старые уведомления группы
          grouped.forEach(n => {
            clearTimeout(activeTimeouts.current.get(n.id));
            activeTimeouts.current.delete(n.id);
          });
          
          const withoutGroup = prev.filter(n => n.group !== notification.group);
          return [...withoutGroup, summary].slice(-maxNotifications);
        }
      }

      return [...prev, notification].slice(-maxNotifications);
    });

    // Увеличиваем счетчик непрочитанных
    setUnreadCount(prev => prev + 1);

    // Показываем toast если требуется
    if (notification.showToastVariant) {
      // Было:
      // showToast({
      //   type: notification.type,
      //   title: notification.title,
      //   message: notification.message,
      //   duration: notification.duration,
      // });
      // Стало:
      showToast(
        notification.title && notification.message
          ? `${notification.title}: ${notification.message}`
          : notification.message || notification.title,
        notification.type
      );
    }

    // Воспроизводим звук
    playSound(notification.type);

    // Автоудаление
    if (notification.duration && !notification.persistent) {
      const timeoutId = setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);
      
      activeTimeouts.current.set(notification.id, timeoutId);
    }

    // Callback
    onNotificationShow?.(notification);

    // Push уведомление
    if (enablePush && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const pushNotification = new Notification(notification.title, {
          body: notification.message,
          icon: notification.icon,
          image: notification.image,
          data: notification.data,
          tag: notification.group || notification.id,
        });

        pushNotification.onclick = () => {
          window.focus();
          notification.onClick?.(notification);
          onNotificationClick?.(notification);
          pushNotification.close();
        };
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to show push notification:', error);
        }
      }
    }

    return notification;
  }, [
    createNotification,
    maxNotifications,
    enableGrouping,
    maxGroupSize,
    generateId,
    showToast,
    playSound,
    onNotificationShow,
    enablePush,
    onNotificationClick
  ]);

  // Удаление уведомления
  const removeNotification = useCallback((id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification) {
        clearTimeout(activeTimeouts.current.get(id));
        activeTimeouts.current.delete(id);
        onNotificationHide?.(notification);
        hideToast(id);
      }
      return prev.filter(n => n.id !== id);
    });
  }, [onNotificationHide, hideToast]);

  // Отметка как прочитанное
  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Отметить все как прочитанные
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Очистка всех уведомлений
  const clearAll = useCallback((onlyRead = false) => {
    setNotifications(prev => {
      const toRemove = onlyRead ? prev.filter(n => n.read) : prev.filter(n => !n.persistent);
      
      toRemove.forEach(notification => {
        clearTimeout(activeTimeouts.current.get(notification.id));
        activeTimeouts.current.delete(notification.id);
        onNotificationHide?.(notification);
      });
      
      return onlyRead ? prev.filter(n => !n.read) : prev.filter(n => n.persistent);
    });
    
    if (!onlyRead) {
      setUnreadCount(0);
    }
  }, [onNotificationHide]);

  // Обработка клика по уведомлению
  const handleNotificationClick = useCallback((notification) => {
    markAsRead(notification.id);
    notification.onClick?.(notification);
    onNotificationClick?.(notification);
  }, [markAsRead, onNotificationClick]);

  // Обработка действий в уведомлении
  const handleNotificationAction = useCallback((notification, action) => {
    markAsRead(notification.id);
    
    if (action.onClick) {
      action.onClick(notification, action);
    }
    
    notification.onAction?.(notification, action);
    onNotificationAction?.(notification, action);
    
    if (action.autoClose !== false) {
      removeNotification(notification.id);
    }
  }, [markAsRead, removeNotification, onNotificationAction]);

  // Запрос разрешения на push уведомления
  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to request push permission:', error);
      }
      return 'denied';
    }
  }, []);

  // Удобные методы для разных типов уведомлений
  const showSuccess = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((title, message, options = {}) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  // Фильтрованные уведомления
  const filteredNotifications = useMemo(() => {
    return {
      all: notifications,
      unread: notifications.filter(n => !n.read),
      read: notifications.filter(n => n.read),
      persistent: notifications.filter(n => n.persistent),
      byType: (type) => notifications.filter(n => n.type === type),
      byGroup: (group) => notifications.filter(n => n.group === group),
      byPriority: (priority) => notifications.filter(n => n.priority === priority),
    };
  }, [notifications]);

  // Статистика
  const stats = useMemo(() => {
    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
    
    const byPriority = notifications.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {});

    return {
      total: notifications.length,
      unread: unreadCount,
      read: notifications.length - unreadCount,
      persistent: notifications.filter(n => n.persistent).length,
      byType,
      byPriority,
    };
  }, [notifications, unreadCount]);

  return {
    // Основные данные
    notifications: filteredNotifications,
    queue,
    unreadCount,
    isVisible,
    stats,
    
    // Основные методы
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    
    // Обработчики событий
    handleNotificationClick,
    handleNotificationAction,
    
    // Удобные методы
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Push уведомления
    requestPushPermission,
    
    // Управление видимостью
    show: () => setIsVisible(true),
    hide: () => setIsVisible(false),
    toggle: () => setIsVisible(prev => !prev),
    
    // Утилиты
    hasUnread: unreadCount > 0,
    isEmpty: notifications.length === 0,
    isFull: notifications.length >= maxNotifications,
    
    // Конфигурация
    config: {
      maxNotifications,
      defaultDuration,
      position,
      enableSound,
      enablePush,
      enableGrouping,
      maxGroupSize,
    },
  };
}

/**
 * useNotificationQueue - Хук для управления очередью уведомлений
 * 
 * @param {Object} options - Опции очереди
 * @returns {Object} - API очереди
 */
export function useNotificationQueue(options = {}) {
  const {
    maxSize = 10,
    processDelay = 1000,
    autoProcess = true,
  } = options;
  
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef(null);
  
  const { addNotification } = useNotifications();
  
  const addToQueue = useCallback((notification) => {
    setQueue(prev => [...prev, notification].slice(-maxSize));
  }, [maxSize]);
  
  const processQueue = useCallback(async () => {
    if (isProcessing || queue.length === 0) return;
    
    setIsProcessing(true);
    
    const [first, ...rest] = queue;
    setQueue(rest);
    
    addNotification(first);
    
    if (rest.length > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsProcessing(false);
        if (autoProcess) {
          processQueue();
        }
      }, processDelay);
    } else {
      setIsProcessing(false);
    }
  }, [queue, isProcessing, addNotification, processDelay, autoProcess]);
  
  useEffect(() => {
    if (autoProcess && queue.length > 0 && !isProcessing) {
      processQueue();
    }
  }, [queue, isProcessing, autoProcess, processQueue]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    queue,
    addToQueue,
    processQueue,
    isProcessing,
    size: queue.length,
    clear: () => setQueue([]),
  };
}

/**
 * useNotificationTemplates - Хук для управления шаблонами уведомлений
 * 
 * @param {Object} initialTemplates - Начальные шаблоны
 * @returns {Object} - API шаблонов
 */
export function useNotificationTemplates(initialTemplates = {}) {
  const [templates, setTemplates] = useState({
    // Базовые шаблоны
    system: {
      type: 'info',
      duration: 5000,
      icon: '⚙️',
      group: 'system',
    },
    
    error: {
      type: 'error',
      persistent: true,
      icon: '❌',
      priority: 'high',
    },
    
    success: {
      type: 'success',
      duration: 3000,
      icon: '✅',
    },
    
    warning: {
      type: 'warning',
      duration: 4000,
      icon: '⚠️',
    },
    
    // Пользовательские шаблоны
    ...initialTemplates,
  });
  
  const addTemplate = useCallback((name, template) => {
    setTemplates(prev => ({ ...prev, [name]: template }));
  }, []);
  
  const removeTemplate = useCallback((name) => {
    setTemplates(prev => {
      const { [name]: removed, ...rest } = prev;
      return rest;
    });
  }, []);
  
  const getTemplate = useCallback((name) => {
    return templates[name];
  }, [templates]);
  
  return {
    templates,
    addTemplate,
    removeTemplate,
    getTemplate,
    hasTemplate: (name) => name in templates,
  };
} 
 
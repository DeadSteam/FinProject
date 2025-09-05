import { useCallback, useRef, useEffect, useState, useMemo } from 'react';

import { API_BASE_URL, API_ENDPOINTS } from '../config/api.js';
import { useAuthUser } from '../context/auth/index.js';

/**
 * useAnalytics - Универсальная система аналитики
 * 
 * Поддерживает:
 * - Трекинг событий и действий пользователя
 * - Метрики производительности
 * - Сессионная аналитика
 * - A/B тестирование
 * - Цели и конверсии
 * - Отправка данных в различные системы
 * - Буферизация и батчи
 * - Соблюдение GDPR/приватности
 * 
 * @param {Object} options - Конфигурация аналитики
 * @returns {Object} - API для аналитики
 */
export function useAnalytics(options = {}) {
  const {
    // Конфигурация
    enabled = true,
    debug = process.env.NODE_ENV === 'development',
    apiEndpoint = `${API_BASE_URL}${API_ENDPOINTS.ANALYTICS.EVENTS}`,
    
    // Батчинг
    batchSize = 10,
    flushInterval = 5000, // 5 секунд
    
    // Пользовательские настройки
    respectPrivacy = true,
    anonymizeData = false,
    
    // Провайдеры аналитики
    providers = [],
    
    // Сессия
    sessionTimeout = 30 * 60 * 1000, // 30 минут
    
    // Callbacks
    onEventSent,
    onError,
    onBatchSent,
  } = options;

  const user = useAuthUser();
  
  // Состояние
  const [events, setEvents] = useState([]);
  const [session, setSession] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [metrics, setMetrics] = useState({});
  
  // Refs
  const eventQueue = useRef([]);
  const flushTimeoutRef = useRef(null);
  const sessionTimeoutRef = useRef(null);
  const performanceMarks = useRef(new Map());
  const pageStartTime = useRef(Date.now());
  
  // Инициализация сессии
  useEffect(() => {
    if (enabled) {
      initializeSession();
      setupEventListeners();
    }
    
    return () => {
      flushEvents();
      clearTimeout(flushTimeoutRef.current);
      clearTimeout(sessionTimeoutRef.current);
    };
  }, [enabled]);

  // Отслеживание онлайн статуса
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Автоматическая отправка при восстановлении соединения
  useEffect(() => {
    if (isOnline && eventQueue.current.length > 0) {
      flushEvents();
    }
  }, [isOnline]);

  // Инициализация сессии
  const initializeSession = useCallback(() => {
    const sessionId = generateSessionId();
    const sessionData = {
      id: sessionId,
      userId: user?.id || null,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 1,
      events: 0,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      referrer: document.referrer,
      url: window.location.href,
    };
    
    setSession(sessionData);
    trackEvent('session_start', sessionData);
    
    // Автоматическое завершение сессии
    resetSessionTimeout();
  }, [user]);

  // Сброс таймаута сессии
  const resetSessionTimeout = useCallback(() => {
    clearTimeout(sessionTimeoutRef.current);
    
    sessionTimeoutRef.current = setTimeout(() => {
      endSession();
    }, sessionTimeout);
  }, [sessionTimeout]);

  // Завершение сессии
  const endSession = useCallback(() => {
    if (!session) return;
    
    const duration = Date.now() - session.startTime;
    
    trackEvent('session_end', {
      sessionId: session.id,
      duration,
      pageViews: session.pageViews,
      events: session.events,
    });
    
    setSession(null);
    flushEvents();
  }, [session]);

  // Генерация ID сессии
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Настройка слушателей событий
  const setupEventListeners = useCallback(() => {
    // Активность пользователя
    const activityEvents = ['click', 'keydown', 'scroll', 'mousemove'];
    
    const handleActivity = () => {
      if (session) {
        setSession(prev => ({
          ...prev,
          lastActivity: Date.now(),
        }));
        resetSessionTimeout();
      }
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Смена страницы
    const handlePageChange = () => {
      trackPageView();
    };
    
    window.addEventListener('popstate', handlePageChange);
    
    // Закрытие страницы
    const handleBeforeUnload = () => {
      endSession();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Ошибки JavaScript
    const handleError = (event) => {
      trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    };
    
    window.addEventListener('error', handleError);
    
    // Необработанные Promise rejections
    const handleUnhandledRejection = (event) => {
      trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
      });
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Очистка
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('popstate', handlePageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [session, resetSessionTimeout, endSession]);

  // Основная функция трекинга событий
  const trackEvent = useCallback((eventName, eventData = {}, options = {}) => {
    if (!enabled) return;
    
    const {
      immediate = false,
      category = 'user_action',
      priority = 'normal',
      tags = [],
    } = options;

    const event = {
      id: generateEventId(),
      name: eventName,
      category,
      priority,
      tags,
      data: anonymizeData ? anonymizeEventData(eventData) : eventData,
      timestamp: Date.now(),
      sessionId: session?.id,
      userId: user?.id,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    if (debug) {
      console.log('Analytics Event:', event);
    }

    // Добавляем в очередь
    eventQueue.current.push(event);
    setEvents(prev => [...prev, event]);
    
    // Обновляем счетчик событий в сессии
    if (session) {
      setSession(prev => ({
        ...prev,
        events: prev.events + 1,
      }));
    }

    // Немедленная отправка или батчинг
    if (immediate || eventQueue.current.length >= batchSize) {
      flushEvents();
    } else {
      scheduleFlush();
    }

    return event;
  }, [enabled, anonymizeData, session, user, debug, batchSize]);

  // Планирование отправки батча
  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) return;
    
    flushTimeoutRef.current = setTimeout(() => {
      flushEvents();
    }, flushInterval);
  }, [flushInterval]);

  // Отправка батча событий
  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0 || !isOnline) return;
    
    const batch = [...eventQueue.current];
    eventQueue.current = [];
    
    clearTimeout(flushTimeoutRef.current);
    flushTimeoutRef.current = null;
    
    try {
      // Отправка в API (с graceful degradation)
      if (apiEndpoint) {
        await sendToApi(batch);
      }
      
      // Отправка в провайдеры
      await sendToProviders(batch);
      
      onBatchSent?.(batch);
      
      if (debug) {
        console.log('Analytics batch sent:', batch.length, 'events');
      }
    } catch (error) {
      // Провайдеры могут вызывать ошибки, обрабатываем gracefully
      onError?.(error);
      
      if (debug) {
        console.warn('Analytics provider error (API handled gracefully):', error);
      }
      // Не возвращаем события в очередь, так как API уже обработан gracefully
    }
  }, [isOnline, apiEndpoint, providers, onBatchSent, onError, debug]);

  // Отправка в API
  const sendToApi = useCallback(async (events) => {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { 'Authorization': `Bearer ${user.token}` }),
        },
        body: JSON.stringify({ events }),
      });
      
      if (!response.ok) {
        // В режиме разработки логируем, но не бросаем ошибку
        if (debug && process.env.NODE_ENV === 'development') {
          console.warn(`Analytics API not available (${response.status}). Events logged locally only.`);
        }
        return; // Graceful degradation
      }
    } catch (error) {
      // В режиме разработки логируем, но не бросаем ошибку  
      if (debug && process.env.NODE_ENV === 'development') {
        console.warn('Analytics API unavailable. Events logged locally only:', error.message);
      }
      // В продакшне - тихо игнорируем
      return;
    }
  }, [apiEndpoint, user, debug]);

  // Отправка в провайдеры
  const sendToProviders = useCallback(async (events) => {
    const promises = providers.map(async (provider) => {
      try {
        if (provider.sendEvents) {
          await provider.sendEvents(events);
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} error:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }, [providers]);

  // Генерация ID события
  const generateEventId = useCallback(() => {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Анонимизация данных
  const anonymizeEventData = useCallback((data) => {
    // Простая анонимизация - удаляем PII
    const sensitiveFields = ['email', 'phone', 'address', 'name', 'ip'];
    const cleaned = { ...data };
    
    sensitiveFields.forEach(field => {
      if (cleaned[field]) {
        delete cleaned[field];
      }
    });
    
    return cleaned;
  }, []);

  // Трекинг просмотра страницы
  const trackPageView = useCallback((page = window.location.pathname) => {
    const pageViewData = {
      page,
      title: document.title,
      referrer: document.referrer,
      loadTime: Date.now() - pageStartTime.current,
    };
    
    if (session) {
      setSession(prev => ({
        ...prev,
        pageViews: prev.pageViews + 1,
      }));
    }
    
    trackEvent('page_view', pageViewData, { category: 'navigation' });
  }, [session, trackEvent]);

  // Трекинг кликов
  const trackClick = useCallback((element, data = {}) => {
    const clickData = {
      element: element.tagName,
      text: element.textContent?.slice(0, 100),
      id: element.id,
      className: element.className,
      href: element.href,
      ...data,
    };
    
    trackEvent('click', clickData, { category: 'interaction' });
  }, [trackEvent]);

  // Трекинг форм
  const trackFormSubmit = useCallback((formName, data = {}) => {
    trackEvent('form_submit', { formName, ...data }, { category: 'conversion' });
  }, [trackEvent]);

  const trackFormError = useCallback((formName, errors = {}) => {
    trackEvent('form_error', { formName, errors }, { category: 'error' });
  }, [trackEvent]);

  // Трекинг поиска
  const trackSearch = useCallback((query, filters = {}, results = 0) => {
    trackEvent('search', { query, filters, results }, { category: 'engagement' });
  }, [trackEvent]);

  // Трекинг покупок/конверсий
  const trackPurchase = useCallback((transactionData) => {
    trackEvent('purchase', transactionData, { 
      category: 'conversion',
      immediate: true,
      priority: 'high',
    });
  }, [trackEvent]);

  // Трекинг производительности
  const startTiming = useCallback((name) => {
    performanceMarks.current.set(name, performance.now());
  }, []);

  const endTiming = useCallback((name) => {
    const startTime = performanceMarks.current.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      performanceMarks.current.delete(name);
      
      trackEvent('performance_timing', { 
        name, 
        duration,
        startTime,
      }, { category: 'performance' });
      
      return duration;
    }
    return null;
  }, [trackEvent]);

  // Трекинг ошибок
  const trackError = useCallback((error, context = {}) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
    };
    
    trackEvent('error', errorData, { 
      category: 'error',
      immediate: true,
      priority: 'high',
    });
  }, [trackEvent]);

  // A/B тестирование
  const trackExperiment = useCallback((experimentName, variant, data = {}) => {
    trackEvent('experiment_view', {
      experiment: experimentName,
      variant,
      ...data,
    }, { category: 'experiment' });
  }, [trackEvent]);

  // Метрики в реальном времени
  const updateMetrics = useCallback((key, value) => {
    setMetrics(prev => ({
      ...prev,
      [key]: value,
      [`${key}_timestamp`]: Date.now(),
    }));
  }, []);

  // Статистика сессии
  const sessionStats = useMemo(() => {
    if (!session) return null;
    
    const duration = Date.now() - session.startTime;
    const eventsByCategory = events.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {});
    
    return {
      ...session,
      duration,
      eventsByCategory,
      averageEventRate: events.length / (duration / 1000 / 60), // событий в минуту
    };
  }, [session, events]);

  return {
    // Основные данные
    session: sessionStats,
    events,
    metrics,
    isOnline,
    enabled,
    
    // Основные методы
    trackEvent,
    trackPageView,
    trackClick,
    trackFormSubmit,
    trackFormError,
    trackSearch,
    trackPurchase,
    trackError,
    trackExperiment,
    
    // Производительность
    startTiming,
    endTiming,
    
    // Управление
    flushEvents,
    endSession,
    updateMetrics,
    
    // Утилиты
    isTracking: enabled && Boolean(session),
    hasEvents: events.length > 0,
    queueSize: eventQueue.current.length,
    
    // Debugging
    debug: {
      eventQueue: eventQueue.current,
      performanceMarks: Array.from(performanceMarks.current.entries()),
      config: {
        enabled,
        debug,
        batchSize,
        flushInterval,
        sessionTimeout,
      },
    },
  };
}

/**
 * usePageTracking - Автоматический трекинг страниц
 * 
 * @param {Object} options - Опции трекинга
 * @returns {Object} - API трекинга страниц
 */
export function usePageTracking(options = {}) {
  const { 
    trackOnMount = true,
    trackTitleChanges = true,
    trackHashChanges = false,
  } = options;
  
  const { trackPageView } = useAnalytics();
  const lastPath = useRef(window.location.pathname);
  
  useEffect(() => {
    if (trackOnMount) {
      trackPageView();
    }
  }, [trackOnMount, trackPageView]);
  
  useEffect(() => {
    if (!trackTitleChanges) return;
    
    const observer = new MutationObserver(() => {
      trackPageView();
    });
    
    observer.observe(document.querySelector('title'), {
      childList: true,
      subtree: true,
    });
    
    return () => observer.disconnect();
  }, [trackTitleChanges, trackPageView]);
  
  useEffect(() => {
    const handleLocationChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath.current) {
        lastPath.current = currentPath;
        trackPageView();
      }
    };
    
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [trackPageView]);
  
  return {
    trackCurrentPage: () => trackPageView(),
    lastTrackedPath: lastPath.current,
  };
}

/**
 * usePerformanceTracking - Трекинг производительности
 * 
 * @param {Object} options - Опции трекинга производительности
 * @returns {Object} - API трекинга производительности
 */
export function usePerformanceTracking(options = {}) {
  const {
    trackInitialLoad = true,
    trackInteractions = true,
    trackResources = false,
  } = options;
  
  const { trackEvent, startTiming, endTiming } = useAnalytics();
  
  useEffect(() => {
    if (trackInitialLoad && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (navigation) {
        trackEvent('page_load_performance', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          connect: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseEnd - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          dom: navigation.domComplete - navigation.domLoading,
        }, { category: 'performance' });
      }
    }
  }, [trackInitialLoad, trackEvent]);
  
  const measureComponent = useCallback((componentName) => {
    const measureId = `component_${componentName}`;
    
    return {
      start: () => startTiming(measureId),
      end: () => endTiming(measureId),
    };
  }, [startTiming, endTiming]);
  
  const measureAsync = useCallback(async (name, asyncFunction) => {
    startTiming(name);
    try {
      const result = await asyncFunction();
      endTiming(name);
      return result;
    } catch (error) {
      endTiming(name);
      throw error;
    }
  }, [startTiming, endTiming]);
  
  return {
    measureComponent,
    measureAsync,
    startTiming,
    endTiming,
  };
} 
 
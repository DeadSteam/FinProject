import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { useAnalytics } from './useAnalytics.js';

/**
 * useMetrics - Универсальная система сбора метрик производительности
 * 
 * Поддерживает:
 * - Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
 * - Custom метрики
 * - Real User Monitoring (RUM)
 * - Benchmark тесты
 * - Memory usage
 * - Network performance
 * - Component performance
 * - API response times
 * - User interaction metrics
 * 
 * @param {Object} options - Конфигурация метрик
 * @returns {Object} - API для работы с метриками
 */
export function useMetrics(options = {}) {
  const {
    // Конфигурация
    enabled = true,
    enableWebVitals = true,
    enableCustomMetrics = true,
    enableMemoryTracking = true,
    enableNetworkTracking = true,
    
    // Sampling
    sampleRate = 1.0, // 100% по умолчанию
    
    // Отправка данных
    endpoint = '/api/v1/metrics',
    batchSize = 50,
    flushInterval = 10000, // 10 секунд
    
    // Callbacks
    onMetricCollected,
    onBatchSent,
    onThresholdExceeded,
    
    // Thresholds для алертов
    thresholds = {
      lcp: 2500, // 2.5s
      fid: 100,  // 100ms
      cls: 0.1,  // 0.1
      fcp: 1800, // 1.8s
      ttfb: 800, // 800ms
      memoryUsage: 50 * 1024 * 1024, // 50MB
    },
  } = options;

  const analytics = useAnalytics({ enabled });
  
  // Состояние метрик
  const [metrics, setMetrics] = useState({});
  const [webVitals, setWebVitals] = useState({});
  const [customMetrics, setCustomMetrics] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  
  // Refs для управления
  const metricsQueue = useRef([]);
  const observers = useRef({});
  const timers = useRef(new Map());
  const counters = useRef(new Map());
  const gauges = useRef(new Map());
  const histograms = useRef(new Map());
  
  // Инициализация
  useEffect(() => {
    if (!enabled) return;
    
    initializeWebVitals();
    initializePerformanceObserver();
    initializeMemoryTracking();
    initializeNetworkTracking();
    setupMetricsCollection();
    
    return () => {
      cleanup();
    };
  }, [enabled]);

  // Периодическая отправка метрик
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      flushMetrics();
    }, flushInterval);
    
    return () => clearInterval(interval);
  }, [enabled, flushInterval]);

  // Инициализация Web Vitals
  const initializeWebVitals = useCallback(() => {
    if (!enableWebVitals || typeof window === 'undefined') return;
    
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          const lcp = lastEntry.startTime;
          updateWebVital('lcp', lcp);
          
          if (lcp > thresholds.lcp) {
            onThresholdExceeded?.('lcp', lcp, thresholds.lcp);
          }
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observers.current.lcp = lcpObserver;
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('LCP observer not supported');
        }
      }
      
      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const fid = entry.processingStart - entry.startTime;
            updateWebVital('fid', fid);
            
            if (fid > thresholds.fid) {
              onThresholdExceeded?.('fid', fid, thresholds.fid);
            }
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        observers.current.fid = fidObserver;
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('FID observer not supported');
        }
      }
      
      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          updateWebVital('cls', clsValue);
          
          if (clsValue > thresholds.cls) {
            onThresholdExceeded?.('cls', clsValue, thresholds.cls);
          }
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observers.current.cls = clsObserver;
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('CLS observer not supported');
        }
      }
    }
    
    // First Contentful Paint (FCP) и Time to First Byte (TTFB)
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (navigation) {
        const fcp = navigation.domContentLoadedEventStart - navigation.fetchStart;
        const ttfb = navigation.responseStart - navigation.requestStart;
        
        updateWebVital('fcp', fcp);
        updateWebVital('ttfb', ttfb);
        
        if (fcp > thresholds.fcp) {
          onThresholdExceeded?.('fcp', fcp, thresholds.fcp);
        }
        
        if (ttfb > thresholds.ttfb) {
          onThresholdExceeded?.('ttfb', ttfb, thresholds.ttfb);
        }
      }
    }
  }, [enableWebVitals, thresholds, onThresholdExceeded]);

  // Инициализация Performance Observer
  const initializePerformanceObserver = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            collectResourceMetric(entry);
          }
        });
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
      observers.current.resource = resourceObserver;
      
      // Navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            collectNavigationMetric(entry);
          }
        });
      });
      
      navigationObserver.observe({ entryTypes: ['navigation'] });
      observers.current.navigation = navigationObserver;
      
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Performance observers not fully supported');
      }
    }
  }, []);

  // Сбор метрик ресурсов
  const collectResourceMetric = useCallback((entry) => {
    const resourceMetric = {
      name: entry.name,
      type: getResourceType(entry.name),
      duration: entry.duration,
      size: entry.transferSize || entry.decodedBodySize,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
      timestamp: entry.startTime,
    };
    
    addMetricToQueue('resource_timing', resourceMetric);
  }, []);

  // Сбор метрик навигации
  const collectNavigationMetric = useCallback((entry) => {
    const navigationMetric = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseEnd - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domComplete - entry.domLoading,
      load: entry.loadEventEnd - entry.loadEventStart,
      redirect: entry.redirectEnd - entry.redirectStart,
      unload: entry.unloadEventEnd - entry.unloadEventStart,
    };
    
    addMetricToQueue('navigation_timing', navigationMetric);
    setPerformanceData(prev => ({ ...prev, navigation: navigationMetric }));
  }, []);

  // Определение типа ресурса
  const getResourceType = useCallback((url) => {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }, []);

  // Инициализация отслеживания памяти
  const initializeMemoryTracking = useCallback(() => {
    if (!enableMemoryTracking || !('memory' in performance)) return;
    
    const trackMemory = () => {
      const {memory} = performance;
      const memoryMetric = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };
      
      addMetricToQueue('memory_usage', memoryMetric);
      setPerformanceData(prev => ({ ...prev, memory: memoryMetric }));
      
      if (memory.usedJSHeapSize > thresholds.memoryUsage) {
        onThresholdExceeded?.('memory', memory.usedJSHeapSize, thresholds.memoryUsage);
      }
    };
    
    // Отслеживаем память каждые 5 секунд
    const memoryInterval = setInterval(trackMemory, 5000);
    timers.current.set('memory', memoryInterval);
    
    // Первоначальное измерение
    trackMemory();
  }, [enableMemoryTracking, thresholds, onThresholdExceeded]);

  // Инициализация отслеживания сети
  const initializeNetworkTracking = useCallback(() => {
    if (!enableNetworkTracking || !('connection' in navigator)) return;
    
    const trackConnection = () => {
      const {connection} = navigator;
      const networkMetric = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        timestamp: Date.now(),
      };
      
      addMetricToQueue('network_info', networkMetric);
      setPerformanceData(prev => ({ ...prev, network: networkMetric }));
    };
    
    trackConnection();
    
    // Отслеживаем изменения соединения
    navigator.connection.addEventListener('change', trackConnection);
    
    return () => {
      navigator.connection.removeEventListener('change', trackConnection);
    };
  }, [enableNetworkTracking]);

  // Настройка сбора метрик
  const setupMetricsCollection = useCallback(() => {
    // Сбор метрик каждую минуту
    const collectInterval = setInterval(() => {
      collectSystemMetrics();
    }, 60000);
    
    timers.current.set('collect', collectInterval);
  }, []);

  // Сбор системных метрик
  const collectSystemMetrics = useCallback(() => {
    const metrics = {
      timestamp: Date.now(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: screen.width,
        height: screen.height,
      },
      devicePixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };
    
    addMetricToQueue('system_info', metrics);
  }, []);

  // Обновление Web Vital
  const updateWebVital = useCallback((name, value) => {
    setWebVitals(prev => ({
      ...prev,
      [name]: {
        value,
        timestamp: Date.now(),
        rating: getVitalRating(name, value),
      },
    }));
    
    addMetricToQueue('web_vital', { name, value, timestamp: Date.now() });
    onMetricCollected?.('web_vital', name, value);
  }, [onMetricCollected, thresholds]);

  // Получение рейтинга Web Vital
  const getVitalRating = useCallback((name, value) => {
    const thresholdMap = {
      lcp: [2500, 4000],
      fid: [100, 300],
      cls: [0.1, 0.25],
      fcp: [1800, 3000],
      ttfb: [800, 1800],
    };
    
    const [good, poor] = thresholdMap[name] || [0, 0];
    
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }, []);

  // Добавление метрики в очередь
  const addMetricToQueue = useCallback((type, data) => {
    if (Math.random() > sampleRate) return; // Sampling
    
    const metric = {
      id: generateMetricId(),
      type,
      data,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    
    metricsQueue.current.push(metric);
    
    if (metricsQueue.current.length >= batchSize) {
      flushMetrics();
    }
  }, [sampleRate, batchSize]);

  // Генерация ID метрики
  const generateMetricId = useCallback(() => {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Custom метрики API
  const startTiming = useCallback((name) => {
    timers.current.set(name, performance.now());
  }, []);

  const endTiming = useCallback((name) => {
    const startTime = timers.current.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      timers.current.delete(name);
      
      recordCustomMetric(name, duration, 'timing');
      return duration;
    }
    return null;
  }, []);

  const incrementCounter = useCallback((name, value = 1) => {
    const current = counters.current.get(name) || 0;
    const newValue = current + value;
    counters.current.set(name, newValue);
    
    recordCustomMetric(name, newValue, 'counter');
  }, []);

  const setGauge = useCallback((name, value) => {
    gauges.current.set(name, value);
    recordCustomMetric(name, value, 'gauge');
  }, []);

  const recordHistogram = useCallback((name, value) => {
    if (!histograms.current.has(name)) {
      histograms.current.set(name, []);
    }
    
    const values = histograms.current.get(name);
    values.push(value);
    
    // Ограничиваем размер истории
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
    
    recordCustomMetric(name, value, 'histogram');
  }, []);

  // Запись custom метрики
  const recordCustomMetric = useCallback((name, value, type) => {
    const customMetric = {
      name,
      value,
      type,
      timestamp: Date.now(),
    };
    
    setCustomMetrics(prev => ({
      ...prev,
      [name]: customMetric,
    }));
    
    addMetricToQueue('custom_metric', customMetric);
    onMetricCollected?.('custom_metric', name, value);
  }, [addMetricToQueue, onMetricCollected]);

  // Отправка метрик
  const flushMetrics = useCallback(async () => {
    if (metricsQueue.current.length === 0) return;
    
    const batch = [...metricsQueue.current];
    metricsQueue.current = [];
    
    try {
      if (endpoint) {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metrics: batch }),
        });
      }
      
      // Отправляем в аналитику
      if (analytics && analytics.trackEvent) {
        analytics.trackEvent('metrics_batch', { count: batch.length }, {
          category: 'performance',
        });
      }
      
      onBatchSent?.(batch);
    } catch (error) {
      // Возвращаем метрики в очередь при ошибке
      metricsQueue.current.unshift(...batch);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to send metrics batch:', error);
      }
    }
  }, [endpoint, analytics, onBatchSent]);

  // Benchmark функция
  const benchmark = useCallback((name, fn, iterations = 1000) => {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      results.push(end - start);
    }
    
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);
    
    const benchmarkData = {
      name,
      iterations,
      average: avg,
      min,
      max,
      results: results.slice(0, 100), // Сохраняем только первые 100 результатов
    };
    
    addMetricToQueue('benchmark', benchmarkData);
    return benchmarkData;
  }, [addMetricToQueue]);

  // Очистка ресурсов
  const cleanup = useCallback(() => {
    // Останавливаем observers
    Object.values(observers.current).forEach(observer => {
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    });
    
    // Очищаем таймеры
    timers.current.forEach(timer => clearInterval(timer));
    timers.current.clear();
    
    // Отправляем оставшиеся метрики
    flushMetrics();
  }, [flushMetrics]);

  // Статистика метрик
  const metricsStats = useMemo(() => {
    const stats = {
      webVitals: Object.keys(webVitals).length,
      customMetrics: Object.keys(customMetrics).length,
      queueSize: metricsQueue.current.length,
      counters: counters.current.size,
      gauges: gauges.current.size,
      histograms: histograms.current.size,
    };
    
    return stats;
  }, [webVitals, customMetrics]);

  return {
    // Основные данные
    webVitals,
    customMetrics,
    performanceData,
    metricsStats,
    
    // Web Vitals
    lcp: webVitals.lcp?.value,
    fid: webVitals.fid?.value,
    cls: webVitals.cls?.value,
    fcp: webVitals.fcp?.value,
    ttfb: webVitals.ttfb?.value,
    
    // Custom метрики API
    startTiming,
    endTiming,
    incrementCounter,
    setGauge,
    recordHistogram,
    recordCustomMetric,
    
    // Benchmark
    benchmark,
    
    // Управление
    flushMetrics,
    
    // Утилиты
    isCollecting: enabled,
    hasWebVitals: Object.keys(webVitals).length > 0,
    hasCustomMetrics: Object.keys(customMetrics).length > 0,
    
    // Debugging
    debug: {
      queue: metricsQueue.current,
      timers: Array.from(timers.current.entries()),
      counters: Array.from(counters.current.entries()),
      gauges: Array.from(gauges.current.entries()),
      observers: Object.keys(observers.current),
    },
  };
}

/**
 * useComponentMetrics - Хук для измерения производительности компонентов
 * 
 * @param {string} componentName - Название компонента
 * @param {Object} options - Опции измерения
 * @returns {Object} - API для измерения компонента
 */
export function useComponentMetrics(componentName, options = {}) {
  const {
    trackRenders = true,
    trackMounts = true,
    trackUpdates = true,
  } = options;
  
  const { startTiming, endTiming, incrementCounter } = useMetrics();
  const renderCount = useRef(0);
  const mountTime = useRef(null);
  
  // Измерение mount
  useEffect(() => {
    if (trackMounts) {
      mountTime.current = performance.now();
      incrementCounter(`${componentName}_mounts`);
    }
    
    return () => {
      if (trackMounts && mountTime.current) {
        const mountDuration = performance.now() - mountTime.current;
        endTiming(`${componentName}_mount_duration`);
      }
    };
  }, [componentName, trackMounts, incrementCounter, endTiming]);
  
  // Измерение renders
  useEffect(() => {
    if (trackRenders) {
      renderCount.current++;
      incrementCounter(`${componentName}_renders`);
    }
  });
  
  const measureRender = useCallback(() => {
    if (trackRenders) {
      startTiming(`${componentName}_render`);
      return () => endTiming(`${componentName}_render`);
    }
    return () => {};
  }, [componentName, trackRenders, startTiming, endTiming]);
  
  const measureUpdate = useCallback((updateName) => {
    if (trackUpdates) {
      startTiming(`${componentName}_${updateName}`);
      return () => endTiming(`${componentName}_${updateName}`);
    }
    return () => {};
  }, [componentName, trackUpdates, startTiming, endTiming]);
  
  return {
    measureRender,
    measureUpdate,
    renderCount: renderCount.current,
    componentName,
  };
}

/**
 * useRealUserMonitoring - Хук для Real User Monitoring
 * 
 * @param {Object} options - Опции RUM
 * @returns {Object} - API для RUM
 */
export function useRealUserMonitoring(options = {}) {
  const {
    trackUserActions = true,
    trackPageViews = true,
    trackErrors = true,
  } = options;
  
  const { recordCustomMetric, incrementCounter } = useMetrics();
  const [userSession, setUserSession] = useState({
    startTime: Date.now(),
    pageViews: 0,
    interactions: 0,
    errors: 0,
  });
  
  // Трекинг взаимодействий пользователя
  useEffect(() => {
    if (!trackUserActions) return;
    
    const trackInteraction = (event) => {
      incrementCounter('user_interactions');
      setUserSession(prev => ({
        ...prev,
        interactions: prev.interactions + 1,
      }));
      
      recordCustomMetric(`interaction_${event.type}`, 1, 'counter');
    };
    
    const events = ['click', 'keydown', 'scroll', 'touch'];
    events.forEach(event => {
      document.addEventListener(event, trackInteraction, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackInteraction);
      });
    };
  }, [trackUserActions, incrementCounter, recordCustomMetric]);
  
  // Трекинг просмотров страниц
  useEffect(() => {
    if (trackPageViews) {
      setUserSession(prev => ({
        ...prev,
        pageViews: prev.pageViews + 1,
      }));
      
      incrementCounter('page_views');
    }
  }, [window.location.pathname, trackPageViews, incrementCounter]);
  
  const trackCustomAction = useCallback((actionName, data = {}) => {
    recordCustomMetric(`user_action_${actionName}`, data, 'event');
    incrementCounter(`user_actions`);
  }, [recordCustomMetric, incrementCounter]);
  
  return {
    userSession,
    trackCustomAction,
    sessionDuration: Date.now() - userSession.startTime,
  };
} 
 
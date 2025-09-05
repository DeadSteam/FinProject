/**
 * Performance утилиты для мониторинга Context'ов и компонентов
 * Помогает отслеживать ре-рендеры и оптимизировать производительность
 * 
 * ⚠️ ВАЖНО: Все debug функции загружаются только в development
 * В production эти функции становятся no-op для минимизации overhead
 */

import React, { useRef, useEffect } from 'react';

// Безопасное определение development режима
const isDevelopment = () => {
    if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' && ['3000', '3001'].includes(window.location.port);
    }
    return false;
};

const dev = isDevelopment();

// Функция для условного логирования только в development режиме
const devLog = (...args) => {
  if (dev) {
    console.log(...args);
  }
};

const devWarn = (...args) => {
  if (dev) {
    console.warn(...args);
  }
};

const devError = (...args) => {
  if (dev) {
    console.error(...args);
  }
};

const devGroup = (...args) => {
  if (dev) {
    console.group(...args);
  }
};

const devGroupEnd = () => {
  if (dev) {
    console.groupEnd();
  }
};

/**
 * Хук для отслеживания ре-рендеров компонента
 * @param {string} componentName - название компонента для логирования
 * @param {object} props - пропсы компонента для анализа изменений
 */
export const useRenderTracker = (componentName, props = {}) => {
  // В production - no-op
  if (!dev) {
    return 0;
  }

  const renderCount = useRef(0);
  const prevProps = useRef(props);

  useEffect(() => {
    renderCount.current += 1;
    
    devGroup(`🔄 ${componentName} render #${renderCount.current}`);
    
    // Анализируем изменения пропсов
    const changedProps = {};
    const currentProps = props;
    
    Object.keys(currentProps).forEach(key => {
      if (prevProps.current[key] !== currentProps[key]) {
        changedProps[key] = {
          from: prevProps.current[key],
          to: currentProps[key]
        };
      }
    });
    
    if (Object.keys(changedProps).length > 0) {
      devLog('📋 Changed props:', changedProps);
    } else {
      devWarn('⚠️ Re-render without prop changes');
    }
    
    devGroupEnd();
    prevProps.current = props;
  });

  return renderCount.current;
};

/**
 * Хук для мониторинга Context значений
 * @param {string} contextName - название контекста
 * @param {any} contextValue - значение контекста
 */
export const useContextTracker = (contextName, contextValue) => {
  // В production - no-op
  if (!dev) {
    return 0;
  }

  const prevValue = useRef(contextValue);
  const changeCount = useRef(0);

  useEffect(() => {
    if (prevValue.current !== contextValue) {
      changeCount.current += 1;
      
      devGroup(`🔄 ${contextName} Context change #${changeCount.current}`);
      devLog('📋 Previous value:', prevValue.current);
      devLog('📋 New value:', contextValue);
      
      // Анализируем глубокие изменения для объектов
      if (typeof contextValue === 'object' && contextValue !== null) {
        const changes = analyzeObjectChanges(prevValue.current, contextValue);
        if (changes.length > 0) {
          devLog('🔍 Object changes:', changes);
        }
      }
      
      devGroupEnd();
      prevValue.current = contextValue;
    }
  });

  return changeCount.current;
};

/**
 * Анализирует изменения в объекте (только в development)
 * @param {object} prevObj - предыдущий объект
 * @param {object} newObj - новый объект
 * @returns {Array} - массив изменений
 */
const analyzeObjectChanges = (prevObj, newObj) => {
  if (!dev) return [];
  
  const changes = [];
  
  if (!prevObj || !newObj) return changes;
  
  // Проверяем изменения в свойствах
  const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(newObj)]);
  
  allKeys.forEach(key => {
    const prevValue = prevObj[key];
    const newValue = newObj[key];
    
    if (prevValue !== newValue) {
      changes.push({
        key,
        type: prevValue === undefined ? 'added' : 
              newValue === undefined ? 'removed' : 'changed',
        from: prevValue,
        to: newValue
      });
    }
  });
  
  return changes;
};

/**
 * Хук для профилирования производительности операций
 * @param {string} operationName - название операции
 */
export const usePerformanceProfiler = (operationName) => {
  // В production - минимальная версия без логирования
  if (!dev) {
    return {
      startMeasurement: () => {},
      endMeasurement: () => 0
    };
  }

  const startTime = useRef(null);
  const measurements = useRef([]);

  const startMeasurement = () => {
    startTime.current = performance.now();
  };

  const endMeasurement = () => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      measurements.current.push(duration);
      
      devLog(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      
      // Показываем статистику каждые 10 измерений
      if (measurements.current.length % 10 === 0) {
        const avg = measurements.current.reduce((a, b) => a + b, 0) / measurements.current.length;
        const max = Math.max(...measurements.current);
        const min = Math.min(...measurements.current);
        
        devGroup(`📊 ${operationName} Performance Stats (${measurements.current.length} samples)`);
        devLog(`Average: ${avg.toFixed(2)}ms`);
        devLog(`Max: ${max.toFixed(2)}ms`);
        devLog(`Min: ${min.toFixed(2)}ms`);
        devGroupEnd();
      }
      
      startTime.current = null;
      return duration;
    }
    return 0;
  };

  return { startMeasurement, endMeasurement };
};

/**
 * Компонент высшего порядка для отслеживания производительности
 * @param {React.Component} WrappedComponent - компонент для обертки
 * @param {string} componentName - название компонента
 */
export const withPerformanceTracker = (WrappedComponent, componentName) => {
  // В production - просто возвращаем компонент без обертки
  if (!dev) {
    return WrappedComponent;
  }

  return function PerformanceTrackedComponent(props) {
    useRenderTracker(componentName || WrappedComponent.name || 'Unknown', props);
    
    return <WrappedComponent {...props} />;
  };
};

/**
 * Утилита для измерения размера Context value (только в development)
 * @param {any} value - значение для измерения
 * @returns {number} - размер в байтах (приблизительный)
 */
export const measureContextSize = (value) => {
  if (!dev) return 0;
  
  try {
    const serialized = JSON.stringify(value);
    return new Blob([serialized]).size;
  } catch (error) {
    devWarn('Unable to measure context size:', error);
    return 0;
  }
};

/**
 * Хук для отслеживания размера Context
 * @param {string} contextName - название контекста
 * @param {any} contextValue - значение контекста
 */
export const useContextSizeTracker = (contextName, contextValue) => {
  // В production - no-op
  if (!dev) {
    return 0;
  }

  const prevSize = useRef(0);

  useEffect(() => {
    const currentSize = measureContextSize(contextValue);
    
    if (currentSize !== prevSize.current) {
      const sizeDiff = currentSize - prevSize.current;
      const sizeChangeType = sizeDiff > 0 ? 'increased' : 'decreased';
      
      devGroup(`📏 ${contextName} Context size ${sizeChangeType}`);
      devLog(`Size: ${currentSize} bytes (${sizeDiff > 0 ? '+' : ''}${sizeDiff})`);
      
      if (currentSize > 10000) { // 10KB
        devWarn('⚠️ Large context size detected! Consider optimization.');
      }
      
      devGroupEnd();
      prevSize.current = currentSize;
    }
  });

  return prevSize.current;
};

/**
 * Создает Context Profiler для замера производительности
 * @param {string} id - идентификатор профайлера
 * @param {Function} onRender - коллбек при рендере
 */
export const createContextProfiler = (id, onRender) => {
  // В production - просто возвращаем children без профилирования
  if (!dev) {
    return function NoOpProfiler({ children }) {
      return children;
    };
  }

  return function ContextProfiler({ children }) {
    const handleRender = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      const isLogsEnabled = typeof window !== 'undefined' && window.__ENABLE_PERF_LOGS__;
      if (isLogsEnabled) {
        devGroup(`⚡ Context Profiler: ${id}`);
        devLog(`Phase: ${phase}`);
        devLog(`Actual duration: ${actualDuration.toFixed(2)}ms`);
        devLog(`Base duration: ${baseDuration.toFixed(2)}ms`);
        devGroupEnd();
      }
      
      if (onRender) {
        onRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
      }
    };

    return (
      <React.Profiler id={id} onRender={handleRender}>
        {children}
      </React.Profiler>
    );
  };
};

/**
 * Создает оптимизированное значение Context
 * @param {Object} options - опции оптимизации
 */
export const createOptimizedContextValue = (options = {}) => {
  const { 
    enableMemoization = true, 
    enableSizeTracking = false,
    maxSize = 50000 // 50KB
  } = options;
  
  return function useOptimizedContextValue(valueFactory) {
    const memoizedValue = React.useMemo(() => {
      const value = valueFactory();
      
      // Размер трекинг только в development
      if (enableSizeTracking && dev) {
        const size = measureContextSize(value);
        if (size > maxSize) {
          devWarn(`Context value size (${size}B) exceeds maximum (${maxSize}B)`);
        }
      }
      
      return value;
    }, [valueFactory]);

    return enableMemoization ? memoizedValue : valueFactory();
  };
};

/**
 * Отладочная утилита для анализа всех Context'ов
 */
export const debugAllContexts = () => {
  if (!dev) return;
  
  devGroup('🔍 Context Debug Info');
  devLog('Use individual context trackers for detailed analysis');
  devGroupEnd();
};

/**
 * Phase 10 Task 10.4: Профилирование и мониторинг производительности
 * 
 * Утилиты для измерения и мониторинга производительности React приложения
 */

/**
 * HOC для профилирования времени рендера компонентов
 * @param {React.Component} WrappedComponent - компонент для профилирования
 * @param {string} componentName - имя компонента для логирования
 */
export const withPerformanceProfiler = (WrappedComponent, componentName = 'Component') => {
  // В production - просто возвращаем компонент без профилирования
  if (!dev) {
    return WrappedComponent;
  }

  return React.memo((props) => {
    const renderStartTime = React.useRef(null);
    
    // Замер времени начала рендера
    renderStartTime.current = performance.now();
    
    React.useEffect(() => {
      const renderEndTime = performance.now();
      const renderTime = renderEndTime - renderStartTime.current;
      
      if (renderTime > 16) { // Более 1 frame (16ms)
        devWarn(`🐌 ${componentName} render took ${renderTime.toFixed(2)}ms`);
      } else {
        devLog(`⚡ ${componentName} render took ${renderTime.toFixed(2)}ms`);
      }
    });
    
    return <WrappedComponent {...props} />;
  });
};

/**
 * Hook для измерения производительности операций
 * @param {string} operationName - имя операции
 */
export const usePerformanceTimer = (operationName) => {
  // В production - минимальная версия
  if (!dev) {
    return React.useCallback(() => {
      return {
        end: () => 0
      };
    }, [operationName]);
  }

  const startTimer = React.useCallback(() => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        devLog(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
        
        // Отправляем метрики в аналитику (если настроено)
        if (window.gtag) {
          window.gtag('event', 'timing_complete', {
            name: operationName,
            value: Math.round(duration)
          });
        }
        
        return duration;
      }
    };
  }, [operationName]);
  
  return startTimer;
};

/**
 * Hook для мониторинга памяти и производительности
 */
export const usePerformanceMonitor = () => {
  // В production - возвращаем пустые метрики
  if (!dev) {
    return {
      metrics: { memory: null, timing: null, connection: null },
      logMetrics: () => {}
    };
  }

  const [metrics, setMetrics] = React.useState({
    memory: null,
    timing: null,
    connection: null
  });
  
  React.useEffect(() => {
    const updateMetrics = () => {
      const newMetrics = {};
      
      // Memory API (если доступно)
      if (performance.memory) {
        newMetrics.memory = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
      }
      
      // Navigation Timing API
      if (performance.timing) {
        const {timing} = performance;
        newMetrics.timing = {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          domReady: timing.domComplete - timing.navigationStart
        };
      }
      
      // Network Information API (если доступно)
      if (navigator.connection) {
        newMetrics.connection = {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        };
      }
      
      setMetrics(newMetrics);
    };
    
    updateMetrics();
    
    // Обновляем метрики каждые 30 секунд
    const interval = setInterval(updateMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const logMetrics = React.useCallback(() => {
    devGroup('📊 Performance Metrics');
    
    if (metrics.memory) {
      devLog(`🧠 Memory: ${metrics.memory.used}MB / ${metrics.memory.total}MB (limit: ${metrics.memory.limit}MB)`);
    }
    
    if (metrics.timing) {
      devLog(`⏱️ Timing: DOM ${metrics.timing.domReady}ms, Load ${metrics.timing.loadComplete}ms`);
    }
    
    if (metrics.connection) {
      devLog(`🌐 Network: ${metrics.connection.effectiveType}, ${metrics.connection.downlink}Mbps, RTT ${metrics.connection.rtt}ms`);
    }
    
    devGroupEnd();
  }, [metrics]);
  
  return { metrics, logMetrics };
};

/**
 * Компонент для отображения метрик производительности в development
 */
export const PerformanceMonitor = React.memo(() => {
  // В production - не рендерим ничего
  if (!dev) {
    return null;
  }

  const { metrics, logMetrics } = usePerformanceMonitor();
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
        Performance Monitor
        <button 
          onClick={logMetrics}
          style={{
            marginLeft: '10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Log
        </button>
      </div>
      
      {metrics.memory && (
        <div>🧠 Memory: {metrics.memory.used}MB / {metrics.memory.total}MB</div>
      )}
      
      {metrics.timing && (
        <div>⏱️ Load: {metrics.timing.loadComplete}ms</div>
      )}
      
      {metrics.connection && (
        <div>🌐 Network: {metrics.connection.effectiveType}</div>
      )}
    </div>
  );
});

/**
 * Utility для измерения LCP (Largest Contentful Paint)
 */
export const measureLCP = () => {
  // В production - возвращаем null без измерения
  if (!dev) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    if (!window.PerformanceObserver) {
      resolve(null);
      return;
    }
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      devLog(`🎯 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
      
      resolve(lastEntry.startTime);
      observer.disconnect();
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // Timeout после 10 секунд
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 10000);
  });
};

/**
 * Utility для измерения FID (First Input Delay)
 */
export const measureFID = () => {
  // В production - возвращаем null без измерения
  if (!dev) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    if (!window.PerformanceObserver) {
      resolve(null);
      return;
    }
    
    const observer = new PerformanceObserver((list) => {
      const firstInput = list.getEntries()[0];
      
      if (firstInput) {
        const fid = firstInput.processingStart - firstInput.startTime;
        devLog(`👆 FID: ${fid.toFixed(2)}ms`);
        
        resolve(fid);
        observer.disconnect();
      }
    });
    
    observer.observe({ entryTypes: ['first-input'] });
    
    // Timeout после 30 секунд
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 30000);
  });
};

/**
 * Comprehensive performance audit
 */
export const runPerformanceAudit = async () => {
  // В production - возвращаем базовую информацию без детального аудита
  if (!dev) {
    return {
      timestamp: new Date().toISOString(),
      environment: 'production'
    };
  }

  devGroup('🚀 Performance Audit');
  
  const results = {
    lcp: await measureLCP(),
    fid: await measureFID(),
    timestamp: new Date().toISOString()
  };
  
  // Bundle size analysis
  if (performance.getEntriesByType) {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0];
      results.timing = {
        dns: nav.domainLookupEnd - nav.domainLookupStart,
        tcp: nav.connectEnd - nav.connectStart,
        request: nav.responseStart - nav.requestStart,
        response: nav.responseEnd - nav.responseStart,
        domParsing: nav.domComplete - nav.responseEnd,
        total: nav.loadEventEnd - nav.navigationStart
      };
    }
  }
  
  devLog('Performance Results:', results);
  devGroupEnd();
  
  return results;
};


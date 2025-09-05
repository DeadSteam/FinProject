import { useState, useCallback, useRef, useEffect } from 'react';

import { useAnalytics } from './useAnalytics.js';
import { useNotifications } from './useNotifications.js';

/**
 * useErrorBoundary - Универсальная система обработки ошибок
 * 
 * Поддерживает:
 * - Ловлю JavaScript ошибок
 * - Promise rejections
 * - Async/await ошибки
 * - Network ошибки
 * - Пользовательские ошибки
 * - Логирование и отчетность
 * - Retry механизм
 * - Fallback UI
 * - Error recovery
 * 
 * @param {Object} options - Конфигурация обработки ошибок
 * @returns {Object} - API для обработки ошибок
 */
export function useErrorBoundary(options = {}) {
  const {
    // Конфигурация
    enableLogging = true,
    enableAnalytics = true,
    enableNotifications = true,
    enableRetry = true,
    
    // Retry настройки
    maxRetries = 3,
    retryDelay = 1000,
    retryBackoff = 'exponential', // 'exponential' | 'linear' | 'fixed'
    
    // Фильтрация
    ignoreErrors = [],
    criticalErrors = ['ChunkLoadError', 'SecurityError'],
    
    // Callbacks
    onError,
    onRetry,
    onRecovery,
    
    // Fallback
    fallbackComponent = null,
    showFallbackOnCritical = true,
    
    // Отчетность
    reportEndpoint = '/api/v1/errors',
    enableRemoteLogging = true,
  } = options;

  const analytics = useAnalytics({ enabled: enableAnalytics });
  const notifications = useNotifications({ enabled: enableNotifications });
  
  // Состояние ошибок
  const [errors, setErrors] = useState([]);
  const [currentError, setCurrentError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  
  // Refs для управления
  const errorHistory = useRef([]);
  const retryTimeouts = useRef(new Map());
  const errorCounter = useRef(0);
  
  // Подписка на глобальные ошибки
  useEffect(() => {
    // JavaScript ошибки
    const handleError = (event) => {
      captureError(event.error || new Error(event.message), {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };
    
    // Unhandled Promise rejections
    const handleUnhandledRejection = (event) => {
      captureError(event.reason, {
        type: 'promise',
        handled: false,
      });
    };
    
    // Resource loading errors
    const handleResourceError = (event) => {
      if (event.target !== window) {
        captureError(new Error(`Resource loading failed: ${event.target.src || event.target.href}`), {
          type: 'resource',
          element: event.target.tagName,
          src: event.target.src || event.target.href,
        });
      }
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleResourceError, true);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleResourceError, true);
    };
  }, []);

  // Функция захвата ошибки
  const captureError = useCallback((error, context = {}) => {
    if (!error) return;
    
    // Проверяем фильтры
    if (shouldIgnoreError(error, ignoreErrors)) {
      return;
    }
    
    const errorId = generateErrorId();
    const timestamp = Date.now();
    
    const errorData = {
      id: errorId,
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      stack: error.stack,
      timestamp,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context,
      },
      severity: determineSeverity(error, criticalErrors),
      retryable: isRetryableError(error),
      handled: false,
    };
    
    // Добавляем в историю
    errorHistory.current.push(errorData);
    setErrors(prev => [...prev, errorData]);
    
    // Логирование
    if (enableLogging) {
      logError(errorData);
    }
    
    // Аналитика
    if (enableAnalytics && analytics.trackError) {
      analytics.trackError(error, context);
    }
    
    // Уведомления
    if (enableNotifications && errorData.severity === 'high') {
      notifications?.showError?.('Произошла ошибка', error.message, {
        persistent: true,
        actions: [
          {
            label: 'Повторить',
            onClick: () => retryLastOperation(),
          },
          {
            label: 'Сообщить',
            onClick: () => reportError(errorData),
          },
        ],
      });
    }
    
    // Отчетность
    if (enableRemoteLogging) {
      reportError(errorData);
    }
    
    // Callback
    onError?.(errorData);
    
    // Проверяем критичность
    if (errorData.severity === 'critical' || criticalErrors.includes(error.name)) {
      setCurrentError(errorData);
      setHasError(true);
      
      if (showFallbackOnCritical) {
        // Показываем fallback UI
      }
    }
    
    return errorData;
  }, [
    ignoreErrors,
    criticalErrors,
    enableLogging,
    enableAnalytics,
    enableNotifications,
    enableRemoteLogging,
    analytics,
    notifications,
    onError,
    showFallbackOnCritical
  ]);

  // Генерация ID ошибки
  const generateErrorId = useCallback(() => {
    return `error_${++errorCounter.current}_${Date.now()}`;
  }, []);

  // Определение серьезности ошибки
  const determineSeverity = useCallback((error, criticalErrors) => {
    if (criticalErrors.includes(error.name)) return 'critical';
    if (error.name === 'ChunkLoadError') return 'high';
    if (error.name === 'TypeError') return 'medium';
    if (error.name === 'ReferenceError') return 'high';
    if (error.name === 'NetworkError') return 'medium';
    return 'low';
  }, []);

  // Проверка на игнорирование ошибки
  const shouldIgnoreError = useCallback((error, ignoreList) => {
    return ignoreList.some(pattern => {
      if (typeof pattern === 'string') {
        return error.message?.includes(pattern) || error.name === pattern;
      }
      if (pattern instanceof RegExp) {
        return pattern.test(error.message) || pattern.test(error.stack);
      }
      if (typeof pattern === 'function') {
        return pattern(error);
      }
      return false;
    });
  }, []);

  // Проверка на возможность повтора
  const isRetryableError = useCallback((error) => {
    const retryableTypes = [
      'NetworkError',
      'TimeoutError',
      'ChunkLoadError',
      'AbortError',
    ];
    
    return retryableTypes.includes(error.name) ||
           error.message?.includes('network') ||
           error.message?.includes('timeout') ||
           error.message?.includes('fetch');
  }, []);

  // Логирование ошибки
  const logError = useCallback((errorData) => {
    const logLevel = errorData.severity === 'critical' ? 'error' : 
                    errorData.severity === 'high' ? 'error' : 'warn';
    
    console[logLevel]('Error captured:', {
      id: errorData.id,
      message: errorData.message,
      name: errorData.name,
      context: errorData.context,
      stack: errorData.stack,
    });
  }, []);

  // Отправка отчета об ошибке
  const reportError = useCallback(async (errorData) => {
    try {
      await fetch(reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });
    } catch (reportingError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to report error:', reportingError);
      }
    }
  }, [reportEndpoint]);

  // Retry функция
  const retry = useCallback(async (operation, operationId = null) => {
    if (!enableRetry) return;
    
    const id = operationId || generateErrorId();
    let attempts = 0;
    
    const attemptOperation = async () => {
      attempts++;
      
      try {
        const result = await operation();
        
        // Успешное восстановление
        if (retryTimeouts.current.has(id)) {
          clearTimeout(retryTimeouts.current.get(id));
          retryTimeouts.current.delete(id);
        }
        
        setIsRecovering(false);
        setRetryCount(0);
        onRecovery?.(id, attempts);
        
        return result;
      } catch (error) {
        onRetry?.(error, attempts, id);
        
        if (attempts >= maxRetries) {
          throw new Error(`Operation failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Вычисляем задержку
        const delay = calculateRetryDelay(attempts, retryDelay, retryBackoff);
        
        setIsRecovering(true);
        setRetryCount(attempts);
        
        // Планируем следующую попытку
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(async () => {
            try {
              const result = await attemptOperation();
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          }, delay);
          
          retryTimeouts.current.set(id, timeoutId);
        });
      }
    };
    
    return attemptOperation();
  }, [enableRetry, maxRetries, retryDelay, retryBackoff, onRetry, onRecovery]);

  // Вычисление задержки для retry
  const calculateRetryDelay = useCallback((attempt, baseDelay, backoffType) => {
    switch (backoffType) {
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);
      case 'linear':
        return baseDelay * attempt;
      case 'fixed':
      default:
        return baseDelay;
    }
  }, []);

  // Wrapper для async операций
  const withErrorBoundary = useCallback((asyncOperation, options = {}) => {
    return async (...args) => {
      try {
        return await asyncOperation(...args);
      } catch (error) {
        const errorData = captureError(error, {
          operation: asyncOperation.name || 'anonymous',
          args: options.logArgs ? args : undefined,
          ...options.context,
        });
        
        if (options.enableRetry && errorData.retryable) {
          return retry(() => asyncOperation(...args), errorData.id);
        }
        
        throw error;
      }
    };
  }, [captureError, retry]);

  // Recovery функции
  const recover = useCallback(() => {
    setHasError(false);
    setCurrentError(null);
    setIsRecovering(false);
    setRetryCount(0);
  }, []);

  const retryLastOperation = useCallback(() => {
    // Реализация retry последней операции
    if (currentError && currentError.retryable) {
      setIsRecovering(true);
      // Здесь должна быть логика повтора последней операции
    }
  }, [currentError]);

  // Очистка ошибок
  const clearErrors = useCallback((severity = null) => {
    if (severity) {
      setErrors(prev => prev.filter(error => error.severity !== severity));
      errorHistory.current = errorHistory.current.filter(error => error.severity !== severity);
    } else {
      setErrors([]);
      errorHistory.current = [];
    }
  }, []);

  // Получение статистики ошибок
  const getErrorStats = useCallback(() => {
    const stats = errorHistory.current.reduce((acc, error) => {
      acc.total++;
      acc.bySeverity[error.severity] = (acc.bySeverity[error.severity] || 0) + 1;
      acc.byType[error.name] = (acc.byType[error.name] || 0) + 1;
      
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (error.timestamp > hourAgo) {
        acc.lastHour++;
      }
      
      return acc;
    }, {
      total: 0,
      lastHour: 0,
      bySeverity: {},
      byType: {},
    });
    
    return stats;
  }, []);

  // Error boundary компонент
  const ErrorBoundaryComponent = useCallback(({ children, fallback }) => {
    if (hasError && currentError) {
      if (fallback) {
        return fallback(currentError, recover, retryLastOperation);
      }
      
      return fallbackComponent || (
        <div className="error-boundary">
          <h2>Что-то пошло не так</h2>
          <p>{currentError.message}</p>
          <button onClick={recover}>Попробовать снова</button>
          {currentError.retryable && (
            <button onClick={retryLastOperation} disabled={isRecovering}>
              {isRecovering ? `Повтор ${retryCount}/${maxRetries}...` : 'Повторить'}
            </button>
          )}
        </div>
      );
    }
    
    return children;
  }, [hasError, currentError, fallbackComponent, recover, retryLastOperation, isRecovering, retryCount, maxRetries]);

  return {
    // Основные данные
    errors,
    currentError,
    hasError,
    isRecovering,
    retryCount,
    
    // Основные функции
    captureError,
    withErrorBoundary,
    retry,
    recover,
    retryLastOperation,
    
    // Управление
    clearErrors,
    getErrorStats,
    
    // Компоненты
    ErrorBoundary: ErrorBoundaryComponent,
    
    // Утилиты
    hasErrors: errors.length > 0,
    hasCriticalErrors: errors.some(e => e.severity === 'critical'),
    hasRetryableErrors: errors.some(e => e.retryable),
    
    // Debugging
    debug: {
      errorHistory: errorHistory.current,
      retryTimeouts: Array.from(retryTimeouts.current.entries()),
      config: {
        enableLogging,
        enableAnalytics,
        enableNotifications,
        enableRetry,
        maxRetries,
        retryDelay,
        retryBackoff,
      },
    },
  };
}

/**
 * useAsyncErrorHandler - Хук для обработки ошибок в async операциях
 * 
 * @param {Object} options - Опции обработки
 * @returns {Object} - API для обработки async ошибок
 */
export function useAsyncErrorHandler(options = {}) {
  const { captureError, withErrorBoundary } = useErrorBoundary(options);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const executeAsync = useCallback(async (asyncFunction, errorContext = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await withErrorBoundary(asyncFunction, {
        context: errorContext,
        enableRetry: true,
      })();
      
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [withErrorBoundary]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    loading,
    error,
    executeAsync,
    clearError,
    hasError: Boolean(error),
  };
}

/**
 * useNetworkErrorHandler - Специализированный хук для network ошибок
 * 
 * @param {Object} options - Опции обработки network ошибок
 * @returns {Object} - API для обработки network ошибок
 */
export function useNetworkErrorHandler(options = {}) {
  const {
    retryCount = 3,
    retryDelay = 1000,
    timeoutDuration = 10000,
  } = options;
  
  const { withErrorBoundary } = useErrorBoundary({
    maxRetries: retryCount,
    retryDelay,
    enableRetry: true,
  });
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkError, setNetworkError] = useState(null);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkError(null);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkError(new Error('Network connection lost'));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const fetchWithErrorHandling = useCallback(async (url, options = {}) => {
    if (!isOnline) {
      throw new Error('No network connection');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    try {
      const response = await withErrorBoundary(fetch, {
        context: { url, method: options.method || 'GET' },
        enableRetry: true,
      })(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      setNetworkError(error);
      throw error;
    }
  }, [isOnline, timeoutDuration, withErrorBoundary]);
  
  return {
    isOnline,
    networkError,
    fetchWithErrorHandling,
    hasNetworkError: Boolean(networkError),
    clearNetworkError: () => setNetworkError(null),
  };
} 
 
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Хук для debounce значения
 * @param {*} value - Значение для debounce
 * @param {number} delay - Задержка в миллисекундах
 * @param {Object} options - Дополнительные опции
 * @returns {*} - Debounced значение
 */
export const useDebounce = (value, delay = 300, options = {}) => {
  const {
    leading = false,
    trailing = true,
    maxWait = null
  } = options;

  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);
  const maxTimeoutRef = useRef(null);
  const lastCallTimeRef = useRef(null);
  const lastArgsRef = useRef(value);

  useEffect(() => {
    lastArgsRef.current = value;
    const now = Date.now();

    // Если это первый вызов и нужно выполнить leading
    if (leading && !lastCallTimeRef.current) {
      setDebouncedValue(value);
      lastCallTimeRef.current = now;
      return;
    }

    // Очищаем предыдущий timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Если установлен maxWait и прошло слишком много времени
    if (maxWait && lastCallTimeRef.current && (now - lastCallTimeRef.current) >= maxWait) {
      setDebouncedValue(value);
      lastCallTimeRef.current = now;
      
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
      return;
    }

    // Устанавливаем новый timeout для trailing
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(lastArgsRef.current);
        lastCallTimeRef.current = Date.now();
        
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current);
          maxTimeoutRef.current = null;
        }
      }, delay);
    }

    // Устанавливаем maxWait timeout если нужно
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        setDebouncedValue(lastArgsRef.current);
        lastCallTimeRef.current = Date.now();
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }, maxWait);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, leading, trailing, maxWait]);

  return debouncedValue;
};

/**
 * Хук для debounce callback функции
 * @param {Function} callback - Функция для debounce
 * @param {number} delay - Задержка в миллисекундах
 * @param {Object} options - Дополнительные опции
 * @returns {Function} - Debounced функция
 */
export const useDebouncedCallback = (callback, delay = 300, options = {}) => {
  const {
    leading = false,
    trailing = true,
    maxWait = null,
  } = options;

  const callbackRef = useRef(callback);
  const timeoutRef = useRef(null);
  const maxTimeoutRef = useRef(null);
  const lastCallTimeRef = useRef(null);
  const lastArgsRef = useRef(null);
  const hasInvokedRef = useRef(false);

  // Обновляем callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useCallback((...args) => {
    const currentTime = Date.now();
    lastArgsRef.current = args;

    // Leading edge
    if (leading && !hasInvokedRef.current) {
      callbackRef.current(...args);
      hasInvokedRef.current = true;
      lastCallTimeRef.current = currentTime;
      return;
    }

    // Очищаем предыдущие таймеры
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // Проверяем maxWait
    if (maxWait && lastCallTimeRef.current) {
      const timeSinceLastCall = currentTime - lastCallTimeRef.current;
      if (timeSinceLastCall >= maxWait) {
        callbackRef.current(...args);
        lastCallTimeRef.current = currentTime;
        return;
      }
      
      // Устанавливаем maxWait таймер
      const remainingMaxWait = maxWait - timeSinceLastCall;
      maxTimeoutRef.current = setTimeout(() => {
        callbackRef.current(...lastArgsRef.current);
        lastCallTimeRef.current = Date.now();
      }, remainingMaxWait);
    }

    // Trailing edge
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...lastArgsRef.current);
        lastCallTimeRef.current = Date.now();
        hasInvokedRef.current = false;
      }, delay);
    }
  }, [delay, leading, trailing, maxWait]);

  // Метод для немедленного выполнения
  const flush = useCallback(() => {
    if (timeoutRef.current && lastArgsRef.current) {
      clearTimeout(timeoutRef.current);
      clearTimeout(maxTimeoutRef.current);
      callbackRef.current(...lastArgsRef.current);
      timeoutRef.current = null;
      maxTimeoutRef.current = null;
      lastCallTimeRef.current = Date.now();
      hasInvokedRef.current = false;
    }
  }, []);

  // Метод для отмены
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    hasInvokedRef.current = false;
    lastArgsRef.current = null;
  }, []);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { debouncedFn, flush, cancel };
};

/**
 * useThrottle - Хук для throttle (ограничение частоты)
 * 
 * @param {*} value - Значение для throttle
 * @param {number} limit - Ограничение в мс
 * @returns {*} - Throttled значение
 */
export const useThrottle = (value, limit = 300) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRunRef = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    
    if (now >= lastRunRef.current + limit) {
      setThrottledValue(value);
      lastRunRef.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastRunRef.current = Date.now();
      }, limit - (now - lastRunRef.current));

      return () => clearTimeout(timer);
    }
  }, [value, limit]);

  return throttledValue;
};

/**
 * useThrottledCallback - Throttled функция
 * 
 * @param {Function} callback - Функция для throttle
 * @param {number} limit - Ограничение в мс
 * @returns {Function} - Throttled функция
 */
export const useThrottledCallback = (callback, limit = 300) => {
  const callbackRef = useRef(callback);
  const lastRunRef = useRef(0);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastRunRef.current >= limit) {
      callbackRef.current(...args);
      lastRunRef.current = now;
    }
  }, [limit]);
};

/**
 * useDebounceState - Комбинированный state + debounce
 * 
 * @param {*} initialValue - Начальное значение
 * @param {number} delay - Задержка debounce
 * @returns {Array} - [value, debouncedValue, setValue, immediateValue]
 */
export const useDebounceState = (initialValue, delay = 300) => {
  const [immediateValue, setImmediateValue] = useState(initialValue);
  const debouncedValue = useDebounce(immediateValue, delay);

  return [immediateValue, debouncedValue, setImmediateValue, immediateValue];
};
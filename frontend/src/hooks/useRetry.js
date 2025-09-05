import { useCallback } from 'react';

/**
 * useRetry – обёртка для повторных попыток async функций
 */
export const useRetry = ({ attempts = 3, delay = 1000 } = {}) => {
  const retry = useCallback(async (fn, ...args) => {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn(...args);
      } catch (err) {
        lastError = err;
        if (i < attempts - 1) {
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    throw lastError;
  }, [attempts, delay]);

  return retry;
}; 
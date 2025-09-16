/**
 * Утилита для исправления ошибок ResizeObserver
 */

export const initResizeObserverFix = () => {
  if (typeof window === 'undefined') return;
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (error) {
            if (error.message && error.message.includes('ResizeObserver loop completed with undelivered notifications')) {
              console.warn('ResizeObserver loop error ignored:', error.message);
              return;
            }
            throw error;
          }
        });
      });
    }
  };

  const errorHandler = (event) => {
    if (event.message && event.message.includes('ResizeObserver loop completed with undelivered notifications')) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('ResizeObserver loop error caught and ignored:', event.message);
      return false;
    }
  };

  const unhandledRejectionHandler = (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('ResizeObserver loop completed with undelivered notifications')) {
      event.preventDefault();
      console.warn('ResizeObserver loop promise rejection caught and ignored:', event.reason.message);
      return false;
    }
  };

  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', unhandledRejectionHandler);

  return () => {
    window.ResizeObserver = OriginalResizeObserver;
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
  };
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export default { initResizeObserverFix, debounce, throttle };


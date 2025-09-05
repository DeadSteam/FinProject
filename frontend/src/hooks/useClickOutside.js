import { useEffect, useRef, useCallback } from 'react';

/**
 * useClickOutside - Универсальный хук для обработки кликов вне элемента
 * 
 * Использование в модалках, дропдаунах, тултипах для закрытия
 * 
 * @param {Function} handler - Функция обработчик клика вне элемента
 * @param {Object} options - Опции конфигурации
 * @returns {Object} - Ref для элемента и дополнительные методы
 */
export const useClickOutside = (handler, options = {}) => {
  const {
    enabled = true,
    events = ['mousedown', 'touchstart'],
    excludeScrollbar = true,
    capture = true,
  } = options;

  const ref = useRef(null);
  const handlerRef = useRef(handler);

  // Обновляем handler ref
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const handleClickOutside = useCallback((event) => {
    if (!enabled || !ref.current || !handlerRef.current) {
      return;
    }

    // Проверяем, что клик не внутри элемента
    if (ref.current.contains(event.target)) {
      return;
    }

    // Исключаем клики по скроллбару
    if (excludeScrollbar) {
      const { clientX, clientY } = event;
      const { innerWidth, innerHeight } = window;
      
      // Клик по скроллбару (приблизительная проверка)
      if (clientX >= innerWidth - 20 || clientY >= innerHeight - 20) {
        return;
      }
    }

    handlerRef.current(event);
  }, [enabled, excludeScrollbar]);

  useEffect(() => {
    if (!enabled) return;

    // Добавляем обработчики для всех событий
    events.forEach(event => {
      document.addEventListener(event, handleClickOutside, capture);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleClickOutside, capture);
      });
    };
  }, [handleClickOutside, events, capture, enabled]);

  return ref;
};

/**
 * useClickAway - Алиас для useClickOutside
 */
export const useClickAway = useClickOutside;

/**
 * useOutsideClick - Еще один алиас
 */
export const useOutsideClick = useClickOutside;

/**
 * useMultipleClickOutside - Хук для множественных элементов
 * 
 * @param {Function} handler - Обработчик
 * @param {Object} options - Опции
 * @returns {Function} - Функция для создания refs
 */
export const useMultipleClickOutside = (handler, options = {}) => {
  const refs = useRef([]);
  const handlerRef = useRef(handler);

  const {
    enabled = true,
    events = ['mousedown', 'touchstart'],
    excludeScrollbar = true,
    capture = true,
  } = options;

  // Обновляем handler ref
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const handleClickOutside = useCallback((event) => {
    if (!enabled || !handlerRef.current) {
      return;
    }

    // Проверяем все refs
    const isClickInside = refs.current.some(ref => 
      ref && ref.contains && ref.contains(event.target)
    );

    if (isClickInside) {
      return;
    }

    // Исключаем клики по скроллбару
    if (excludeScrollbar) {
      const { clientX, clientY } = event;
      const { innerWidth, innerHeight } = window;
      
      if (clientX >= innerWidth - 20 || clientY >= innerHeight - 20) {
        return;
      }
    }

    handlerRef.current(event);
  }, [enabled, excludeScrollbar]);

  useEffect(() => {
    if (!enabled) return;

    events.forEach(event => {
      document.addEventListener(event, handleClickOutside, capture);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleClickOutside, capture);
      });
    };
  }, [handleClickOutside, events, capture, enabled]);

  // Функция для создания ref
  const createRef = useCallback((index = 0) => {
    return (element) => {
      refs.current[index] = element;
    };
  }, []);

  return createRef;
};

/**
 * useEscapeKey - Хук для обработки нажатия Escape
 * 
 * @param {Function} handler - Обработчик нажатия Escape
 * @param {Object} options - Опции
 */
export const useEscapeKey = (handler, options = {}) => {
  const {
    enabled = true,
    target = document,
  } = options;

  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && handlerRef.current) {
        handlerRef.current(event);
      }
    };

    target.addEventListener('keydown', handleKeyDown);

    return () => {
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, target]);
};

/**
 * useModalClose - Комбинированный хук для закрытия модалок
 * 
 * @param {Function} onClose - Функция закрытия
 * @param {Object} options - Опции
 * @returns {Object} - Ref и дополнительные методы
 */
export const useModalClose = (onClose, options = {}) => {
  const {
    closeOnClickOutside = true,
    closeOnEscape = true,
    closeOnBackdrop = true,
    enabled = true,
    ...clickOutsideOptions
  } = options;

  const modalRef = useRef(null);

  // Click outside
  const clickOutsideRef = useClickOutside(
    closeOnClickOutside ? onClose : () => {},
    {
      enabled: enabled && closeOnClickOutside,
      ...clickOutsideOptions
    }
  );

  // Escape key
  useEscapeKey(
    closeOnEscape ? onClose : () => {},
    { enabled: enabled && closeOnEscape }
  );

  // Backdrop click (для модалок с backdrop)
  const handleBackdropClick = useCallback((event) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose(event);
    }
  }, [closeOnBackdrop, onClose]);

  // Объединяем refs
  const setRef = useCallback((element) => {
    modalRef.current = element;
    clickOutsideRef.current = element;
  }, [clickOutsideRef]);

  return {
    ref: setRef,
    modalRef,
    handleBackdropClick,
    closeModal: onClose,
  };
};

/**
 * useDropdownClose - Хук для закрытия дропдаунов
 * 
 * @param {Function} onClose - Функция закрытия
 * @param {Object} options - Опции
 * @returns {Object} - Refs и методы
 */
export const useDropdownClose = (onClose, options = {}) => {
  const {
    closeOnClickOutside = true,
    closeOnEscape = true,
    closeOnScroll = false,
    enabled = true,
    triggerRef = null, // Ref триггера (кнопки)
    ...clickOutsideOptions
  } = options;

  const dropdownRef = useRef(null);
  const handlerRef = useRef(onClose);

  useEffect(() => {
    handlerRef.current = onClose;
  }, [onClose]);

  // Click outside (с учетом триггера)
  const handleClickOutside = useCallback((event) => {
    if (!enabled) return;

    // Проверяем дропдаун
    if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
      return;
    }

    // Проверяем триггер
    if (triggerRef?.current && triggerRef.current.contains(event.target)) {
      return;
    }

    handlerRef.current(event);
  }, [enabled, triggerRef]);

  useClickOutside(
    closeOnClickOutside ? handleClickOutside : () => {},
    {
      enabled: enabled && closeOnClickOutside,
      ...clickOutsideOptions
    }
  );

  // Escape key
  useEscapeKey(
    closeOnEscape ? onClose : () => {},
    { enabled: enabled && closeOnEscape }
  );

  // Scroll close
  useEffect(() => {
    if (!enabled || !closeOnScroll) return;

    const handleScroll = () => {
      handlerRef.current();
    };

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [enabled, closeOnScroll]);

  return {
    ref: dropdownRef,
    dropdownRef,
    closeDropdown: onClose,
  };
};

/**
 * useFocusTrap - Хук для удержания фокуса внутри элемента
 * 
 * @param {Object} options - Опции
 * @returns {Object} - Ref и методы управления
 */
export const useFocusTrap = (options = {}) => {
  const {
    enabled = true,
    initialFocus = true,
    restoreFocus = true,
    includeContainer = false,
  } = options;

  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Получение focusable элементов
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const elements = Array.from(containerRef.current.querySelectorAll(selector));

    if (includeContainer && containerRef.current.tabIndex >= 0) {
      elements.unshift(containerRef.current);
    }

    return elements.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, [includeContainer]);

  // Обработка Tab
  const handleKeyDown = useCallback((event) => {
    if (!enabled || event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [enabled, getFocusableElements]);

  // Активация trap
  const activate = useCallback(() => {
    if (!enabled || !containerRef.current) return;

    // Сохраняем текущий активный элемент
    previousActiveElementRef.current = document.activeElement;

    // Устанавливаем начальный фокус
    if (initialFocus) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else if (includeContainer) {
        containerRef.current.focus();
      }
    }

    // Добавляем обработчик Tab
    document.addEventListener('keydown', handleKeyDown);
  }, [enabled, initialFocus, getFocusableElements, includeContainer, handleKeyDown]);

  // Деактивация trap
  const deactivate = useCallback(() => {
    // Удаляем обработчик
    document.removeEventListener('keydown', handleKeyDown);

    // Восстанавливаем фокус
    if (restoreFocus && previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [restoreFocus, handleKeyDown]);

  useEffect(() => {
    if (enabled) {
      activate();
    }

    return () => {
      deactivate();
    };
  }, [enabled, activate, deactivate]);

  return {
    ref: containerRef,
    activate,
    deactivate,
    getFocusableElements,
  };
}; 
 
 
 
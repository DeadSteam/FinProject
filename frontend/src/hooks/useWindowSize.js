import { useState, useEffect, useCallback, useMemo } from 'react';

import { useThrottledCallback } from './useDebounce.js';

/**
 * Стандартные breakpoints (можно кастомизировать)
 */
const DEFAULT_BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

/**
 * Хук для отслеживания размера окна
 * @param {Object} options - Опции хука
 * @returns {Object} - Размеры окна и дополнительная информация
 */
export const useWindowSize = (options = {}) => {
  const {
    initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1200,
    initialHeight = typeof window !== 'undefined' ? window.innerHeight : 800,
    debounceDelay = 250,
    throttleDelay = 100,
    useThrottle = false, // Переключатель между debounce и throttle
  } = options;

  const [windowSize, setWindowSize] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const updateSize = useCallback(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
  }, []);

  // Выбираем между debounce и throttle
  const debouncedUpdateSize = useDebounce(updateSize, debounceDelay);
  const throttledUpdateSize = useThrottle(updateSize, throttleDelay);
  
  const handleResize = useCallback(() => {
    if (useThrottle) {
      throttledUpdateSize();
    } else {
      debouncedUpdateSize();
    }
  }, [useThrottle, throttledUpdateSize, debouncedUpdateSize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Устанавливаем начальный размер
    updateSize();

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize, updateSize]);

  // Дополнительные вычисляемые свойства
  const aspectRatio = useMemo(() => {
    return windowSize.height > 0 ? windowSize.width / windowSize.height : 0;
  }, [windowSize.width, windowSize.height]);

  const orientation = useMemo(() => {
    return windowSize.width > windowSize.height ? 'landscape' : 'portrait';
  }, [windowSize.width, windowSize.height]);

  const isSmallScreen = useMemo(() => {
    return windowSize.width < 768;
  }, [windowSize.width]);

  const isMediumScreen = useMemo(() => {
    return windowSize.width >= 768 && windowSize.width < 1024;
  }, [windowSize.width]);

  const isLargeScreen = useMemo(() => {
    return windowSize.width >= 1024;
  }, [windowSize.width]);

  const breakpoint = useMemo(() => {
    if (windowSize.width < 576) return 'xs';
    if (windowSize.width < 768) return 'sm';
    if (windowSize.width < 992) return 'md';
    if (windowSize.width < 1200) return 'lg';
    return 'xl';
  }, [windowSize.width]);

  return {
    ...windowSize,
    aspectRatio,
    orientation,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    breakpoint,
    
    // Методы
    updateSize,
  };
};

/**
 * Хук для media queries
 * @param {string} query - CSS media query
 * @returns {boolean} - Результат проверки media query
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    const handleChange = (e) => {
      setMatches(e.matches);
    };

    // Устанавливаем начальное значение
    setMatches(mediaQuery.matches);
    
    // Слушаем изменения
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

/**
 * useBreakpoint - Хук для работы с конкретным breakpoint
 * 
 * @param {string} breakpoint - Название breakpoint
 * @param {Object} breakpoints - Карта breakpoints
 * @returns {Object} - Информация о breakpoint
 */
export const useBreakpoint = (breakpoint, breakpoints = DEFAULT_BREAKPOINTS) => {
  const { width, isAbove, isBelow, currentBreakpoint } = useWindowSize({ 
    breakpoints,
    enableBreakpoints: true 
  });

  const minWidth = breakpoints[breakpoint];
  const isActive = currentBreakpoint === breakpoint;
  const isReached = isAbove(breakpoint);

  return {
    breakpoint,
    minWidth,
    isActive,
    isReached,
    isAbove: isReached,
    isBelow: isBelow(breakpoint),
    currentWidth: width,
    currentBreakpoint,
  };
};

/**
 * useResponsiveValue - Хук для адаптивных значений
 * 
 * @param {Object} values - Объект со значениями для разных breakpoints
 * @param {Object} options - Опции
 * @returns {*} - Текущее значение для активного breakpoint
 */
export const useResponsiveValue = (values, options = {}) => {
  const {
    breakpoints = DEFAULT_BREAKPOINTS,
    fallback = null,
  } = options;

  const { currentBreakpoint } = useWindowSize({ 
    breakpoints,
    enableBreakpoints: true 
  });

  // Ищем подходящее значение, начиная с текущего breakpoint
  const breakpointKeys = Object.keys(breakpoints).sort((a, b) => 
    breakpoints[a] - breakpoints[b]
  );

  const currentIndex = breakpointKeys.indexOf(currentBreakpoint);
  
  // Ищем значение, двигаясь вниз по breakpoints
  for (let i = currentIndex; i >= 0; i--) {
    const key = breakpointKeys[i];
    if (values[key] !== undefined) {
      return values[key];
    }
  }

  // Если ничего не найдено, возвращаем fallback
  return fallback;
};

/**
 * useViewportHeight - Хук для работы с высотой viewport
 * 
 * @param {Object} options - Опции
 * @returns {Object} - Информация о высоте viewport
 */
export const useViewportHeight = (options = {}) => {
  const {
    excludeScrollbar = false,
    includeUrlBar = false, // Для мобильных браузеров
  } = options;

  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window === 'undefined') return 800;
    
    if (includeUrlBar && window.screen) {
      return window.screen.height;
    }
    
    return excludeScrollbar ? 
      document.documentElement.clientHeight : 
      window.innerHeight;
  });

  const updateHeight = useThrottledCallback(() => {
    let height;
    
    if (includeUrlBar && window.screen) {
      height = window.screen.height;
    } else if (excludeScrollbar) {
      height = document.documentElement.clientHeight;
    } else {
      height = window.innerHeight;
    }
    
    setViewportHeight(height);
  }, 150);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateHeight();
    
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [updateHeight]);

  return {
    height: viewportHeight,
    vh: viewportHeight / 100, // 1vh в пикселях
    cssVar: `--vh: ${viewportHeight / 100}px`, // CSS переменная
  };
};

// Утилиты

/**
 * Определяет текущий breakpoint на основе ширины
 */
function getCurrentBreakpoint(width, breakpoints) {
  const sortedBreakpoints = Object.entries(breakpoints)
    .sort(([, a], [, b]) => b - a); // Сортируем по убыванию

  for (const [name, minWidth] of sortedBreakpoints) {
    if (width >= minWidth) {
      return name;
    }
  }
  
  return null;
} 
 
 
 
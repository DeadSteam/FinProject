import { useState, useCallback } from 'react';

/**
 * useToggle - Универсальный хук для переключения boolean состояний
 * 
 * Заменяет дублирование в модалках, дропдаунах, аккордеонах
 * 
 * @param {boolean} initialValue - Начальное значение
 * @returns {Array} - [value, toggle, setTrue, setFalse, setValue]
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [value, toggle, setTrue, setFalse, setValue];
}

/**
 * useMultiToggle - Хук для множественных boolean состояний
 * 
 * @param {Object} initialValues - Объект с начальными значениями
 * @returns {Object} - Состояния и методы управления
 */
export function useMultiToggle(initialValues = {}) {
  const [values, setValues] = useState(initialValues);

  const toggle = useCallback((key) => {
    setValues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const setTrue = useCallback((key) => {
    setValues(prev => ({
      ...prev,
      [key]: true
    }));
  }, []);

  const setFalse = useCallback((key) => {
    setValues(prev => ({
      ...prev,
      [key]: false
    }));
  }, []);

  const setValue = useCallback((key, value) => {
    setValues(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  const toggleAll = useCallback(() => {
    setValues(prev => {
      const result = {};
      Object.keys(prev).forEach(key => {
        result[key] = !prev[key];
      });
      return result;
    });
  }, []);

  const setAllTrue = useCallback(() => {
    setValues(prev => {
      const result = {};
      Object.keys(prev).forEach(key => {
        result[key] = true;
      });
      return result;
    });
  }, []);

  const setAllFalse = useCallback(() => {
    setValues(prev => {
      const result = {};
      Object.keys(prev).forEach(key => {
        result[key] = false;
      });
      return result;
    });
  }, []);

  return {
    values,
    toggle,
    setTrue,
    setFalse,
    setValue,
    reset,
    toggleAll,
    setAllTrue,
    setAllFalse,
  };
} 
 
 
 
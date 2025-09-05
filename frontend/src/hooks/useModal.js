import { useState, useCallback } from 'react';

/**
 * Универсальный хук для управления модальными окнами
 * Заменяет повторяющуюся логику модалей в админских компонентах
 */
export const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);
  const [data, setData] = useState(null);

  const open = useCallback((modalData = null) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback((modalData = null) => {
    if (isOpen) {
      close();
    } else {
      open(modalData);
    }
  }, [isOpen, open, close]);

  return {
    isOpen,
    data,
    open,
    close,
    toggle
  };
};

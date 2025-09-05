import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

import { useContextTracker, createContextProfiler } from '../utils/performance.js';

// Типы действий для Modal
const MODAL_ACTIONS = {
  OPEN_MODAL: 'OPEN_MODAL',
  CLOSE_MODAL: 'CLOSE_MODAL',
  CLOSE_ALL_MODALS: 'CLOSE_ALL_MODALS',
  UPDATE_MODAL_DATA: 'UPDATE_MODAL_DATA',
};

// Начальное состояние
const initialState = {
  modals: [], // Поддержка множественных модальных окон
  activeModal: null, // Текущее активное модальное окно
};

// Редьюсер для управления модальными окнами
function modalReducer(state, action) {
  switch (action.type) {
    case MODAL_ACTIONS.OPEN_MODAL:
      const newModal = {
        id: action.payload.id || Date.now() + Math.random(),
        type: action.payload.type,
        data: action.payload.data,
        props: action.payload.props || {},
        timestamp: Date.now(),
      };
      
      return {
        ...state,
        modals: [...state.modals, newModal],
        activeModal: newModal,
      };
      
    case MODAL_ACTIONS.CLOSE_MODAL:
      const filteredModals = state.modals.filter(modal => 
        modal.id !== action.payload
      );
      
      return {
        ...state,
        modals: filteredModals,
        activeModal: filteredModals.length > 0 
          ? filteredModals[filteredModals.length - 1] 
          : null,
      };
      
    case MODAL_ACTIONS.CLOSE_ALL_MODALS:
      return {
        ...state,
        modals: [],
        activeModal: null,
      };
      
    case MODAL_ACTIONS.UPDATE_MODAL_DATA:
      return {
        ...state,
        modals: state.modals.map(modal =>
          modal.id === action.payload.id
            ? { ...modal, data: { ...modal.data, ...action.payload.data } }
            : modal
        ),
        activeModal: state.activeModal?.id === action.payload.id
          ? { ...state.activeModal, data: { ...state.activeModal.data, ...action.payload.data } }
          : state.activeModal,
      };
      
    default:
      return state;
  }
}

// Создаем контекст
const ModalContext = createContext();

// Профайлер для Context (только в development)
const ModalProfiler = createContextProfiler('ModalContext');

// Провайдер Modal контекста
export const ModalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(modalReducer, initialState);
  
  // Действия
  const openModal = useCallback((modalId, props = {}) => {
    dispatch({
      type: MODAL_ACTIONS.OPEN_MODAL,
      payload: { modalId, props }
    });
  }, []);

  const closeModal = useCallback((modalId) => {
    dispatch({
      type: MODAL_ACTIONS.CLOSE_MODAL,
      payload: modalId
    });
  }, []);

  const closeAllModals = useCallback(() => {
    dispatch({ type: MODAL_ACTIONS.CLOSE_ALL_MODALS });
  }, []);

  const updateModalProps = useCallback((modalId, props) => {
    dispatch({
      type: MODAL_ACTIONS.UPDATE_MODAL_DATA,
      payload: { id: modalId, data: { props } }
    });
  }, []);

  // Обработка Escape для закрытия модалок
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && state.modals.length > 0) {
        const topModal = state.modals[state.modals.length - 1];
        if (topModal?.props?.closeOnEscape !== false) {
          closeModal(topModal.id);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [state.modals, closeModal]);

  // Блокировка скролла при открытых модалках
  useEffect(() => {
    const hasOpenModals = state.modals.length > 0;
    
    if (hasOpenModals) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [state.modals.length]);

  const value = {
    // Состояние
    modals: state.modals,
    activeModal: state.activeModal,
    hasModals: state.modals.length > 0,
    
    // Действия
    openModal,
    closeModal,
    closeAllModals,
    updateModalProps,
    
    // Вспомогательные функции
    isModalOpen: (type = null) => {
      if (!type) {
        return state.modals.length > 0;
      }
      return state.modals.some(modal => modal.type === type);
    },
    getModalByType: (type) => state.modals.find(modal => modal.type === type) || null,
    getTopModal: () => state.modals[state.modals.length - 1] || null,
  };

  // Отслеживаем изменения Context в development
  useContextTracker('Modal', value);
  
  return (
    <ModalProfiler>
      <ModalContext.Provider value={value}>
        {children}
      </ModalContext.Provider>
    </ModalProfiler>
  );
};

// Основной хук для работы с модалками
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

/**
 * Селективные хуки для оптимизации производительности
 */

// Хук только для состояния модалок
export const useModalState = () => {
  const { modals, activeModal, hasModals } = useModal();
  return { modals, activeModal, hasModals };
};

// Хук только для действий с модалками
export const useModalActions = () => {
  const { openModal, closeModal, closeAllModals, updateModalProps } = useModal();
  return { openModal, closeModal, closeAllModals, updateModalProps };
};

// Хук для работы с активной модалкой
export const useActiveModal = () => {
  const { activeModal, updateModalProps, closeModal } = useModal();
  return {
    activeModal,
    updateData: updateModalProps,
    close: () => closeModal(activeModal?.id),
  };
};

// Хук для быстрого открытия типовых модалок
export const useModalShortcuts = () => {
  const { openModal } = useModal();
  
  return {
    openConfirm: (data, props) => openModal('confirm', data, props),
    openInfo: (data, props) => openModal('info', data, props),
    openError: (data, props) => openModal('error', data, props),
    openForm: (data, props) => openModal('form', data, props),
    openEdit: (data, props) => openModal('edit', data, props),
  };
};

export { ModalContext };
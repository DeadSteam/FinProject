import { createContext, useContext, useReducer } from 'react';

// Типы действий для UI
const UI_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_THEME: 'SET_THEME',
  SET_SIDEBAR_COLLAPSED: 'SET_SIDEBAR_COLLAPSED',
  SET_MOBILE_MENU_OPEN: 'SET_MOBILE_MENU_OPEN',
};

// Начальное состояние UI
const initialState = {
  isLoading: false,
  error: null,
  theme: 'light', // 'light' | 'dark'
  sidebarCollapsed: false,
  mobileMenuOpen: false,
};

// Редьюсер для UI состояния
function uiReducer(state, action) {
  switch (action.type) {
    case UI_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
      
    case UI_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
      
    case UI_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    case UI_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      };
      
    case UI_ACTIONS.SET_SIDEBAR_COLLAPSED:
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };
      
    case UI_ACTIONS.SET_MOBILE_MENU_OPEN:
      return {
        ...state,
        mobileMenuOpen: action.payload,
      };
      
    default:
      return state;
  }
}

// Создаем контекст
const UIContext = createContext();

// Провайдер UI контекста
export const UIProvider = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);
  
  // Функции для управления состоянием загрузки
  const setLoading = (isLoading) => {
    dispatch({ type: UI_ACTIONS.SET_LOADING, payload: isLoading });
  };
  
  // Функции для управления ошибками
  const setError = (error) => {
    dispatch({ type: UI_ACTIONS.SET_ERROR, payload: error });
  };
  
  const clearError = () => {
    dispatch({ type: UI_ACTIONS.CLEAR_ERROR });
  };
  
  // Функции для управления темой
  const setTheme = (theme) => {
    dispatch({ type: UI_ACTIONS.SET_THEME, payload: theme });
    
    // Сохраняем тему в localStorage
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Не удалось сохранить тему в localStorage:', error);
      }
    }
  };
  
  const toggleTheme = () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };
  
  // Функции для управления сайдбаром
  const setSidebarCollapsed = (collapsed) => {
    dispatch({ type: UI_ACTIONS.SET_SIDEBAR_COLLAPSED, payload: collapsed });
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!state.sidebarCollapsed);
  };
  
  // Функции для управления мобильным меню
  const setMobileMenuOpen = (open) => {
    dispatch({ type: UI_ACTIONS.SET_MOBILE_MENU_OPEN, payload: open });
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!state.mobileMenuOpen);
  };
  
  // Вспомогательные функции
  const isDarkTheme = state.theme === 'dark';
  const isLightTheme = state.theme === 'light';
  
  // Значение контекста
  const value = {
    // Состояние
    isLoading: state.isLoading,
    error: state.error,
    theme: state.theme,
    sidebarCollapsed: state.sidebarCollapsed,
    mobileMenuOpen: state.mobileMenuOpen,
    
    // Вычисляемые значения
    isDarkTheme,
    isLightTheme,
    
    // Функции управления загрузкой
    setLoading,
    
    // Функции управления ошибками
    setError,
    clearError,
    
    // Функции управления темой
    setTheme,
    toggleTheme,
    
    // Функции управления сайдбаром
    setSidebarCollapsed,
    toggleSidebar,
    
    // Функции управления мобильным меню
    setMobileMenuOpen,
    toggleMobileMenu,
  };
  
  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

// Хук для использования UI контекста
export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export { UIContext }; 
import PropTypes from 'prop-types';
import React, { createContext, useReducer, useContext, useMemo, useEffect } from 'react';

/**
 * Начальное состояние приложения
 */
const initialState = {
    // UI состояние
    ui: {
        sidebarOpen: false,
        theme: localStorage.getItem('app-theme') || 'light',
        loading: false,
        globalFilters: {
            selectedYear: new Date().getFullYear().toString(),
            selectedShop: 'all',
            selectedCategory: null
        },
        modals: {
            editValue: { isOpen: false, data: null },
            initYear: { isOpen: false, data: null },
            addMetric: { isOpen: false, data: null },
            yearlyPlan: { isOpen: false, data: null }
        }
    },
    
    // Кэшированные данные
    data: {
        users: [],
        categories: [],
        metrics: [],
        shops: [],
        periods: [],
        lastSelected: {
            metric: null,
            category: null,
            shop: null
        }
    },
    
    // Кэш API запросов
    cache: {
        lastUpdated: {},
        queries: new Map(),
        invalidations: new Set()
    },
    
    // Состояние прав доступа
    permissions: {
        current: [],
        loaded: false,
        roles: []
    },
    
    // Состояние синхронизации
    sync: {
        isOnline: navigator.onLine,
        pendingMutations: [],
        conflictResolutions: []
    }
};

/**
 * Типы действий для reducer
 */
export const ACTION_TYPES = {
    // UI Actions
    SET_SIDEBAR_OPEN: 'SET_SIDEBAR_OPEN',
    SET_THEME: 'SET_THEME',
    SET_LOADING: 'SET_LOADING',
    SET_GLOBAL_FILTER: 'SET_GLOBAL_FILTER',
    SET_MODAL_STATE: 'SET_MODAL_STATE',
    
    // Data Actions
    SET_DATA: 'SET_DATA',
    UPDATE_DATA: 'UPDATE_DATA',
    DELETE_DATA: 'DELETE_DATA',
    SET_LAST_SELECTED: 'SET_LAST_SELECTED',
    
    // Cache Actions
    SET_CACHE: 'SET_CACHE',
    INVALIDATE_CACHE: 'INVALIDATE_CACHE',
    CLEAR_CACHE: 'CLEAR_CACHE',
    SET_LAST_UPDATED: 'SET_LAST_UPDATED',
    
    // Permissions Actions
    SET_PERMISSIONS: 'SET_PERMISSIONS',
    SET_ROLES: 'SET_ROLES',
    SET_PERMISSIONS_LOADED: 'SET_PERMISSIONS_LOADED',
    
    // Sync Actions
    SET_ONLINE_STATUS: 'SET_ONLINE_STATUS',
    ADD_PENDING_MUTATION: 'ADD_PENDING_MUTATION',
    REMOVE_PENDING_MUTATION: 'REMOVE_PENDING_MUTATION',
    ADD_CONFLICT_RESOLUTION: 'ADD_CONFLICT_RESOLUTION',
    
    // Batch Actions
    BATCH_UPDATE: 'BATCH_UPDATE',
    RESET_STATE: 'RESET_STATE'
};

/**
 * Reducer для управления состоянием приложения
 */
function appStateReducer(state, action) {
    switch (action.type) {
        case ACTION_TYPES.SET_SIDEBAR_OPEN:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    sidebarOpen: action.payload
                }
            };
            
        case ACTION_TYPES.SET_THEME:
            // Сохраняем тему в localStorage
            localStorage.setItem('app-theme', action.payload);
            return {
                ...state,
                ui: {
                    ...state.ui,
                    theme: action.payload
                }
            };
            
        case ACTION_TYPES.SET_LOADING:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    loading: action.payload
                }
            };
            
        case ACTION_TYPES.SET_GLOBAL_FILTER:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    globalFilters: {
                        ...state.ui.globalFilters,
                        [action.payload.key]: action.payload.value
                    }
                }
            };
            
        case ACTION_TYPES.SET_MODAL_STATE:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    modals: {
                        ...state.ui.modals,
                        [action.payload.modalName]: {
                            isOpen: action.payload.isOpen,
                            data: action.payload.data || null
                        }
                    }
                }
            };
            
        case ACTION_TYPES.SET_DATA:
            return {
                ...state,
                data: {
                    ...state.data,
                    [action.payload.key]: action.payload.value
                }
            };
            
        case ACTION_TYPES.UPDATE_DATA:
            const { key, id, updates } = action.payload;
            const currentData = state.data[key];
            
            if (Array.isArray(currentData)) {
                return {
                    ...state,
                    data: {
                        ...state.data,
                        [key]: currentData.map(item => 
                            item.id === id ? { ...item, ...updates } : item
                        )
                    }
                };
            }
            
            return {
                ...state,
                data: {
                    ...state.data,
                    [key]: { ...currentData, ...updates }
                }
            };
            
        case ACTION_TYPES.DELETE_DATA:
            const deleteKey = action.payload.key;
            const deleteId = action.payload.id;
            const deleteData = state.data[deleteKey];
            
            if (Array.isArray(deleteData)) {
                return {
                    ...state,
                    data: {
                        ...state.data,
                        [deleteKey]: deleteData.filter(item => item.id !== deleteId)
                    }
                };
            }
            
            return state;
            
        case ACTION_TYPES.SET_LAST_SELECTED:
            return {
                ...state,
                data: {
                    ...state.data,
                    lastSelected: {
                        ...state.data.lastSelected,
                        [action.payload.key]: action.payload.value
                    }
                }
            };
            
        case ACTION_TYPES.SET_CACHE:
            const newQueries = new Map(state.cache.queries);
            newQueries.set(action.payload.key, {
                data: action.payload.data,
                timestamp: Date.now(),
                ttl: action.payload.ttl || 300000 // 5 минут по умолчанию
            });
            
            return {
                ...state,
                cache: {
                    ...state.cache,
                    queries: newQueries
                }
            };
            
        case ACTION_TYPES.INVALIDATE_CACHE:
            const invalidations = new Set(state.cache.invalidations);
            if (Array.isArray(action.payload)) {
                action.payload.forEach(key => invalidations.add(key));
            } else {
                invalidations.add(action.payload);
            }
            
            return {
                ...state,
                cache: {
                    ...state.cache,
                    invalidations
                }
            };
            
        case ACTION_TYPES.CLEAR_CACHE:
            return {
                ...state,
                cache: {
                    lastUpdated: {},
                    queries: new Map(),
                    invalidations: new Set()
                }
            };
            
        case ACTION_TYPES.SET_LAST_UPDATED:
            return {
                ...state,
                cache: {
                    ...state.cache,
                    lastUpdated: {
                        ...state.cache.lastUpdated,
                        [action.payload.key]: action.payload.timestamp || Date.now()
                    }
                }
            };
            
        case ACTION_TYPES.SET_PERMISSIONS:
            return {
                ...state,
                permissions: {
                    ...state.permissions,
                    current: action.payload
                }
            };
            
        case ACTION_TYPES.SET_ROLES:
            return {
                ...state,
                permissions: {
                    ...state.permissions,
                    roles: action.payload
                }
            };
            
        case ACTION_TYPES.SET_PERMISSIONS_LOADED:
            return {
                ...state,
                permissions: {
                    ...state.permissions,
                    loaded: action.payload
                }
            };
            
        case ACTION_TYPES.SET_ONLINE_STATUS:
            return {
                ...state,
                sync: {
                    ...state.sync,
                    isOnline: action.payload
                }
            };
            
        case ACTION_TYPES.ADD_PENDING_MUTATION:
            return {
                ...state,
                sync: {
                    ...state.sync,
                    pendingMutations: [...state.sync.pendingMutations, action.payload]
                }
            };
            
        case ACTION_TYPES.REMOVE_PENDING_MUTATION:
            return {
                ...state,
                sync: {
                    ...state.sync,
                    pendingMutations: state.sync.pendingMutations.filter(
                        mutation => mutation.id !== action.payload
                    )
                }
            };
            
        case ACTION_TYPES.BATCH_UPDATE:
            return action.payload.reduce(appStateReducer, state);
            
        case ACTION_TYPES.RESET_STATE:
            return {
                ...initialState,
                ui: {
                    ...initialState.ui,
                    theme: state.ui.theme // Сохраняем тему
                }
            };
            
        default:
            if (process.env.NODE_ENV === 'development') {
                console.warn(`Unknown action type: ${action.type}`);
            }
            return state;
    }
}

/**
 * Context для состояния приложения
 */
const AppStateContext = createContext(undefined);

/**
 * Context для dispatch функции
 */
const AppDispatchContext = createContext(undefined);

/**
 * Provider компонент для глобального состояния
 */
export function AppStateProvider({ children }) {
    const [state, dispatch] = useReducer(appStateReducer, initialState);
    
    // Мемоизируем значения для предотвращения ненужных ре-рендеров
    const stateValue = useMemo(() => state, [state]);
    const dispatchValue = useMemo(() => dispatch, []);
    
    // Слушаем изменения online/offline статуса
    useEffect(() => {
        const handleOnline = () => dispatch({ 
            type: ACTION_TYPES.SET_ONLINE_STATUS, 
            payload: true 
        });
        
        const handleOffline = () => dispatch({ 
            type: ACTION_TYPES.SET_ONLINE_STATUS, 
            payload: false 
        });
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    
    // Автоматическая очистка устаревшего кэша
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const queries = new Map(state.cache.queries);
            let hasExpired = false;
            
            for (const [key, value] of queries.entries()) {
                if (now - value.timestamp > value.ttl) {
                    queries.delete(key);
                    hasExpired = true;
                }
            }
            
            if (hasExpired) {
                dispatch({
                    type: ACTION_TYPES.SET_CACHE,
                    payload: { queries }
                });
            }
        }, 60000); // Проверяем каждую минуту
        
        return () => clearInterval(interval);
    }, [state.cache.queries]);
    
    return (
        <AppStateContext.Provider value={stateValue}>
            <AppDispatchContext.Provider value={dispatchValue}>
                {children}
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
}

AppStateProvider.propTypes = {
    children: PropTypes.node.isRequired
};

/**
 * Hook для получения состояния приложения
 */
export function useAppState() {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }
    return context;
}

/**
 * Hook для получения dispatch функции
 */
export function useAppDispatch() {
    const context = useContext(AppDispatchContext);
    if (context === undefined) {
        throw new Error('useAppDispatch must be used within an AppStateProvider');
    }
    return context;
}

export default AppStateContext; 
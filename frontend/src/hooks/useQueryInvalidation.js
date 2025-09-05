import { useCallback, useRef, useEffect } from 'react';

import { useAppDispatch, ACTION_TYPES } from '../context/AppStateContext';
import { globalQueryCache } from '../utils/QueryCache';

/**
 * Хук для управления инвалидацией кэша запросов
 */
export function useQueryInvalidation(queryCache = globalQueryCache) {
    const dispatch = useAppDispatch();
    const invalidationQueue = useRef(new Set());
    const batchTimer = useRef(null);
    
    /**
     * Инвалидирует кэш по ключу или паттерну
     */
    const invalidateQuery = useCallback((pattern, options = {}) => {
        const { immediate = false, cascade = false, updateAppState = true } = options;
        
        if (immediate) {
            const count = queryCache.invalidate(pattern);
            
            if (updateAppState && cascade) {
                // Обновляем соответствующие данные в глобальном состоянии
                if (typeof pattern === 'string') {
                    dispatch({
                        type: ACTION_TYPES.INVALIDATE_CACHE,
                        payload: pattern
                    });
                }
            }
            
            return count;
        } else {
            // Добавляем в очередь для batch инвалидации
            invalidationQueue.current.add({ pattern, options });
            scheduleBatchInvalidation();
        }
    }, [queryCache, dispatch]);
    
    /**
     * Планирует batch инвалидацию
     */
    const scheduleBatchInvalidation = useCallback(() => {
        if (batchTimer.current) {
            clearTimeout(batchTimer.current);
        }
        
        batchTimer.current = setTimeout(() => {
            const patterns = Array.from(invalidationQueue.current);
            invalidationQueue.current.clear();
            
            let totalInvalidated = 0;
            
            patterns.forEach(({ pattern, options }) => {
                const count = queryCache.invalidate(pattern);
                totalInvalidated += count;
                
                if (options.updateAppState && options.cascade) {
                    if (typeof pattern === 'string') {
                        dispatch({
                            type: ACTION_TYPES.INVALIDATE_CACHE,
                            payload: pattern
                        });
                    }
                }
            });
            
            if (totalInvalidated > 0 && process.env.NODE_ENV === 'development') {
                console.log(`[QueryInvalidation] Batch invalidated ${totalInvalidated} cache entries`);
            }
        }, 100); // 100ms batch window
    }, [queryCache, dispatch]);
    
    /**
     * Инвалидирует кэш для конкретной сущности
     */
    const invalidateEntity = useCallback((entityType, entityId = null) => {
        const patterns = [];
        
        if (entityId) {
            // Инвалидируем конкретную сущность
            patterns.push(`${entityType}/${entityId}`);
            patterns.push(`${entityType}?.*id=${entityId}`);
        } else {
            // Инвалидируем все запросы типа сущности
            patterns.push(entityType);
            patterns.push(`${entityType}/`);
            patterns.push(`${entityType}?`);
        }
        
        patterns.forEach(pattern => {
            invalidateQuery(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { immediate: true });
        });
        
        // Обновляем соответствующие данные в app state
        if (entityType === 'users') {
            dispatch({ type: ACTION_TYPES.INVALIDATE_CACHE, payload: 'users' });
        } else if (entityType === 'categories') {
            dispatch({ type: ACTION_TYPES.INVALIDATE_CACHE, payload: 'categories' });
        } else if (entityType === 'metrics') {
            dispatch({ type: ACTION_TYPES.INVALIDATE_CACHE, payload: 'metrics' });
        } else if (entityType === 'shops') {
            dispatch({ type: ACTION_TYPES.INVALIDATE_CACHE, payload: 'shops' });
        }
    }, [invalidateQuery, dispatch]);
    
    /**
     * Инвалидирует кэш для связанных сущностей
     */
    const invalidateRelated = useCallback((entityType, entityId, relations = []) => {
        // Инвалидируем основную сущность
        invalidateEntity(entityType, entityId);
        
        // Инвалидируем связанные сущности
        relations.forEach(relation => {
            if (typeof relation === 'string') {
                invalidateEntity(relation);
            } else if (typeof relation === 'object') {
                const { type, id } = relation;
                invalidateEntity(type, id);
            }
        });
    }, [invalidateEntity]);
    
    /**
     * Инвалидирует кэш после мутации
     */
    const invalidateAfterMutation = useCallback((mutation, entityData = null) => {
        const { type, entity, operation } = mutation;
        
        switch (operation) {
            case 'create':
                // При создании инвалидируем списки
                invalidateQuery(`${entity}?`, { immediate: true });
                invalidateQuery(`${entity}/list`, { immediate: true });
                
                // Инвалидируем связанные счетчики
                invalidateQuery(`${entity}/count`, { immediate: true });
                break;
                
            case 'update':
                // При обновлении инвалидируем конкретную сущность и списки
                if (entityData?.id) {
                    invalidateEntity(entity, entityData.id);
                }
                invalidateQuery(`${entity}?`, { immediate: true });
                break;
                
            case 'delete':
                // При удалении инвалидируем все связанное
                if (entityData?.id) {
                    invalidateEntity(entity, entityData.id);
                }
                invalidateQuery(`${entity}?`, { immediate: true });
                invalidateQuery(`${entity}/count`, { immediate: true });
                break;
                
            default:
                // Общая инвалидация
                invalidateEntity(entity);
        }
        
        // Специальная логика для финансовых данных
        if (['actual_values', 'plan_values', 'metrics'].includes(entity)) {
            invalidateQuery('analytics', { immediate: true });
            invalidateQuery('dashboard', { immediate: true });
        }
    }, [invalidateQuery, invalidateEntity]);
    
    /**
     * Автоматическая инвалидация по времени
     */
    const scheduleAutoInvalidation = useCallback((queryKey, delay) => {
        setTimeout(() => {
            invalidateQuery(queryKey, { immediate: true });
        }, delay);
    }, [invalidateQuery]);
    
    /**
     * Инвалидирует кэш пользователя при изменении авторизации
     */
    const invalidateUserCache = useCallback(() => {
        invalidateQuery(/user/, { immediate: true });
        invalidateQuery(/profile/, { immediate: true });
        invalidateQuery(/permissions/, { immediate: true });
        
        // Очищаем пользовательские данные в app state
        dispatch({
            type: ACTION_TYPES.BATCH_UPDATE,
            payload: [
                { type: ACTION_TYPES.SET_DATA, payload: { key: 'users', value: [] } },
                { type: ACTION_TYPES.SET_PERMISSIONS, payload: [] },
                { type: ACTION_TYPES.SET_PERMISSIONS_LOADED, payload: false }
            ]
        });
    }, [invalidateQuery, dispatch]);
    
    /**
     * Инвалидирует весь кэш (nuclear option)
     */
    const invalidateAll = useCallback(() => {
        const count = queryCache.clear();
        
        // Очищаем кэш в app state
        dispatch({ type: ACTION_TYPES.CLEAR_CACHE });
        
        if (process.env.NODE_ENV === 'development') {
            console.log(`[QueryInvalidation] Cleared entire cache (${count} entries)`);
        }
        return count;
    }, [queryCache, dispatch]);
    
    /**
     * Предустановленные паттерны инвалидации
     */
    const invalidationPatterns = {
        // Финансовые данные
        finance: () => {
            invalidateQuery(/analytics/, { immediate: true });
            invalidateQuery(/metrics/, { immediate: true });
            invalidateQuery(/actual_values/, { immediate: true });
            invalidateQuery(/plan_values/, { immediate: true });
        },
        
        // Справочники
        references: () => {
            invalidateQuery(/categories/, { immediate: true });
            invalidateQuery(/shops/, { immediate: true });
            invalidateQuery(/periods/, { immediate: true });
        },
        
        // Пользовательские данные
        userData: () => {
            invalidateQuery(/users/, { immediate: true });
            invalidateQuery(/profile/, { immediate: true });
        },
        
        // Административные данные
        admin: () => {
            invalidateQuery(/admin/, { immediate: true });
            invalidateQuery(/users/, { immediate: true });
            invalidateQuery(/permissions/, { immediate: true });
        },
        
        // Dashboard данные
        dashboard: () => {
            invalidateQuery(/dashboard/, { immediate: true });
            invalidateQuery(/analytics/, { immediate: true });
            invalidateQuery(/summary/, { immediate: true });
        }
    };
    
    /**
     * Получение статистики инвалидации
     */
    const getInvalidationStats = useCallback(() => {
        const cacheStats = queryCache.getStats();
        
        return {
            ...cacheStats,
            queuedInvalidations: invalidationQueue.current.size,
            hasPendingBatch: batchTimer.current !== null
        };
    }, [queryCache]);
    
    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            if (batchTimer.current) {
                clearTimeout(batchTimer.current);
            }
        };
    }, []);
    
    return {
        // Основные методы
        invalidateQuery,
        invalidateEntity,
        invalidateRelated,
        invalidateAfterMutation,
        
        // Автоматизация
        scheduleAutoInvalidation,
        invalidateUserCache,
        invalidateAll,
        
        // Предустановленные паттерны
        ...invalidationPatterns,
        
        // Утилиты
        getInvalidationStats
    };
}

/**
 * Хук для автоматической инвалидации при изменении зависимостей
 */
export function useAutoInvalidation(queryKeys, dependencies = [], options = {}) {
    const { invalidateQuery } = useQueryInvalidation();
    const { delay = 0, immediate = true } = options;
    
    useEffect(() => {
        if (!Array.isArray(queryKeys)) {
            queryKeys = [queryKeys];
        }
        
        if (delay > 0) {
            const timer = setTimeout(() => {
                queryKeys.forEach(key => invalidateQuery(key, { immediate }));
            }, delay);
            
            return () => clearTimeout(timer);
        } else {
            queryKeys.forEach(key => invalidateQuery(key, { immediate }));
        }
    }, dependencies);
}

/**
 * Хук для инвалидации при размонтировании компонента
 */
export function useInvalidateOnUnmount(queryKeys, condition = true) {
    const { invalidateQuery } = useQueryInvalidation();
    
    useEffect(() => {
        return () => {
            if (condition) {
                if (!Array.isArray(queryKeys)) {
                    queryKeys = [queryKeys];
                }
                queryKeys.forEach(key => invalidateQuery(key, { immediate: true }));
            }
        };
    }, []);
}

export default useQueryInvalidation; 
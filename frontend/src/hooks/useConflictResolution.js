/**
 * Conflict Resolution Hook
 * 
 * Features:
 * - Automatic conflict detection
 * - Multiple resolution strategies
 * - Manual conflict resolution UI
 * - Conflict history and analytics
 * - Three-way merge capabilities
 * - Field-level conflict detection
 * - Custom resolution rules
 * - Conflict prevention mechanisms
 * 
 * @module useConflictResolution
 */

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppState } from '../context/AppStateContext';

// Conflict types
const CONFLICT_TYPES = {
  VERSION_MISMATCH: 'version_mismatch',
  CONCURRENT_EDIT: 'concurrent_edit',
  DELETED_RECORD: 'deleted_record',
  PERMISSION_CHANGED: 'permission_changed',
  SCHEMA_CHANGED: 'schema_changed',
  BUSINESS_RULE: 'business_rule',
  DATA_INTEGRITY: 'data_integrity'
};

// Resolution strategies
const RESOLUTION_STRATEGIES = {
  CLIENT_WINS: 'client_wins',           
  SERVER_WINS: 'server_wins',           
  MERGE_FIELDS: 'merge_fields',         
  NEWEST_WINS: 'newest_wins',           
  MANUAL: 'manual',                     
  CUSTOM: 'custom',                     
  THREE_WAY_MERGE: 'three_way_merge',   
  PRIORITY_BASED: 'priority_based'      
};

// Conflict severity levels
const SEVERITY_LEVELS = {
  LOW: 'low',           
  MEDIUM: 'medium',     
  HIGH: 'high',         
  CRITICAL: 'critical'  
};

// Default configuration
const DEFAULT_CONFIG = {
  enableAutoDetection: true,
  checkInterval: 30000,              
  deepComparison: true,
  ignoreFields: ['_id', '_rev', 'lastModified', 'updatedAt'],
  defaultStrategy: RESOLUTION_STRATEGIES.MANUAL,
  autoResolveThreshold: SEVERITY_LEVELS.LOW,
  maxAutoResolutions: 10,
  showNotifications: true,
  highlightConflicts: true,
  enableInlineResolution: true,
  maxConflictHistory: 1000,
  conflictTimeout: 300000,           
  batchSize: 50,
  enableLogging: process.env.NODE_ENV === 'development',
  enableMetrics: process.env.NODE_ENV === 'development'
};

/**
 * Функция для определения ключевых полей для каждого типа сущности
 * @param {string} entityType - Тип сущности
 * @returns {string[]} - Массив ключевых полей
 */
const getKeyFieldsForEntity = (entityType) => {
  switch (entityType) {
      case 'users':
          return ['username', 'email', 'role', 'status'];
      case 'shops':
          return ['name', 'address', 'status'];
      case 'categories':
          return ['name', 'description', 'status'];
      case 'metrics':
          return ['name', 'description', 'unit'];
      case 'yearly_plans':
          return ['value', 'year', 'shop_id', 'metric_id'];
      default:
          return ['id', 'name', 'status'];
  }
};

/**
 * Conflict Resolution Hook
 */
export const useConflictResolution = (config = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const dispatch = useAppDispatch();
  const appState = useAppState();
  
  const [activeConflicts, setActiveConflicts] = useState(new Map());
  const [conflictHistory, setConflictHistory] = useState([]);
  const [resolutionQueue, setResolutionQueue] = useState([]);
  const [conflictMetrics, setConflictMetrics] = useState({
    totalConflicts: 0,
    resolvedConflicts: 0,
    autoResolutions: 0,
    manualResolutions: 0,
    avgResolutionTime: 0,
    conflictsByType: {},
    conflictsBySeverity: {}
  });

  const conflictCounterRef = useRef(0);
  const checkIntervalRef = useRef(null);
  const resolutionTimersRef = useRef(new Map());
  const customResolversRef = useRef(new Map());
  const conflictRulesRef = useRef([]);

  const log = useCallback((level, message, data = null) => {
    if (!mergedConfig.enableLogging) return;
    console[level](`[ConflictResolution:${level.toUpperCase()}] ${message}`, data);
  }, [mergedConfig.enableLogging]);

  const updateMetrics = useCallback((updates) => {
    if (!mergedConfig.enableMetrics) return;
    setConflictMetrics(prev => ({ ...prev, ...updates }));
  }, [mergedConfig.enableMetrics]);

  const generateConflictId = useCallback(() => {
    conflictCounterRef.current++;
    return `conflict_${Date.now()}_${conflictCounterRef.current}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const deepCompare = useCallback((obj1, obj2, ignoredFields = []) => {
    const normalize = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      
      const normalized = {};
      Object.keys(obj).forEach(key => {
        if (!ignoredFields.includes(key)) {
          normalized[key] = typeof obj[key] === 'object' 
            ? normalize(obj[key]) 
            : obj[key];
        }
      });
      return normalized;
    };
    
    return JSON.stringify(normalize(obj1)) === JSON.stringify(normalize(obj2));
  }, []);

  const detectFieldConflicts = useCallback((local, server, base = null) => {
    const conflicts = [];
    const allKeys = new Set([
      ...Object.keys(local || {}),
      ...Object.keys(server || {}),
      ...Object.keys(base || {})
    ]);

    allKeys.forEach(key => {
      if (mergedConfig.ignoreFields.includes(key)) return;
      
      const localValue = local?.[key];
      const serverValue = server?.[key];
      const baseValue = base?.[key];
      
      if (JSON.stringify(localValue) === JSON.stringify(serverValue)) return;
      
      let conflictType = CONFLICT_TYPES.CONCURRENT_EDIT;
      let severity = SEVERITY_LEVELS.MEDIUM;
      
      if (baseValue !== undefined && (localValue === undefined || serverValue === undefined)) {
        conflictType = CONFLICT_TYPES.DELETED_RECORD;
        severity = SEVERITY_LEVELS.HIGH;
      }
      
      if (typeof localValue !== typeof serverValue) {
        conflictType = CONFLICT_TYPES.SCHEMA_CHANGED;
        severity = SEVERITY_LEVELS.HIGH;
      }
      
      conflictRulesRef.current.forEach(rule => {
        const ruleResult = rule(key, localValue, serverValue, baseValue);
        if (ruleResult) {
          conflictType = ruleResult.type || conflictType;
          severity = ruleResult.severity || severity;
        }
      });
      
      conflicts.push({
        field: key,
        type: conflictType,
        severity,
        local: localValue,
        server: serverValue,
        base: baseValue,
        timestamp: Date.now()
      });
    });

    return conflicts;
  }, [mergedConfig.ignoreFields]);

  /**
   * Detect conflicts between two versions of an entity
   * @param {string} entityType - The type of entity
   * @param {string} entityId - The ID of the entity
   * @param {object} previousData - The previous state of the entity
   * @param {object} currentData - The current state of the entity
   * @param {object} lastKnownData - The last known good state
   * @returns {object|null} - The conflict object, or null if no conflict
   */
  const detectConflict = useCallback((entityType, entityId, previousData, currentData, lastKnownData = null) => {
    try {
      // Проверяем наличие данных
      if (!previousData || !currentData) {
          return { 
              entityId, 
              entityType, 
              severity: 'none',
              fieldConflicts: []
          };
      }
      
      // Получаем ключевые поля для сущности
      const keyFields = getKeyFieldsForEntity(entityType);
      
      // Находим конфликты в полях
      const fieldConflicts = [];
      
      for (const field of keyFields) {
          if (previousData[field] !== undefined && 
              currentData[field] !== undefined && 
              previousData[field] !== currentData[field]) {
              fieldConflicts.push({
                  field,
                  oldValue: previousData[field],
                  newValue: currentData[field]
              });
          }
      }
      
      // Определяем уровень серьезности конфликта
      let severity = 'none';
      if (fieldConflicts.length > 0) {
          severity = fieldConflicts.length > 2 ? 'medium' : 'low';
      }
      
      // Возвращаем информацию о конфликте
      return {
          entityId,
          entityType,
          severity,
          fieldConflicts,
          previousData,
          currentData,
          lastKnownData
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Ошибка в функции detectConflict:', error);
      }
      
      // Возвращаем базовый объект в случае ошибки
      return {
          entityId, 
          entityType, 
          severity: 'none',
          fieldConflicts: [],
          error: error.message
      };
    }
  }, []);

  const createConflict = useCallback((entity, entityId, local, server, base = null) => {
    const conflictId = generateConflictId();
    const fieldConflicts = detectFieldConflicts(local, server, base);
    
    const maxSeverity = fieldConflicts.reduce((max, conflict) => {
      const severityOrder = Object.values(SEVERITY_LEVELS);
      const currentIndex = severityOrder.indexOf(conflict.severity);
      const maxIndex = severityOrder.indexOf(max);
      return currentIndex > maxIndex ? conflict.severity : max;
    }, SEVERITY_LEVELS.LOW);
    
    const conflict = {
      id: conflictId,
      entity,
      entityId,
      type: fieldConflicts.length > 1 ? CONFLICT_TYPES.CONCURRENT_EDIT : fieldConflicts[0]?.type,
      severity: maxSeverity,
      local,
      server,
      base,
      fieldConflicts,
      timestamp: Date.now(),
      resolved: false,
      resolution: null,
      strategy: null,
      resolvedAt: null,
      resolvedBy: null,
      attempts: 0
    };
    
    const typeCount = conflictMetrics.conflictsByType[conflict.type] || 0;
    const severityCount = conflictMetrics.conflictsBySeverity[conflict.severity] || 0;
    
    updateMetrics({
      totalConflicts: conflictMetrics.totalConflicts + 1,
      conflictsByType: {
        ...conflictMetrics.conflictsByType,
        [conflict.type]: typeCount + 1
      },
      conflictsBySeverity: {
        ...conflictMetrics.conflictsBySeverity,
        [conflict.severity]: severityCount + 1
      }
    });
    
    log('info', 'Conflict detected', { conflict });
    
    return conflict;
  }, [
    generateConflictId, 
    detectFieldConflicts, 
    conflictMetrics.totalConflicts,
    conflictMetrics.conflictsByType,
    conflictMetrics.conflictsBySeverity,
    updateMetrics, 
    log
  ]);

  const autoResolveConflict = useCallback((conflict, strategy = mergedConfig.defaultStrategy) => {
    const { local, server, base, fieldConflicts } = conflict;
    let resolved = null;
    
    switch (strategy) {
      case RESOLUTION_STRATEGIES.CLIENT_WINS:
        resolved = { ...local };
        break;
        
      case RESOLUTION_STRATEGIES.SERVER_WINS:
        resolved = { ...server };
        break;
        
      case RESOLUTION_STRATEGIES.MERGE_FIELDS:
        resolved = { ...server, ...local };
        fieldConflicts.forEach(fieldConflict => {
          if (fieldConflict.severity === SEVERITY_LEVELS.LOW) {
            const useLocal = (local?._lastModified || 0) > (server?._lastModified || 0);
            resolved[fieldConflict.field] = useLocal ? fieldConflict.local : fieldConflict.server;
          }
        });
        break;
        
      case RESOLUTION_STRATEGIES.NEWEST_WINS:
        const localTime = local?.lastModified || local?.updatedAt || 0;
        const serverTime = server?.lastModified || server?.updatedAt || 0;
        resolved = localTime > serverTime ? { ...local } : { ...server };
        break;
        
      case RESOLUTION_STRATEGIES.THREE_WAY_MERGE:
        if (base) {
          resolved = { ...base };
          Object.keys(local || {}).forEach(key => {
            if (JSON.stringify(local[key]) !== JSON.stringify(base[key]) &&
                JSON.stringify(server[key]) === JSON.stringify(base[key])) {
              resolved[key] = local[key];
            }
          });
          Object.keys(server || {}).forEach(key => {
            if (JSON.stringify(server[key]) !== JSON.stringify(base[key]) &&
                JSON.stringify(local[key]) === JSON.stringify(base[key])) {
              resolved[key] = server[key];
            }
          });
        } else {
          resolved = { ...server, ...local };
        }
        break;
        
      case RESOLUTION_STRATEGIES.PRIORITY_BASED:
        const userPriority = appState.auth?.user?.priority || 0;
        const serverPriority = server?._priority || 0;
        resolved = userPriority >= serverPriority ? { ...local } : { ...server };
        break;
        
      case RESOLUTION_STRATEGIES.CUSTOM:
        const customResolver = customResolversRef.current.get(conflict.entity);
        if (customResolver) {
          resolved = customResolver(conflict);
        } else {
          log('warn', 'No custom resolver found', { entity: conflict.entity });
          return null;
        }
        break;
        
      default:
        log('warn', 'Unknown resolution strategy', { strategy });
        return null;
    }
    
    if (resolved) {
      resolved._resolvedAt = Date.now();
      resolved._resolutionStrategy = strategy;
      resolved._conflictId = conflict.id;
    }
    
    return resolved;
  }, [mergedConfig.defaultStrategy, appState.auth, log]);

  const resolveConflict = useCallback((conflictId, strategy, customData = null) => {
    setActiveConflicts(prev => {
      const conflict = prev.get(conflictId);
      if (!conflict) {
        log('warn', 'Conflict not found', { conflictId });
        return prev;
      }
      
      let resolvedData = customData;
      
      if (!resolvedData && strategy !== RESOLUTION_STRATEGIES.MANUAL) {
        resolvedData = autoResolveConflict(conflict, strategy);
      }
      
      if (!resolvedData && strategy === RESOLUTION_STRATEGIES.MANUAL) {
        resolvedData = customData || conflict.local;
      }
      
      const resolvedConflict = {
        ...conflict,
        resolved: true,
        resolution: resolvedData,
        strategy,
        resolvedAt: Date.now(),
        resolvedBy: strategy === RESOLUTION_STRATEGIES.MANUAL ? 'user' : 'auto',
        resolutionTime: Date.now() - conflict.timestamp
      };
      
      const isAuto = strategy !== RESOLUTION_STRATEGIES.MANUAL;
      const newAvgTime = (conflictMetrics.avgResolutionTime * conflictMetrics.resolvedConflicts + 
                         resolvedConflict.resolutionTime) / (conflictMetrics.resolvedConflicts + 1);
      
      updateMetrics({
        resolvedConflicts: conflictMetrics.resolvedConflicts + 1,
        autoResolutions: conflictMetrics.autoResolutions + (isAuto ? 1 : 0),
        manualResolutions: conflictMetrics.manualResolutions + (isAuto ? 0 : 1),
        avgResolutionTime: newAvgTime
      });
      
      setConflictHistory(prevHistory => {
        const newHistory = [...prevHistory, resolvedConflict];
        return newHistory.slice(-mergedConfig.maxConflictHistory);
      });
      
      if (resolutionTimersRef.current.has(conflictId)) {
        clearTimeout(resolutionTimersRef.current.get(conflictId));
        resolutionTimersRef.current.delete(conflictId);
      }
      
      dispatch({
        type: 'CONFLICT_RESOLVED',
        payload: {
          entity: conflict.entity,
          entityId: conflict.entityId,
          conflictId,
          resolution: resolvedData,
          strategy
        }
      });
      
      log('info', 'Conflict resolved', { 
        conflictId, 
        strategy, 
        resolutionTime: resolvedConflict.resolutionTime 
      });
      
      const updated = new Map(prev);
      updated.delete(conflictId);
      return updated;
    });
  }, [
    autoResolveConflict,
    conflictMetrics.avgResolutionTime,
    conflictMetrics.resolvedConflicts,
    conflictMetrics.autoResolutions,
    conflictMetrics.manualResolutions,
    updateMetrics,
    mergedConfig.maxConflictHistory,
    dispatch,
    log
  ]);

  const registerConflict = useCallback((entity, entityId, local, server, base = null) => {
    const conflict = createConflict(entity, entityId, local, server, base);
    
    setActiveConflicts(prev => new Map(prev).set(conflict.id, conflict));
    
    if (mergedConfig.conflictTimeout > 0) {
      resolutionTimersRef.current.set(conflict.id, setTimeout(() => {
        log('warn', 'Conflict resolution timeout', { conflictId: conflict.id });
        resolveConflict(conflict.id, RESOLUTION_STRATEGIES.SERVER_WINS);
      }, mergedConfig.conflictTimeout));
    }
    
    if (conflict.severity <= mergedConfig.autoResolveThreshold && 
        conflictMetrics.autoResolutions < mergedConfig.maxAutoResolutions) {
      
      setTimeout(() => {
        resolveConflict(conflict.id, mergedConfig.defaultStrategy);
      }, 1000);
    }
    
    if (mergedConfig.showNotifications) {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'warning',
          title: 'Conflict Detected',
          message: `Data conflict detected for ${entity} (ID: ${entityId})`,
          actions: [
            {
              label: 'Resolve',
              action: () => resolveConflict(conflict.id, RESOLUTION_STRATEGIES.MANUAL)
            }
          ]
        }
      });
    }
    
    return conflict.id;
  }, [
    createConflict,
    mergedConfig.conflictTimeout,
    mergedConfig.autoResolveThreshold,
    mergedConfig.maxAutoResolutions,
    mergedConfig.defaultStrategy,
    mergedConfig.showNotifications,
    conflictMetrics.autoResolutions,
    resolveConflict,
    dispatch,
    log
  ]);

  const registerCustomResolver = useCallback((entity, resolver) => {
    customResolversRef.current.set(entity, resolver);
    log('info', 'Custom resolver registered', { entity });
  }, [log]);

  const addConflictRule = useCallback((rule) => {
    conflictRulesRef.current.push(rule);
    log('info', 'Conflict rule added');
  }, [log]);

  const checkForConflicts = useCallback((entity, data) => {
    if (!mergedConfig.enableAutoDetection) return [];
    
    const conflicts = [];
    const entityData = appState.data[entity] || {};
    
    Object.keys(data).forEach(id => {
      const local = data[id];
      const server = entityData[id];
      
      if (server && !deepCompare(local, server, mergedConfig.ignoreFields)) {
        const conflictId = registerConflict(entity, id, local, server);
        conflicts.push(conflictId);
      }
    });
    
    return conflicts;
  }, [
    mergedConfig.enableAutoDetection,
    mergedConfig.ignoreFields,
    appState.data,
    deepCompare,
    registerConflict
  ]);

  const batchResolveConflicts = useCallback((conflictIds, strategy) => {
    const results = [];
    
    conflictIds.forEach(conflictId => {
      try {
        resolveConflict(conflictId, strategy);
        results.push({ conflictId, success: true });
      } catch (error) {
        results.push({ conflictId, success: false, error });
        log('error', 'Failed to resolve conflict in batch', { conflictId, error });
      }
    });
    
    log('info', `Batch resolved ${results.length} conflicts`, { strategy });
    return results;
  }, [resolveConflict, log]);

  const getConflictsByCriteria = useCallback((criteria = {}) => {
    const conflicts = Array.from(activeConflicts.values());
    
    return conflicts.filter(conflict => {
      if (criteria.entity && conflict.entity !== criteria.entity) return false;
      if (criteria.severity && conflict.severity !== criteria.severity) return false;
      if (criteria.type && conflict.type !== criteria.type) return false;
      if (criteria.resolved !== undefined && conflict.resolved !== criteria.resolved) return false;
      return true;
    });
  }, [activeConflicts]);

  useEffect(() => {
    return () => {
      resolutionTimersRef.current.forEach(timer => clearTimeout(timer));
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return useMemo(() => ({
    // Core functionality
    registerConflict,
    resolveConflict,
    checkForConflicts,
    batchResolveConflicts,
    
    // Configuration
    registerCustomResolver,
    addConflictRule,
    
    // State
    activeConflicts: Array.from(activeConflicts.values()),
    conflictHistory,
    resolutionQueue,
    
    // Queries
    getConflictsByCriteria,
    getConflictById: (id) => activeConflicts.get(id),
    hasConflicts: activeConflicts.size > 0,
    conflictCount: activeConflicts.size,
    
    // Metrics
    metrics: conflictMetrics,
    
    // Constants
    CONFLICT_TYPES,
    RESOLUTION_STRATEGIES,
    SEVERITY_LEVELS,
    
    // Configuration
    config: mergedConfig
  }), [
    registerConflict,
    resolveConflict,
    checkForConflicts,
    batchResolveConflicts,
    registerCustomResolver,
    addConflictRule,
    activeConflicts,
    conflictHistory,
    resolutionQueue,
    getConflictsByCriteria,
    conflictMetrics,
    mergedConfig
  ]);
};

export default useConflictResolution; 
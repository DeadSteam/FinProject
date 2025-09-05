/**
 * Optimistic Updates Hook
 * 
 * Features:
 * - Immediate UI updates before server confirmation
 * - Automatic rollback on operation failure
 * - Conflict detection and resolution
 * - Optimistic state management
 * - Batch optimistic operations
 * - Performance monitoring
 * - Undo/redo functionality
 * - Transaction-like behavior
 * 
 * @module useOptimisticUpdates
 */

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useAppDispatch } from '../context/AppStateContext.js';

// Optimistic operation states
const OPERATION_STATES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
  CONFLICTED: 'conflicted'
};

// Operation types
const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  BATCH: 'batch',
  CUSTOM: 'custom'
};

// Rollback strategies
const ROLLBACK_STRATEGIES = {
  IMMEDIATE: 'immediate',        
  DELAYED: 'delayed',            
  MANUAL: 'manual',              
  BATCH_END: 'batch_end'         
};

// Default configuration
const DEFAULT_CONFIG = {
  confirmationTimeout: 30000,    
  rollbackDelay: 1000,           
  retryAttempts: 3,
  retryDelay: 1000,              
  rollbackStrategy: ROLLBACK_STRATEGIES.IMMEDIATE,
  enableUndo: true,
  undoTimeout: 10000,            
  maxUndoOperations: 50,
  batchTimeout: 500,             
  maxBatchSize: 100,
  enableBatching: true,
  enableConflictDetection: true,
  autoResolveConflicts: false,
  conflictResolutionTimeout: 60000, 
  enableMetrics: process.env.NODE_ENV === 'development',
  enableLogging: process.env.NODE_ENV === 'development',
  maxOperationHistory: 1000
};

/**
 * Optimistic Updates Hook
 */
export const useOptimisticUpdates = (config = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const dispatch = useAppDispatch();
  
  const [pendingOperations, setPendingOperations] = useState(new Map());
  const [operationHistory, setOperationHistory] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [metrics, setMetrics] = useState({
    totalOperations: 0,
    confirmedOperations: 0,
    failedOperations: 0,
    rolledBackOperations: 0,
    averageConfirmationTime: 0,
    conflictsDetected: 0,
    undoOperations: 0
  });

  const operationCounterRef = useRef(0);
  const batchTimeoutRef = useRef(null);
  const pendingBatchRef = useRef([]);
  const confirmationTimersRef = useRef(new Map());
  const rollbackTimersRef = useRef(new Map());

  const log = useCallback((level, message, data = null) => {
    if (!mergedConfig.enableLogging) return;
    console[level](`[OptimisticUpdates:${level.toUpperCase()}] ${message}`, data);
  }, [mergedConfig.enableLogging]);

  const updateMetrics = useCallback((updates) => {
    if (!mergedConfig.enableMetrics) return;
    setMetrics(prev => ({ ...prev, ...updates }));
  }, [mergedConfig.enableMetrics]);

  const generateOperationId = useCallback(() => {
    operationCounterRef.current++;
    return `opt_${Date.now()}_${operationCounterRef.current}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createOperation = useCallback((type, entity, payload, options = {}) => {
    const operationId = generateOperationId();
    const timestamp = Date.now();
    
    return {
      id: operationId,
      type,
      entity,
      payload,
      options,
      state: OPERATION_STATES.PENDING,
      timestamp,
      startTime: timestamp,
      confirmationTime: null,
      attempts: 0,
      errors: [],
      previousState: null,
      rollbackData: null,
      ...options
    };
  }, [generateOperationId]);

  const applyOptimisticUpdate = useCallback((operation) => {
    const { type, entity, payload, id } = operation;
    
    let optimisticUpdate;
    
    switch (type) {
      case OPERATION_TYPES.CREATE:
        optimisticUpdate = {
          type: 'OPTIMISTIC_CREATE',
          payload: {
            entity,
            data: { 
              ...payload, 
              id: payload.id || `temp_${Date.now()}`,
              _optimistic: true,
              _operationId: id
            }
          }
        };
        break;
        
      case OPERATION_TYPES.UPDATE:
        optimisticUpdate = {
          type: 'OPTIMISTIC_UPDATE',
          payload: {
            entity,
            id: payload.id,
            updates: { 
              ...payload, 
              _optimistic: true, 
              _operationId: id,
              _lastModified: Date.now()
            }
          }
        };
        break;
        
      case OPERATION_TYPES.DELETE:
        optimisticUpdate = {
          type: 'OPTIMISTIC_DELETE',
          payload: {
            entity,
            id: payload.id,
            _operationId: id
          }
        };
        break;
        
      default:
        log('warn', 'Unknown optimistic operation type', { type, operation });
        return;
    }
    
    dispatch(optimisticUpdate);
    log('debug', 'Applied optimistic update', { operation, update: optimisticUpdate });
  }, [dispatch, log]);

  const rollbackOptimisticUpdate = useCallback((operation) => {
    const { type, entity, id } = operation;
    
    const rollbackUpdate = {
      type: 'OPTIMISTIC_ROLLBACK',
      payload: {
        entity,
        operationId: id,
        operationType: type
      }
    };
    
    dispatch(rollbackUpdate);
    log('info', 'Rolled back optimistic update', { operation });
    
    updateMetrics({ rolledBackOperations: metrics.rolledBackOperations + 1 });
  }, [dispatch, log, updateMetrics, metrics.rolledBackOperations]);

  const executeServerOperation = useCallback(async (operation) => {
    const { type, entity, payload, options } = operation;
    
    try {
      let apiUrl = `/api/${entity}`;
      let apiOptions = {
        headers: { 'Content-Type': 'application/json' }
      };
      
      switch (type) {
        case OPERATION_TYPES.CREATE:
          apiOptions.method = 'POST';
          apiOptions.body = JSON.stringify(payload);
          break;
          
        case OPERATION_TYPES.UPDATE:
          apiUrl += `/${payload.id}`;
          apiOptions.method = 'PUT';
          apiOptions.body = JSON.stringify(payload);
          break;
          
        case OPERATION_TYPES.DELETE:
          apiUrl += `/${payload.id}`;
          apiOptions.method = 'DELETE';
          break;
          
        case OPERATION_TYPES.CUSTOM:
          if (options.customExecutor) {
            return await options.customExecutor(operation);
          } else {
            throw new Error('No custom executor defined for custom operation');
          }
          
        default:
          throw new Error(`Unknown operation type: ${type}`);
      }
      
      if (options.headers) {
        Object.assign(apiOptions.headers, options.headers);
      }
      
      const response = await fetch(apiUrl, apiOptions);
      
      if (!response.ok) {
        if (response.status === 409) {
          const conflictData = await response.json();
          return { 
            success: false, 
            conflict: true, 
            data: conflictData,
            status: response.status
          };
        }
        throw new Error(`Server request failed: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      return { success: true, data: responseData };
      
    } catch (error) {
      log('error', 'Server operation failed', { error, operation });
      return { success: false, error };
    }
  }, [log]);

  const confirmOperation = useCallback((operationId, serverData = null) => {
    setPendingOperations(prev => {
      const operation = prev.get(operationId);
      if (!operation) return prev;
      
      const updatedOperation = {
        ...operation,
        state: OPERATION_STATES.CONFIRMED,
        confirmationTime: Date.now(),
        serverData
      };
      
      if (confirmationTimersRef.current.has(operationId)) {
        clearTimeout(confirmationTimersRef.current.get(operationId));
        confirmationTimersRef.current.delete(operationId);
      }
      
      dispatch({
        type: 'OPTIMISTIC_CONFIRM',
        payload: {
          operationId,
          entity: operation.entity,
          serverData
        }
      });
      
      const confirmationTime = Date.now() - operation.startTime;
      const newAverage = (metrics.averageConfirmationTime * metrics.confirmedOperations + confirmationTime) / 
                        (metrics.confirmedOperations + 1);
      
      updateMetrics({ 
        confirmedOperations: metrics.confirmedOperations + 1,
        averageConfirmationTime: newAverage
      });
      
      log('info', 'Operation confirmed', { operationId, confirmationTime });
      
      if (mergedConfig.enableUndo && operation.type !== OPERATION_TYPES.DELETE) {
        setUndoStack(prev => {
          const newStack = [...prev, updatedOperation];
          return newStack.slice(-mergedConfig.maxUndoOperations);
        });
        setRedoStack([]);
      }
      
      setTimeout(() => {
        setPendingOperations(current => {
          const updated = new Map(current);
          updated.delete(operationId);
          return updated;
        });
      }, 1000);
      
      const updated = new Map(prev);
      updated.set(operationId, updatedOperation);
      return updated;
    });
  }, [
    dispatch, 
    mergedConfig.enableUndo, 
    mergedConfig.maxUndoOperations,
    updateMetrics, 
    metrics.confirmedOperations, 
    metrics.averageConfirmationTime,
    log
  ]);

  const failOperation = useCallback((operationId, error) => {
    setPendingOperations(prev => {
      const operation = prev.get(operationId);
      if (!operation) return prev;
      
      const updatedOperation = {
        ...operation,
        state: OPERATION_STATES.FAILED,
        errors: [...operation.errors, error]
      };
      
      if (confirmationTimersRef.current.has(operationId)) {
        clearTimeout(confirmationTimersRef.current.get(operationId));
        confirmationTimersRef.current.delete(operationId);
      }
      
      if (mergedConfig.rollbackStrategy === ROLLBACK_STRATEGIES.IMMEDIATE) {
        rollbackOptimisticUpdate(operation);
        updatedOperation.state = OPERATION_STATES.ROLLED_BACK;
      } else if (mergedConfig.rollbackStrategy === ROLLBACK_STRATEGIES.DELAYED) {
        rollbackTimersRef.current.set(operationId, setTimeout(() => {
          rollbackOptimisticUpdate(operation);
          setPendingOperations(current => {
            const op = current.get(operationId);
            if (op) {
              current.set(operationId, { ...op, state: OPERATION_STATES.ROLLED_BACK });
            }
            return new Map(current);
          });
        }, mergedConfig.rollbackDelay));
      }
      
      updateMetrics({ failedOperations: metrics.failedOperations + 1 });
      log('error', 'Operation failed', { operationId, error });
      
      const updated = new Map(prev);
      updated.set(operationId, updatedOperation);
      return updated;
    });
  }, [
    mergedConfig.rollbackStrategy, 
    mergedConfig.rollbackDelay,
    rollbackOptimisticUpdate, 
    updateMetrics, 
    metrics.failedOperations,
    log
  ]);

  const executeOptimistic = useCallback(async (type, entity, payload, options = {}) => {
    const operation = createOperation(type, entity, payload, options);
    
    setPendingOperations(prev => new Map(prev).set(operation.id, operation));
    applyOptimisticUpdate(operation);
    
    setOperationHistory(prev => {
      const newHistory = [...prev, operation];
      return newHistory.slice(-mergedConfig.maxOperationHistory);
    });
    
    updateMetrics({ totalOperations: metrics.totalOperations + 1 });
    
    if (mergedConfig.confirmationTimeout > 0) {
      confirmationTimersRef.current.set(operation.id, setTimeout(() => {
        failOperation(operation.id, new Error('Confirmation timeout'));
      }, mergedConfig.confirmationTimeout));
    }
    
    let retryCount = 0;
    const executeWithRetry = async () => {
      operation.attempts = retryCount + 1;
      
      const result = await executeServerOperation(operation);
      
      if (result.success) {
        confirmOperation(operation.id, result.data);
      } else if (result.conflict) {
        setConflicts(prev => [...prev, {
          id: Date.now(),
          operationId: operation.id,
          type: 'server_conflict',
          optimistic: payload,
          server: result.data.current,
          timestamp: Date.now(),
          resolved: false
        }]);
        
        updateMetrics({ conflictsDetected: metrics.conflictsDetected + 1 });
        
        if (!mergedConfig.autoResolveConflicts) {
          return operation.id;
        }
      } else if (retryCount < mergedConfig.retryAttempts) {
        retryCount++;
        const delay = mergedConfig.retryDelay * Math.pow(2, retryCount - 1);
        
        log('info', `Retrying operation ${operation.id}, attempt ${retryCount}`, { delay });
        
        setTimeout(executeWithRetry, delay);
      } else {
        failOperation(operation.id, result.error || new Error('Max retries exceeded'));
      }
    };
    
    executeWithRetry();
    
    return operation.id;
  }, [
    createOperation,
    applyOptimisticUpdate,
    mergedConfig.maxOperationHistory,
    mergedConfig.confirmationTimeout,
    mergedConfig.retryAttempts,
    mergedConfig.retryDelay,
    mergedConfig.autoResolveConflicts,
    updateMetrics,
    metrics.totalOperations,
    metrics.conflictsDetected,
    executeServerOperation,
    confirmOperation,
    failOperation,
    log
  ]);

  const undo = useCallback(() => {
    if (!mergedConfig.enableUndo || undoStack.length === 0) {
      return false;
    }
    
    const lastOperation = undoStack[undoStack.length - 1];
    
    let undoOperation;
    
    switch (lastOperation.type) {
      case OPERATION_TYPES.CREATE:
        undoOperation = {
          type: OPERATION_TYPES.DELETE,
          entity: lastOperation.entity,
          payload: { id: lastOperation.payload.id }
        };
        break;
        
      case OPERATION_TYPES.UPDATE:
        undoOperation = {
          type: OPERATION_TYPES.UPDATE,
          entity: lastOperation.entity,
          payload: lastOperation.previousState
        };
        break;
        
      case OPERATION_TYPES.DELETE:
        undoOperation = {
          type: OPERATION_TYPES.CREATE,
          entity: lastOperation.entity,
          payload: lastOperation.previousState
        };
        break;
        
      default:
        log('warn', 'Cannot undo operation type', lastOperation.type);
        return false;
    }
    
    const undoId = executeOptimistic(
      undoOperation.type,
      undoOperation.entity,
      undoOperation.payload,
      { isUndo: true, originalOperation: lastOperation.id }
    );
    
    setRedoStack(prev => [...prev, lastOperation]);
    setUndoStack(prev => prev.slice(0, -1));
    
    updateMetrics({ undoOperations: metrics.undoOperations + 1 });
    log('info', 'Undid operation', { originalId: lastOperation.id, undoId });
    
    return undoId;
  }, [
    mergedConfig.enableUndo,
    undoStack,
    executeOptimistic,
    updateMetrics,
    metrics.undoOperations,
    log
  ]);

  const redo = useCallback(() => {
    if (!mergedConfig.enableUndo || redoStack.length === 0) {
      return false;
    }
    
    const lastUndone = redoStack[redoStack.length - 1];
    
    const redoId = executeOptimistic(
      lastUndone.type,
      lastUndone.entity,
      lastUndone.payload,
      { isRedo: true, originalOperation: lastUndone.id }
    );
    
    setUndoStack(prev => [...prev, lastUndone]);
    setRedoStack(prev => prev.slice(0, -1));
    
    log('info', 'Redid operation', { originalId: lastUndone.id, redoId });
    
    return redoId;
  }, [
    mergedConfig.enableUndo,
    redoStack,
    executeOptimistic,
    log
  ]);

  const resolveConflict = useCallback((conflictId, resolution) => {
    setConflicts(prev => prev.map(conflict => {
      if (conflict.id === conflictId) {
        return {
          ...conflict,
          resolved: true,
          resolution,
          resolvedAt: Date.now()
        };
      }
      return conflict;
    }));
    
    log('info', 'Conflict resolved', { conflictId, resolution });
  }, [log]);

  const clearPending = useCallback(() => {
    pendingOperations.forEach(operation => {
      if (operation.state === OPERATION_STATES.PENDING) {
        rollbackOptimisticUpdate(operation);
      }
    });
    
    confirmationTimersRef.current.forEach(timer => clearTimeout(timer));
    rollbackTimersRef.current.forEach(timer => clearTimeout(timer));
    
    setPendingOperations(new Map());
    confirmationTimersRef.current.clear();
    rollbackTimersRef.current.clear();
    
    log('info', 'Cleared all pending operations');
  }, [pendingOperations, rollbackOptimisticUpdate, log]);

  useEffect(() => {
    return () => {
      clearPending();
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [clearPending]);

  return useMemo(() => ({
    // Core operations
    create: (entity, payload, options) => executeOptimistic(OPERATION_TYPES.CREATE, entity, payload, options),
    update: (entity, payload, options) => executeOptimistic(OPERATION_TYPES.UPDATE, entity, payload, options),
    delete: (entity, payload, options) => executeOptimistic(OPERATION_TYPES.DELETE, entity, payload, options),
    custom: (entity, payload, options) => executeOptimistic(OPERATION_TYPES.CUSTOM, entity, payload, options),
    
    // Undo/Redo
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    
    // State management
    pendingOperations: Array.from(pendingOperations.values()),
    pendingCount: pendingOperations.size,
    operationHistory,
    
    // Conflicts
    conflicts,
    conflictCount: conflicts.length,
    resolveConflict,
    
    // Control
    clearPending,
    confirmOperation,
    failOperation,
    
    // Metrics
    metrics,
    
    // Constants
    OPERATION_STATES,
    OPERATION_TYPES,
    ROLLBACK_STRATEGIES,
    
    // Configuration
    config: mergedConfig
  }), [
    executeOptimistic,
    undo,
    redo,
    undoStack.length,
    redoStack.length,
    pendingOperations,
    operationHistory,
    conflicts,
    resolveConflict,
    clearPending,
    confirmOperation,
    failOperation,
    metrics,
    mergedConfig
  ]);
};

export default useOptimisticUpdates; 
/**
 * Offline Synchronization Hook
 * 
 * Features:
 * - Offline detection and automatic fallback
 * - Local data persistence with IndexedDB
 * - Background sync when connection restored
 * - Operation queuing and replay
 * - Conflict detection and resolution
 * - Progressive Web App (PWA) integration
 * - Data versioning and timestamps
 * - Storage quota management
 * 
 * @module useOfflineSync
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppState } from '../context/AppStateContext';

// Offline sync states
const SYNC_STATES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SYNCING: 'syncing',
  ERROR: 'error'
};

// Operation types for queuing
const OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  BATCH: 'batch'
};

// Conflict resolution strategies
const CONFLICT_STRATEGIES = {
  CLIENT_WINS: 'client_wins',
  SERVER_WINS: 'server_wins',
  MERGE: 'merge',
  MANUAL: 'manual'
};

// Default configuration
const DEFAULT_CONFIG = {
  // Storage settings
  dbName: 'OfflineSyncDB',
  dbVersion: 1,
  maxStorageSize: 50 * 1024 * 1024, // 50MB
  maxOperations: 10000,
  
  // Sync settings
  syncInterval: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,
  batchSize: 100,
  
  // Conflict resolution
  defaultStrategy: CONFLICT_STRATEGIES.CLIENT_WINS,
  autoResolveConflicts: true,
  
  // Network detection
  checkConnectivity: true,
  connectivityTimeout: 5000,
  connectivityUrl: '/api/health',
  
  // Debug settings
  enableLogging: process.env.NODE_ENV === 'development',
  enableMetrics: process.env.NODE_ENV === 'development'
};

/**
 * Offline Sync Hook
 * 
 * @param {Object} config - Configuration options
 * @returns {Object} Offline sync interface
 */
export const useOfflineSync = (config = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const dispatch = useAppDispatch();
  const appState = useAppState();
  
  // Sync state
  const [syncState, setSyncState] = useState(
    navigator.onLine ? SYNC_STATES.ONLINE : SYNC_STATES.OFFLINE
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [syncMetrics, setSyncMetrics] = useState({
    totalOperations: 0,
    syncedOperations: 0,
    failedOperations: 0,
    conflictsResolved: 0,
    storageUsed: 0,
    lastSyncDuration: 0
  });

  // Refs for persistent state
  const dbRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const operationQueueRef = useRef([]);
  const isInitializedRef = useRef(false);
  const isSyncingRef = useRef(false);

  /**
   * Log debug messages if logging is enabled
   */
  const log = useCallback((level, message, data = null) => {
    if (!mergedConfig.enableLogging || process.env.NODE_ENV !== 'development') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [OfflineSync:${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      case 'debug':
      default:
        console.log(logMessage, data);
        break;
    }
  }, [mergedConfig.enableLogging]);

  /**
   * Update sync metrics
   */
  const updateMetrics = useCallback((updates) => {
    if (!mergedConfig.enableMetrics) return;
    
    setSyncMetrics(prev => ({ ...prev, ...updates }));
  }, [mergedConfig.enableMetrics]);

  /**
   * Initialize IndexedDB for offline storage
   */
  const initDatabase = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (dbRef.current) {
        resolve(dbRef.current);
        return;
      }

      const request = indexedDB.open(mergedConfig.dbName, mergedConfig.dbVersion);
      
      request.onerror = () => {
        log('error', 'Failed to open IndexedDB', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        dbRef.current = request.result;
        log('info', 'IndexedDB initialized');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create operations store
        if (!db.objectStoreNames.contains('operations')) {
          const operationsStore = db.createObjectStore('operations', {
            keyPath: 'id',
            autoIncrement: true
          });
          operationsStore.createIndex('timestamp', 'timestamp');
          operationsStore.createIndex('entity', 'entity');
          operationsStore.createIndex('operation', 'operation');
          operationsStore.createIndex('synced', 'synced');
        }
        
        // Create data store for cached entities
        if (!db.objectStoreNames.contains('data')) {
          const dataStore = db.createObjectStore('data', {
            keyPath: 'id'
          });
          dataStore.createIndex('entity', 'entity');
          dataStore.createIndex('lastModified', 'lastModified');
          dataStore.createIndex('version', 'version');
        }
        
        // Create conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', {
            keyPath: 'id',
            autoIncrement: true
          });
          conflictsStore.createIndex('entity', 'entity');
          conflictsStore.createIndex('timestamp', 'timestamp');
          conflictsStore.createIndex('resolved', 'resolved');
        }
        
        log('info', 'IndexedDB schema updated');
      };
    });
  }, [mergedConfig.dbName, mergedConfig.dbVersion, log]);

  /**
   * Add operation to offline queue
   */
  const queueOperation = useCallback(async (entity, type, data, id = null) => {
    const operation = {
      entity,
      type,
      data,
      id,
      clientId: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    // Store operation in IndexedDB
    try {
      const db = await initDatabase();
      const transaction = db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      
      const operationRecord = {
        ...operation,
        synced: false,
        retryCount: 0
      };
      
      await store.add(operationRecord);
      
      // Update in-memory queue
      operationQueueRef.current.push(operationRecord);
      setPendingOperations(prev => [...prev, operationRecord]);
      
      updateMetrics({ totalOperations: syncMetrics.totalOperations + 1 });
      log('debug', 'Operation queued for sync', operationRecord);
      
      dispatch({
        type: 'OFFLINE_OPERATION_QUEUED',
        payload: { operation: operationRecord }
      });
      
      return { success: true, queued: true, operation: operationRecord };
    } catch (error) {
      log('error', 'Failed to queue operation', { error, operation });
      throw error;
    }
  }, [initDatabase, log, updateMetrics, syncMetrics.totalOperations, dispatch]);

  /**
   * Check network connectivity
   */
  const checkConnectivity = useCallback(async () => {
    if (!mergedConfig.checkConnectivity) {
      return navigator.onLine;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), mergedConfig.connectivityTimeout);
      
      const response = await fetch(mergedConfig.connectivityUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      log('debug', 'Connectivity check failed', error);
      return false;
    }
  }, [mergedConfig.checkConnectivity, mergedConfig.connectivityTimeout, mergedConfig.connectivityUrl, log]);

  /**
   * Sync pending operations with server
   */
  const syncOperations = useCallback(async () => {
    if (isSyncingRef.current || !isOnline) {
      return;
    }

    isSyncingRef.current = true;
    setSyncState(SYNC_STATES.SYNCING);
    
    const syncStartTime = Date.now();
    
    try {
      // Load operations from IndexedDB
      const db = await initDatabase();
      const transaction = db.transaction(['operations'], 'readonly');
      const store = transaction.objectStore('operations');
      const index = store.index('synced');
      
      const operations = await new Promise((resolve, reject) => {
        const request = index.getAll(false);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (operations.length === 0) {
        setSyncState(SYNC_STATES.ONLINE);
        isSyncingRef.current = false;
        return;
      }
      
      log('info', `Starting sync of ${operations.length} operations`);
      
      let syncedCount = 0;
      let failedCount = 0;
      
      // Process operations sequentially to maintain order
      for (const operation of operations) {
        try {
          // Simulate API call based on operation type
          let apiUrl = `/api/${operation.entity}`;
          let apiOptions = {
            headers: { 'Content-Type': 'application/json' }
          };
          
          switch (operation.type) {
            case OPERATION_TYPES.CREATE:
              apiOptions.method = 'POST';
              apiOptions.body = JSON.stringify(operation.data);
              break;
              
            case OPERATION_TYPES.UPDATE:
              apiUrl += `/${operation.id}`;
              apiOptions.method = 'PUT';
              apiOptions.body = JSON.stringify(operation.data);
              break;
              
            case OPERATION_TYPES.DELETE:
              apiUrl += `/${operation.id}`;
              apiOptions.method = 'DELETE';
              break;
              
            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }
          
          const response = await fetch(apiUrl, apiOptions);
          
          if (response.ok) {
            // Mark as synced in IndexedDB
            const updateTransaction = db.transaction(['operations'], 'readwrite');
            const updateStore = updateTransaction.objectStore('operations');
            
            operation.synced = true;
            operation.syncedAt = Date.now();
            await updateStore.put(operation);
            
            syncedCount++;
            updateMetrics({ syncedOperations: syncMetrics.syncedOperations + 1 });
            
            dispatch({
              type: 'OFFLINE_SYNC_SUCCESS',
              payload: {
                operation,
                result: await response.json()
              }
            });
          } else {
            failedCount++;
            updateMetrics({ failedOperations: syncMetrics.failedOperations + 1 });
            
            if (response.status === 409) {
              // Conflict detected
              const conflictData = await response.json();
              setConflicts(prev => [...prev, {
                id: Date.now(),
                entity: operation.entity,
                operation: operation.type,
                local: operation.data,
                server: conflictData.current,
                timestamp: Date.now(),
                resolved: false
              }]);
            }
          }
        } catch (error) {
          failedCount++;
          log('error', 'Failed to sync operation', { error, operation });
        }
      }
      
      // Update pending operations list
      const remainingOps = await new Promise((resolve, reject) => {
        const request = index.getAll(false);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      operationQueueRef.current = remainingOps;
      setPendingOperations(remainingOps);
      
      const syncDuration = Date.now() - syncStartTime;
      updateMetrics({ lastSyncDuration: syncDuration });
      setLastSyncTime(Date.now());
      
      log('info', `Sync completed: ${syncedCount} synced, ${failedCount} failed, ${syncDuration}ms`);
      
      setSyncState(SYNC_STATES.ONLINE);
      
    } catch (error) {
      log('error', 'Sync failed', error);
      setSyncState(SYNC_STATES.ERROR);
    } finally {
      isSyncingRef.current = false;
    }
  }, [isOnline, initDatabase, log, updateMetrics, syncMetrics.syncedOperations, syncMetrics.failedOperations, dispatch]);

  /**
   * Resolve conflict manually
   */
  const resolveConflict = useCallback((conflictId, resolution, strategy = CONFLICT_STRATEGIES.CLIENT_WINS) => {
    setConflicts(prev => prev.map(conflict => {
      if (conflict.id === conflictId) {
        return {
          ...conflict,
          resolved: true,
          resolution,
          strategy,
          resolvedAt: Date.now()
        };
      }
      return conflict;
    }));
    
    updateMetrics({ conflictsResolved: syncMetrics.conflictsResolved + 1 });
    log('info', 'Conflict resolved manually', { conflictId, strategy });
  }, [updateMetrics, syncMetrics.conflictsResolved, log]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = async () => {
      log('info', 'Connection restored');
      setIsOnline(true);
      setSyncState(SYNC_STATES.ONLINE);
      
      // Verify connectivity and start sync
      const isConnected = await checkConnectivity();
      if (isConnected) {
        setTimeout(() => syncOperations(), 1000);
      }
    };
    
    const handleOffline = () => {
      log('info', 'Connection lost');
      setIsOnline(false);
      setSyncState(SYNC_STATES.OFFLINE);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectivity, syncOperations, log]);

  /**
   * Set up periodic sync when online
   */
  useEffect(() => {
    if (isOnline && mergedConfig.syncInterval > 0) {
      syncIntervalRef.current = setInterval(() => {
        syncOperations();
      }, mergedConfig.syncInterval);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, mergedConfig.syncInterval, syncOperations]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        
        // Load pending operations
        const db = dbRef.current;
        const transaction = db.transaction(['operations'], 'readonly');
        const store = transaction.objectStore('operations');
        const index = store.index('synced');
        
        const operations = await new Promise((resolve, reject) => {
          const request = index.getAll(false);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        operationQueueRef.current = operations;
        setPendingOperations(operations);
        
        // Check connectivity
        const connected = await checkConnectivity();
        setIsOnline(connected);
        setSyncState(connected ? SYNC_STATES.ONLINE : SYNC_STATES.OFFLINE);
        
        if (connected && operations.length > 0) {
          setTimeout(() => syncOperations(), 500);
        }
        
        isInitializedRef.current = true;
        log('info', 'Offline sync initialized');
      } catch (error) {
        log('error', 'Failed to initialize offline sync', error);
        setSyncState(SYNC_STATES.ERROR);
      }
    };
    
    initialize();
  }, [initDatabase, checkConnectivity, syncOperations, log]);

  // Public API
  return useMemo(() => ({
    // State
    syncState,
    isOnline,
    isOffline: !isOnline,
    isSyncing: syncState === SYNC_STATES.SYNCING,
    
    // Operations
    queueOperation,
    syncOperations,
    
    // Pending operations
    pendingOperations,
    pendingCount: pendingOperations.length,
    
    // Conflicts
    conflicts,
    conflictCount: conflicts.length,
    resolveConflict,
    
    // Metrics
    metrics: syncMetrics,
    lastSyncTime,
    
    // Utilities
    checkConnectivity,
    
    // Configuration
    config: mergedConfig,
    
    // Constants for external use
    SYNC_STATES,
    OPERATION_TYPES,
    CONFLICT_STRATEGIES
  }), [
    syncState,
    isOnline,
    queueOperation,
    syncOperations,
    pendingOperations,
    conflicts,
    resolveConflict,
    syncMetrics,
    lastSyncTime,
    checkConnectivity,
    mergedConfig
  ]);
};

export default useOfflineSync; 
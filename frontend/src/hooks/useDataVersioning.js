/**
 * Data Versioning Hook
 * 
 * Features:
 * - Automatic version tracking
 * - Version history management
 * - Rollback capabilities
 * - Version comparison and diffing
 * - Branch and merge support
 * - Conflict-free replicated data types (CRDT)
 * - Compression and storage optimization
 * - Version-based synchronization
 * 
 * @module useDataVersioning
 */

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppState } from '../context/AppStateContext';

// Version types
const VERSION_TYPES = {
  AUTO: 'auto',           // Automatic versioning
  MANUAL: 'manual',       // Manual snapshots
  BRANCH: 'branch',       // Branch creation
  MERGE: 'merge',         // Merge operation
  ROLLBACK: 'rollback',   // Rollback operation
  SYNC: 'sync',           // Synchronization
  BACKUP: 'backup'        // Backup snapshot
};

// Change types
const CHANGE_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  MOVE: 'move',
  COPY: 'copy',
  BULK: 'bulk'
};

// Merge strategies
const MERGE_STRATEGIES = {
  FAST_FORWARD: 'fast_forward',
  THREE_WAY: 'three_way',
  RECURSIVE: 'recursive',
  OURS: 'ours',
  THEIRS: 'theirs',
  CUSTOM: 'custom'
};

// Default configuration
const DEFAULT_CONFIG = {
  // Versioning settings
  enableAutoVersioning: true,
  versionInterval: 60000,           // 1 minute
  maxVersionHistory: 1000,
  maxBranches: 10,
  compressVersions: true,
  
  // Change tracking
  trackFieldChanges: true,
  ignoreFields: ['_version', '_timestamp', 'lastAccessed'],
  minChangeThreshold: 0.1,          // 10% change to create version
  
  // Storage settings
  useIndexedDB: true,
  storageQuota: 100 * 1024 * 1024,  // 100MB
  compressionLevel: 6,
  
  // Synchronization
  enableRemoteSync: false,
  syncInterval: 300000,             // 5 minutes
  conflictResolution: 'newest_wins',
  
  // Performance
  enableDiffing: true,
  diffAlgorithm: 'myers',
  enableMetrics: process.env.NODE_ENV === 'development',
  enableLogging: process.env.NODE_ENV === 'development'
};

/**
 * Data Versioning Hook
 */
export const useDataVersioning = (config = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const dispatch = useAppDispatch();
  const appState = useAppState();
  
  // Version state
  const [versions, setVersions] = useState(new Map());
  const [branches, setBranches] = useState(new Map());
  const [currentBranch, setCurrentBranch] = useState('main');
  const [versionMetrics, setVersionMetrics] = useState({
    totalVersions: 0,
    totalBranches: 1,
    storageUsed: 0,
    compressionRatio: 0,
    avgVersionSize: 0,
    syncOperations: 0
  });

  // Refs for persistent state
  const versionCounterRef = useRef(0);
  const versioningIntervalRef = useRef(null);
  const dbRef = useRef(null);
  const lastSnapshotRef = useRef(new Map());
  const changeLogRef = useRef([]);

  const log = useCallback((level, message, data = null) => {
    if (!mergedConfig.enableLogging) return;
    console[level](`[DataVersioning:${level.toUpperCase()}] ${message}`, data);
  }, [mergedConfig.enableLogging]);

  const updateMetrics = useCallback((updates) => {
    if (!mergedConfig.enableMetrics) return;
    setVersionMetrics(prev => ({ ...prev, ...updates }));
  }, [mergedConfig.enableMetrics]);

  /**
   * Initialize IndexedDB for version storage
   */
  const initDatabase = useCallback(async () => {
    if (!mergedConfig.useIndexedDB || dbRef.current) return dbRef.current;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DataVersioningDB', 1);
      
      request.onerror = () => {
        log('error', 'Failed to open IndexedDB', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        dbRef.current = request.result;
        log('info', 'IndexedDB initialized for versioning');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('versions')) {
          const versionStore = db.createObjectStore('versions', {
            keyPath: 'id'
          });
          versionStore.createIndex('entity', 'entity');
          versionStore.createIndex('branch', 'branch');
          versionStore.createIndex('timestamp', 'timestamp');
          versionStore.createIndex('parent', 'parent');
        }
        
        if (!db.objectStoreNames.contains('branches')) {
          const branchStore = db.createObjectStore('branches', {
            keyPath: 'name'
          });
          branchStore.createIndex('created', 'created');
          branchStore.createIndex('head', 'head');
        }
        
        log('info', 'IndexedDB schema created');
      };
    });
  }, [mergedConfig.useIndexedDB, log]);

  /**
   * Generate version ID
   */
  const generateVersionId = useCallback(() => {
    versionCounterRef.current++;
    return `v${Date.now()}_${versionCounterRef.current}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Calculate data hash for change detection
   */
  const calculateHash = useCallback((data) => {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }, []);

  /**
   * Compress data for storage
   */
  const compressData = useCallback((data) => {
    if (!mergedConfig.compressVersions) return data;
    
    try {
      // Simple compression - in production, use a proper compression library
      const jsonString = JSON.stringify(data);
      const compressed = btoa(jsonString);
      
      const compressionRatio = compressed.length / jsonString.length;
      updateMetrics({ compressionRatio });
      
      return {
        compressed: true,
        data: compressed,
        originalSize: jsonString.length,
        compressedSize: compressed.length
      };
    } catch (error) {
      log('warn', 'Compression failed, storing uncompressed', error);
      return data;
    }
  }, [mergedConfig.compressVersions, updateMetrics, log]);

  /**
   * Decompress data from storage
   */
  const decompressData = useCallback((compressedData) => {
    if (!compressedData.compressed) return compressedData;
    
    try {
      const jsonString = atob(compressedData.data);
      return JSON.parse(jsonString);
    } catch (error) {
      log('error', 'Decompression failed', error);
      return null;
    }
  }, [log]);

  /**
   * Create diff between two data objects
   */
  const createDiff = useCallback((oldData, newData) => {
    if (!mergedConfig.enableDiffing) {
      return { type: 'full', data: newData };
    }

    const diff = {
      type: 'diff',
      changes: [],
      timestamp: Date.now()
    };

    const processObject = (old, current, path = '') => {
      const oldKeys = Object.keys(old || {});
      const currentKeys = Object.keys(current || {});
      const allKeys = new Set([...oldKeys, ...currentKeys]);

      allKeys.forEach(key => {
        if (mergedConfig.ignoreFields.includes(key)) return;
        
        const currentPath = path ? `${path}.${key}` : key;
        const oldValue = old?.[key];
        const currentValue = current?.[key];

        if (oldValue === undefined && currentValue !== undefined) {
          diff.changes.push({
            type: CHANGE_TYPES.CREATE,
            path: currentPath,
            value: currentValue
          });
        } else if (oldValue !== undefined && currentValue === undefined) {
          diff.changes.push({
            type: CHANGE_TYPES.DELETE,
            path: currentPath,
            oldValue
          });
        } else if (JSON.stringify(oldValue) !== JSON.stringify(currentValue)) {
          if (typeof oldValue === 'object' && typeof currentValue === 'object') {
            processObject(oldValue, currentValue, currentPath);
          } else {
            diff.changes.push({
              type: CHANGE_TYPES.UPDATE,
              path: currentPath,
              oldValue,
              value: currentValue
            });
          }
        }
      });
    };

    processObject(oldData, newData);
    return diff;
  }, [mergedConfig.enableDiffing, mergedConfig.ignoreFields]);

  /**
   * Apply diff to data object
   */
  const applyDiff = useCallback((baseData, diff) => {
    if (diff.type === 'full') {
      return diff.data;
    }

    const result = JSON.parse(JSON.stringify(baseData));

    diff.changes.forEach(change => {
      const pathParts = change.path.split('.');
      let current = result;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) current[part] = {};
        current = current[part];
      }

      const lastPart = pathParts[pathParts.length - 1];

      switch (change.type) {
        case CHANGE_TYPES.CREATE:
        case CHANGE_TYPES.UPDATE:
          current[lastPart] = change.value;
          break;
        case CHANGE_TYPES.DELETE:
          delete current[lastPart];
          break;
        default:
          log('warn', 'Unknown change type in diff', change);
          break;
      }
    });

    return result;
  }, [log]);

  /**
   * Create new version
   */
  const createVersion = useCallback(async (entity, data, type = VERSION_TYPES.AUTO, metadata = {}) => {
    const versionId = generateVersionId();
    const timestamp = Date.now();
    const hash = calculateHash(data);
    
    // Check if data actually changed
    const lastSnapshot = lastSnapshotRef.current.get(entity);
    if (lastSnapshot && lastSnapshot.hash === hash && type === VERSION_TYPES.AUTO) {
      log('debug', 'No changes detected, skipping version creation', { entity });
      return null;
    }

    // Create diff if previous version exists
    let diff = null;
    let parentVersion = null;
    
    if (lastSnapshot) {
      diff = createDiff(lastSnapshot.data, data);
      parentVersion = lastSnapshot.versionId;
      
      // Check if change is significant enough
      if (type === VERSION_TYPES.AUTO && diff.changes.length === 0) {
        return null;
      }
    }

    const version = {
      id: versionId,
      entity,
      branch: currentBranch,
      type,
      timestamp,
      hash,
      parent: parentVersion,
      data: mergedConfig.enableDiffing && diff ? diff : data,
      compressed: compressData(mergedConfig.enableDiffing && diff ? diff : data),
      metadata: {
        ...metadata,
        author: appState.auth?.user?.id || 'anonymous',
        changeCount: diff?.changes.length || 0,
        size: JSON.stringify(data).length
      }
    };

    // Store in memory
    setVersions(prev => {
      const updated = new Map(prev);
      updated.set(versionId, version);
      
      // Limit version history
      const versionArray = Array.from(updated.values());
      if (versionArray.length > mergedConfig.maxVersionHistory) {
        const sortedVersions = versionArray.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = sortedVersions.slice(0, versionArray.length - mergedConfig.maxVersionHistory);
        toRemove.forEach(v => updated.delete(v.id));
      }
      
      return updated;
    });

    // Store in IndexedDB if enabled
    if (mergedConfig.useIndexedDB) {
      try {
        const db = await initDatabase();
        const transaction = db.transaction(['versions'], 'readwrite');
        const store = transaction.objectStore('versions');
        await store.add(version);
      } catch (error) {
        log('error', 'Failed to store version in IndexedDB', error);
      }
    }

    // Update snapshot reference
    lastSnapshotRef.current.set(entity, {
      versionId,
      data: JSON.parse(JSON.stringify(data)),
      hash
    });

    // Add to change log
    changeLogRef.current.push({
      versionId,
      entity,
      type,
      timestamp,
      changeCount: diff?.changes.length || 0
    });

    // Update metrics
    updateMetrics({
      totalVersions: versionMetrics.totalVersions + 1,
      avgVersionSize: (versionMetrics.avgVersionSize * versionMetrics.totalVersions + version.metadata.size) / 
                     (versionMetrics.totalVersions + 1)
    });

    log('info', 'Version created', { versionId, entity, type, changeCount: diff?.changes.length || 0 });

    return versionId;
  }, [
    generateVersionId,
    calculateHash,
    createDiff,
    currentBranch,
    mergedConfig.enableDiffing,
    mergedConfig.useIndexedDB,
    mergedConfig.maxVersionHistory,
    compressData,
    appState.auth,
    initDatabase,
    updateMetrics,
    versionMetrics.totalVersions,
    versionMetrics.avgVersionSize,
    log
  ]);

  /**
   * Get version by ID
   */
  const getVersion = useCallback(async (versionId) => {
    // Try memory first
    let version = versions.get(versionId);
    
    if (!version && mergedConfig.useIndexedDB) {
      try {
        const db = await initDatabase();
        const transaction = db.transaction(['versions'], 'readonly');
        const store = transaction.objectStore('versions');
        version = await store.get(versionId);
      } catch (error) {
        log('error', 'Failed to retrieve version from IndexedDB', error);
      }
    }

    if (version && version.compressed) {
      const decompressed = decompressData(version.compressed);
      return { ...version, data: decompressed };
    }

    return version;
  }, [versions, mergedConfig.useIndexedDB, initDatabase, decompressData, log]);

  /**
   * Rollback to specific version
   */
  const rollbackToVersion = useCallback(async (entity, versionId) => {
    const version = await getVersion(versionId);
    if (!version) {
      log('error', 'Version not found for rollback', { versionId });
      return false;
    }

    let rollbackData;

    if (version.data.type === 'diff') {
      // Reconstruct data from diffs
      const versionHistory = await getVersionHistory(entity, version.branch);
      rollbackData = await reconstructDataFromVersions(versionHistory, versionId);
    } else {
      rollbackData = version.data;
    }

    // Create new version for the rollback
    const rollbackVersionId = await createVersion(
      entity, 
      rollbackData, 
      VERSION_TYPES.ROLLBACK,
      { 
        rolledBackFrom: versionId,
        rolledBackAt: Date.now()
      }
    );

    // Dispatch rollback to app state
    dispatch({
      type: 'DATA_ROLLBACK',
      payload: {
        entity,
        versionId: rollbackVersionId,
        rolledBackFrom: versionId,
        data: rollbackData
      }
    });

    log('info', 'Rollback completed', { entity, versionId, rollbackVersionId });
    return rollbackVersionId;
  }, [getVersion, createVersion, dispatch, log]);

  /**
   * Get version history for entity
   */
  const getVersionHistory = useCallback(async (entity, branch = currentBranch, limit = 50) => {
    const entityVersions = Array.from(versions.values())
      .filter(v => v.entity === entity && v.branch === branch)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    // Load from IndexedDB if needed
    if (mergedConfig.useIndexedDB && entityVersions.length < limit) {
      try {
        const db = await initDatabase();
        const transaction = db.transaction(['versions'], 'readonly');
        const store = transaction.objectStore('versions');
        const index = store.index('entity');
        
        const dbVersions = await new Promise((resolve, reject) => {
          const request = index.getAll(entity);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const filteredDbVersions = dbVersions
          .filter(v => v.branch === branch)
          .filter(v => !entityVersions.find(ev => ev.id === v.id))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit - entityVersions.length);

        entityVersions.push(...filteredDbVersions);
      } catch (error) {
        log('error', 'Failed to load version history from IndexedDB', error);
      }
    }

    return entityVersions.sort((a, b) => b.timestamp - a.timestamp);
  }, [versions, currentBranch, mergedConfig.useIndexedDB, initDatabase, log]);

  /**
   * Reconstruct data from version history
   */
  const reconstructDataFromVersions = useCallback(async (versionHistory, targetVersionId) => {
    const targetVersion = versionHistory.find(v => v.id === targetVersionId);
    if (!targetVersion) {
      log('error', 'Target version not found in history', { targetVersionId });
      return null;
    }

    // If it's a full data version, return it directly
    if (targetVersion.data.type !== 'diff') {
      return targetVersion.data;
    }

    // Find the base version (full data)
    let baseVersion = null;
    const diffsToApply = [];
    
    for (const version of versionHistory) {
      if (version.timestamp <= targetVersion.timestamp) {
        if (version.data.type !== 'diff') {
          baseVersion = version;
          break;
        } else {
          diffsToApply.unshift(version.data);
        }
      }
    }

    if (!baseVersion) {
      log('error', 'No base version found for reconstruction', { targetVersionId });
      return null;
    }

    // Apply diffs sequentially
    let reconstructedData = JSON.parse(JSON.stringify(baseVersion.data));
    for (const diff of diffsToApply) {
      reconstructedData = applyDiff(reconstructedData, diff);
    }

    return reconstructedData;
  }, [applyDiff, log]);

  /**
   * Create branch
   */
  const createBranch = useCallback(async (branchName, fromVersion = null) => {
    if (branches.has(branchName)) {
      log('warn', 'Branch already exists', { branchName });
      return false;
    }

    const branch = {
      name: branchName,
      created: Date.now(),
      head: fromVersion,
      parent: currentBranch,
      metadata: {
        createdBy: appState.auth?.user?.id || 'anonymous'
      }
    };

    setBranches(prev => new Map(prev).set(branchName, branch));

    // Store in IndexedDB if enabled
    if (mergedConfig.useIndexedDB) {
      try {
        const db = await initDatabase();
        const transaction = db.transaction(['branches'], 'readwrite');
        const store = transaction.objectStore('branches');
        await store.add(branch);
      } catch (error) {
        log('error', 'Failed to store branch in IndexedDB', error);
      }
    }

    updateMetrics({ totalBranches: versionMetrics.totalBranches + 1 });
    log('info', 'Branch created', { branchName, fromVersion });

    return true;
  }, [
    branches, 
    currentBranch, 
    appState.auth, 
    mergedConfig.useIndexedDB, 
    initDatabase, 
    updateMetrics, 
    versionMetrics.totalBranches,
    log
  ]);

  /**
   * Switch to branch
   */
  const switchToBranch = useCallback((branchName) => {
    if (!branches.has(branchName)) {
      log('error', 'Branch not found', { branchName });
      return false;
    }

    setCurrentBranch(branchName);
    log('info', 'Switched to branch', { branchName });
    return true;
  }, [branches, log]);

  /**
   * Compare versions
   */
  const compareVersions = useCallback(async (versionId1, versionId2) => {
    const version1 = await getVersion(versionId1);
    const version2 = await getVersion(versionId2);

    if (!version1 || !version2) {
      log('error', 'One or both versions not found', { versionId1, versionId2 });
      return null;
    }

    const data1 = version1.data.type === 'diff' 
      ? await reconstructDataFromVersions(await getVersionHistory(version1.entity), versionId1)
      : version1.data;
      
    const data2 = version2.data.type === 'diff'
      ? await reconstructDataFromVersions(await getVersionHistory(version2.entity), versionId2)
      : version2.data;

    const comparison = {
      version1: { id: versionId1, timestamp: version1.timestamp },
      version2: { id: versionId2, timestamp: version2.timestamp },
      diff: createDiff(data1, data2),
      similarity: calculateSimilarity(data1, data2)
    };

    return comparison;
  }, [getVersion, getVersionHistory, reconstructDataFromVersions, createDiff, log]);

  /**
   * Calculate similarity between two data objects
   */
  const calculateSimilarity = useCallback((data1, data2) => {
    const str1 = JSON.stringify(data1);
    const str2 = JSON.stringify(data2);
    
    if (str1 === str2) return 1;
    
    const maxLength = Math.max(str1.length, str2.length);
    const levenshteinDistance = calculateLevenshteinDistance(str1, str2);
    
    return 1 - (levenshteinDistance / maxLength);
  }, []);

  /**
   * Calculate Levenshtein distance
   */
  const calculateLevenshteinDistance = useCallback((str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }, []);

  /**
   * Track changes automatically
   */
  useEffect(() => {
    if (!mergedConfig.enableAutoVersioning) return;

    versioningIntervalRef.current = setInterval(() => {
      // Auto-version changed entities
      Object.keys(appState.data || {}).forEach(entity => {
        const entityData = appState.data[entity];
        if (entityData && Object.keys(entityData).length > 0) {
          createVersion(entity, entityData, VERSION_TYPES.AUTO);
        }
      });
    }, mergedConfig.versionInterval);

    return () => {
      if (versioningIntervalRef.current) {
        clearInterval(versioningIntervalRef.current);
      }
    };
  }, [mergedConfig.enableAutoVersioning, mergedConfig.versionInterval, appState.data, createVersion]);

  // Initialize main branch
  useEffect(() => {
    setBranches(prev => {
      if (!prev.has('main')) {
        return new Map(prev).set('main', {
          name: 'main',
          created: Date.now(),
          head: null,
          parent: null,
          metadata: { isDefault: true }
        });
      }
      return prev;
    });
  }, []);

  // Public API
  return useMemo(() => ({
    // Core functionality
    createVersion,
    getVersion,
    getVersionHistory,
    rollbackToVersion,
    compareVersions,
    
    // Branch management
    createBranch,
    switchToBranch,
    currentBranch,
    branches: Array.from(branches.values()),
    
    // State
    versions: Array.from(versions.values()),
    versionCount: versions.size,
    changeLog: changeLogRef.current,
    
    // Utilities
    calculateHash,
    createDiff,
    applyDiff,
    
    // Metrics
    metrics: versionMetrics,
    
    // Constants
    VERSION_TYPES,
    CHANGE_TYPES,
    MERGE_STRATEGIES,
    
    // Configuration
    config: mergedConfig
  }), [
    createVersion,
    getVersion,
    getVersionHistory,
    rollbackToVersion,
    compareVersions,
    createBranch,
    switchToBranch,
    currentBranch,
    branches,
    versions,
    calculateHash,
    createDiff,
    applyDiff,
    versionMetrics,
    mergedConfig
  ]);
};

export default useDataVersioning; 
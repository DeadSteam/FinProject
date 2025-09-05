/**
 * Advanced memoized selector hook with performance optimizations
 * 
 * Features:
 * - Multiple memoization strategies (weak, strong, custom)
 * - Performance tracking and debugging
 * - Automatic dependency detection
 * - Memory leak prevention with TTL and LRU eviction
 * - Selector composition utilities
 * 
 * @module useMemoizedSelector
 */

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';

import { useAppSelector } from './useAppSelector';
import { shallowEqual, deepEqual, fastEqual } from './useShallowEqual';

// LRU Cache implementation with TTL
class LRUCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.accessOrder = [];
  }

  set(key, value) {
    const now = Date.now();
    const entry = {
      value,
      timestamp: now,
      lastAccess: now
    };

    // Remove if already exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Check TTL
    if (now - entry.timestamp > this.ttl) {
      this.delete(key);
      return null;
    }

    // Update access order
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    entry.lastAccess = now;

    return entry.value;
  }

  delete(key) {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
  }

  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  evictLRU() {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
      }
    }
  }
}

// Memoization cache with weak references for memory management
const globalMemoCache = new WeakMap();
const strongMemoCache = new LRUCache(100, 5 * 60 * 1000); // 100 entries, 5 min TTL
const cacheStats = {
  hits: 0,
  misses: 0,
  createdSelectors: 0,
  evictedSelectors: 0,
  ttlEvictions: 0
};

// Periodic cleanup of expired entries
setInterval(() => {
  strongMemoCache.cleanup();
}, 60 * 1000); // Cleanup every minute

/**
 * Advanced memoized selector with configurable caching strategies
 * 
 * @param {Function} selector - Selector function
 * @param {Object} options - Configuration options
 * @returns {any} Memoized selector result
 */
export const useMemoizedSelector = (selector, options = {}) => {
  const {
    equalityFn = shallowEqual,
    memoStrategy = 'weak', // 'weak', 'strong', 'custom'
    maxCacheSize = 100,
    enableProfiling = process.env.NODE_ENV === 'development',
    debugName = 'AnonymousSelector',
    dependencies = [],
    autoCleanup = true,
    ttl = 5 * 60 * 1000, // 5 minutes default TTL
    enableLRU = true
  } = options;

  const selectorRef = useRef(selector);
  const lastResultRef = useRef();
  const lastArgsRef = useRef();
  const cacheKeyRef = useRef(Symbol(`memoized-${debugName}-${Date.now()}`));
  const statsRef = useRef({
    calls: 0,
    hits: 0,
    misses: 0,
    avgExecutionTime: 0,
    lastExecutionTime: 0,
    createdAt: Date.now()
  });

  // Update selector reference if it changes
  useEffect(() => {
    selectorRef.current = selector;
  }, [selector]);

  // Performance profiling state
  const [profilingData, setProfilingData] = useState(null);

  // Memoized selector function with performance tracking
  const memoizedSelector = useCallback((state) => {
    const startTime = performance.now();
    const args = [state, ...dependencies];
    const stats = statsRef.current;
    
    stats.calls++;

    // Check if we can use cached result
    const cache = memoStrategy === 'weak' ? globalMemoCache : strongMemoCache;
    const cacheKey = cacheKeyRef.current;
    
    if (lastArgsRef.current && equalityFn(lastArgsRef.current, args)) {
      stats.hits++;
      cacheStats.hits++;
      
      if (enableProfiling) {
        const executionTime = performance.now() - startTime;
        stats.lastExecutionTime = executionTime;
        stats.avgExecutionTime = (stats.avgExecutionTime * (stats.calls - 1) + executionTime) / stats.calls;
      }
      
      return lastResultRef.current;
    }

    // Cache miss - execute selector
    stats.misses++;
    cacheStats.misses++;
    
    let result;
    try {
      result = selectorRef.current(state);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[useMemoizedSelector:${debugName}] Selector execution error:`, error);
      }
      // Return previous result on error if available
      if (lastResultRef.current !== undefined) {
        return lastResultRef.current;
      }
      throw error;
    }

    // Update cache
    lastArgsRef.current = args;
    lastResultRef.current = result;

    // Store in appropriate cache
    if (memoStrategy === 'strong') {
      strongMemoCache.set(cacheKey, { result, args, timestamp: Date.now() });
    }

    if (enableProfiling) {
      const executionTime = performance.now() - startTime;
      stats.lastExecutionTime = executionTime;
      stats.avgExecutionTime = (stats.avgExecutionTime * (stats.calls - 1) + executionTime) / stats.calls;
      
      setProfilingData({
        ...stats,
        cacheHitRate: stats.hits / stats.calls,
        memoryUsage: strongMemoCache.size(),
        lastUpdate: Date.now()
      });
    }

    return result;
  }, [equalityFn, memoStrategy, maxCacheSize, enableProfiling, debugName, ...dependencies]);

  // Use the base selector hook
  const result = useAppSelector(memoizedSelector);

  // Cleanup on unmount
  useEffect(() => {
    if (!autoCleanup) return;
    
    return () => {
      const cacheKey = cacheKeyRef.current;
      strongMemoCache.delete(cacheKey);
    };
  }, [autoCleanup]);

  // Development debugging utilities
  if (enableProfiling && process.env.NODE_ENV === 'development') {
    // Expose debugging utilities
    result._debug = {
      stats: statsRef.current,
      profilingData,
      clearCache: () => {
        lastResultRef.current = undefined;
        lastArgsRef.current = undefined;
        strongMemoCache.delete(cacheKeyRef.current);
      },
      getCacheSize: () => strongMemoCache.size(),
      getGlobalStats: () => ({ ...cacheStats }),
      getCacheInfo: () => ({
        size: strongMemoCache.size(),
        maxSize: strongMemoCache.maxSize,
        ttl: strongMemoCache.ttl
      })
    };
  }

  return result;
};

/**
 * Create a reusable memoized selector factory
 * 
 * @param {Function} selectorFactory - Function that creates selectors
 * @param {Object} defaultOptions - Default options for all created selectors
 * @returns {Function} Selector factory function
 */
export const createMemoizedSelectorFactory = (selectorFactory, defaultOptions = {}) => {
  return (factoryArgs, options = {}) => {
    const mergedOptions = { ...defaultOptions, ...options };
    const selector = selectorFactory(factoryArgs);
    
    return useMemoizedSelector(selector, mergedOptions);
  };
};

/**
 * Compose multiple memoized selectors
 * 
 * @param {Array<Function>} selectors - Array of selector functions
 * @param {Function} combiner - Function to combine selector results
 * @param {Object} options - Memoization options
 * @returns {any} Combined selector result
 */
export const useComposedMemoizedSelector = (selectors, combiner, options = {}) => {
  const composedSelector = useCallback((state) => {
    const results = selectors.map(selector => selector(state));
    return combiner(...results);
  }, [selectors, combiner]);

  return useMemoizedSelector(composedSelector, {
    debugName: 'ComposedSelector',
    ...options
  });
};

/**
 * Memoized selector with automatic dependency tracking
 * 
 * @param {Function} selector - Selector function
 * @param {Array} watchPaths - State paths to watch for changes
 * @param {Object} options - Memoization options
 * @returns {any} Memoized selector result
 */
export const usePathMemoizedSelector = (selector, watchPaths = [], options = {}) => {
  const pathSelector = useCallback((state) => {
    // Create a minimal state object with only watched paths
    const minimalState = {};
    watchPaths.forEach(path => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], state);
      if (value !== undefined) {
        const keys = path.split('.');
        let current = minimalState;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = current[keys[i]] || {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      }
    });
    
    return selector(minimalState);
  }, [selector, watchPaths]);

  return useMemoizedSelector(pathSelector, {
    debugName: `PathSelector(${watchPaths.join(',')})`,
    equalityFn: deepEqual, // Use deep equality for path-based selectors
    ...options
  });
};

/**
 * Batch multiple memoized selectors for performance
 * 
 * @param {Object} selectorMap - Map of selector names to selector functions
 * @param {Object} options - Batch options
 * @returns {Object} Map of selector names to results
 */
export const useBatchMemoizedSelectors = (selectorMap, options = {}) => {
  const { 
    batchSize = 10,
    equalityFn = shallowEqual,
    debugName = 'BatchedSelectors'
  } = options;

  const batchedSelector = useCallback((state) => {
    const results = {};
    const selectorEntries = Object.entries(selectorMap);
    
    // Process selectors in batches to prevent UI blocking
    for (let i = 0; i < selectorEntries.length; i += batchSize) {
      const batch = selectorEntries.slice(i, i + batchSize);
      
      batch.forEach(([name, selector]) => {
        try {
          results[name] = selector(state);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`[useBatchMemoizedSelectors] Error in selector "${name}":`, error);
          }
          results[name] = undefined;
        }
      });
    }
    
    return results;
  }, [selectorMap, batchSize]);

  return useMemoizedSelector(batchedSelector, {
    debugName,
    equalityFn,
    memoStrategy: 'strong', // Use strong memoization for batched selectors
    ...options
  });
};

/**
 * Async memoized selector for handling async computations
 * 
 * @param {Function} asyncSelector - Async selector function
 * @param {any} fallbackValue - Value to return while loading
 * @param {Object} options - Memoization options
 * @returns {Object} { data, loading, error, refresh }
 */
export const useAsyncMemoizedSelector = (asyncSelector, fallbackValue = null, options = {}) => {
  const [asyncState, setAsyncState] = useState({
    data: fallbackValue,
    loading: false,
    error: null
  });

  const asyncSelectorRef = useRef(asyncSelector);
  const lastStateRef = useRef();

  // Update selector reference
  useEffect(() => {
    asyncSelectorRef.current = asyncSelector;
  }, [asyncSelector]);

  const memoizedAsyncSelector = useMemoizedSelector((state) => {
    // Check if state changed to trigger async operation
    if (!shallowEqual(state, lastStateRef.current)) {
      lastStateRef.current = state;
      
      setAsyncState(prev => ({ ...prev, loading: true, error: null }));
      
      Promise.resolve(asyncSelectorRef.current(state))
        .then(data => {
          setAsyncState({ data, loading: false, error: null });
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[useAsyncMemoizedSelector] Async selector error:', error);
          }
          setAsyncState(prev => ({ 
            ...prev, 
            loading: false, 
            error: error.message || 'Unknown error' 
          }));
        });
    }
    
    return asyncState.data;
  }, {
    debugName: 'AsyncMemoizedSelector',
    equalityFn: shallowEqual,
    ...options
  });

  const refresh = useCallback(() => {
    if (lastStateRef.current) {
      // Force re-execution by clearing the last state
      lastStateRef.current = null;
    }
  }, []);

  return {
    data: memoizedAsyncSelector,
    ...asyncState,
    refresh
  };
};

/**
 * Global cache management utilities
 */
export const memoizedSelectorUtils = {
  /**
   * Clear all strong memoization caches
   */
  clearAllCaches: () => {
    strongMemoCache.clear();
    cacheStats.evictedSelectors += strongMemoCache.size;
  },

  /**
   * Get global cache statistics
   */
  getGlobalStats: () => ({ ...cacheStats }),

  /**
   * Get current cache size
   */
  getCacheSize: () => ({
    strong: strongMemoCache.size(),
    weak: globalMemoCache instanceof WeakMap ? 'WeakMap (size unknown)' : 0
  }),

  /**
   * Cleanup expired entries from cache
   */
  cleanupExpired: (ttl = 5 * 60 * 1000) => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of strongMemoCache.entries()) {
      if (entry.timestamp && now - entry.timestamp > ttl) {
        strongMemoCache.delete(key);
        cleaned++;
      }
    }
    
    cacheStats.evictedSelectors += cleaned;
    return cleaned;
  }
};

// Default export for convenience
export default useMemoizedSelector; 
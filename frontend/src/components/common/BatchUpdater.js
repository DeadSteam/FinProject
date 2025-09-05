/**
 * BatchUpdater - Component for batching state updates for optimal performance
 * 
 * Features:
 * - Automatic batching of state updates within time windows
 * - Priority-based update scheduling  
 * - Debounced and throttled update strategies
 * - Memory usage optimization
 * - Performance monitoring and debugging
 * - Integration with React's concurrent features
 * 
 * @module BatchUpdater
 */

import React, { 
  createContext, 
  useContext, 
  useRef, 
  useCallback, 
  useEffect, 
  useState,
  useMemo,
  Component
} from 'react';

import { useAppStateDispatch } from '../../context/AppStateContext';

// Default batch configuration
const DEFAULT_BATCH_CONFIG = {
  // Timing configuration
  batchWindow: 16, // 16ms - roughly one frame at 60fps
  maxBatchSize: 50, // Maximum updates per batch
  maxWaitTime: 100, // Maximum time to wait before forcing batch
  
  // Priority levels
  priorities: {
    immediate: 0,    // Process immediately
    high: 1,         // Process within one frame
    normal: 2,       // Process within batch window
    low: 3,          // Process when idle
    background: 4    // Process during idle time only
  },
  
  // Performance settings
  enableProfiling: process.env.NODE_ENV === 'development',
  enableLogging: process.env.NODE_ENV === 'development',
  memoryThreshold: 1000, // Max pending updates before forced batch
  
  // Strategy settings
  strategy: 'adaptive', // 'immediate', 'debounced', 'throttled', 'adaptive'
  idleTimeout: 5000, // Time before considering app idle
  
  // Error handling
  enableErrorRecovery: true,
  maxRetries: 3,
  retryDelay: 100
};

// Performance tracking
const batchStats = {
  totalBatches: 0,
  totalUpdates: 0,
  averageBatchSize: 0,
  averageBatchTime: 0,
  droppedUpdates: 0,
  errorCount: 0,
  memoryPressure: 0,
  lastBatchTime: 0
};

// Global batch queue and context
const BatchContext = createContext();

/**
 * BatchUpdater Context Provider
 */
export const BatchUpdaterProvider = ({ 
  children, 
  config = DEFAULT_BATCH_CONFIG 
}) => {
  const dispatch = useAppStateDispatch();
  const mergedConfig = { ...DEFAULT_BATCH_CONFIG, ...config };
  
  // Batch queue management
  const batchQueue = useRef([]);
  const batchTimeoutRef = useRef(null);
  const lastBatchTime = useRef(Date.now());
  const processingRef = useRef(false);
  const statsRef = useRef({ ...batchStats });
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [isIdle, setIsIdle] = useState(false);
  
  // Priority queues for different update types
  const priorityQueues = useRef({
    immediate: [],
    high: [],
    normal: [],
    low: [],
    background: []
  });

  // Idle detection
  useEffect(() => {
    let idleTimer;
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      setIsIdle(false);
      idleTimer = setTimeout(() => setIsIdle(true), mergedConfig.idleTimeout);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetIdleTimer, true));
    
    resetIdleTimer();
    
    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => document.removeEventListener(event, resetIdleTimer, true));
    };
  }, [mergedConfig.idleTimeout]);

  /**
   * Process a batch of updates
   */
  const processBatch = useCallback(async (updates) => {
    if (processingRef.current || updates.length === 0) return;
    
    processingRef.current = true;
    const batchStartTime = performance.now();
    const stats = statsRef.current;
    
    try {
      // Group updates by type for optimization
      const groupedUpdates = updates.reduce((groups, update) => {
        const {type} = update.action;
        if (!groups[type]) groups[type] = [];
        groups[type].push(update);
        return groups;
      }, {});

      // Process updates by priority and type
      for (const [actionType, typeUpdates] of Object.entries(groupedUpdates)) {
        // Batch similar updates together
        if (typeUpdates.length > 1) {
          // Create a batched action
          const batchedAction = {
            type: `BATCH_${actionType}`,
            payload: {
              updates: typeUpdates.map(u => u.action.payload),
              originalActions: typeUpdates.map(u => u.action),
              batchSize: typeUpdates.length,
              batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            },
            meta: {
              isBatch: true,
              originalCount: typeUpdates.length,
              timestamp: Date.now()
            }
          };
          
          dispatch(batchedAction);
        } else {
          // Single update
          dispatch(typeUpdates[0].action);
        }
      }

      // Update statistics
      const batchTime = performance.now() - batchStartTime;
      stats.totalBatches++;
      stats.totalUpdates += updates.length;
      stats.averageBatchSize = stats.totalUpdates / stats.totalBatches;
      stats.averageBatchTime = (stats.averageBatchTime * (stats.totalBatches - 1) + batchTime) / stats.totalBatches;
      stats.lastBatchTime = Date.now();
      
      if (mergedConfig.enableProfiling) {
        setPerformanceMetrics({
          batchSize: updates.length,
          batchTime,
          timestamp: Date.now(),
          ...stats
        });
      }

      if (mergedConfig.enableLogging) {
        console.log(`[BatchUpdater] Processed batch of ${updates.length} updates in ${batchTime.toFixed(2)}ms`);
      }

    } catch (error) {
      stats.errorCount++;
      console.error('[BatchUpdater] Error processing batch:', error);
      
      if (mergedConfig.enableErrorRecovery) {
        // Retry individual updates on batch failure
        for (const update of updates) {
          try {
            dispatch(update.action);
          } catch (individualError) {
            console.error('[BatchUpdater] Error in individual update recovery:', individualError);
          }
        }
      }
    } finally {
      processingRef.current = false;
      lastBatchTime.current = Date.now();
    }
  }, [dispatch, mergedConfig]);

  /**
   * Schedule batch processing based on strategy
   */
  const scheduleBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    const now = Date.now();
    const timeSinceLastBatch = now - lastBatchTime.current;
    const totalPendingUpdates = Object.values(priorityQueues.current)
      .reduce((total, queue) => total + queue.length, 0);

    // Check if we should force immediate processing
    const shouldForceImmediate = 
      totalPendingUpdates >= mergedConfig.memoryThreshold ||
      timeSinceLastBatch >= mergedConfig.maxWaitTime ||
      priorityQueues.current.immediate.length > 0;

    if (shouldForceImmediate) {
      batchTimeoutRef.current = setTimeout(() => {
        flushAllBatches();
      }, 0);
      return;
    }

    // Adaptive strategy based on app state
    let delay = mergedConfig.batchWindow;
    
    switch (mergedConfig.strategy) {
      case 'immediate':
        delay = 0;
        break;
      case 'debounced':
        delay = mergedConfig.batchWindow * 2;
        break;
      case 'throttled':
        delay = Math.max(0, mergedConfig.batchWindow - timeSinceLastBatch);
        break;
      case 'adaptive':
        // Adjust delay based on system load and update frequency
        if (isIdle) {
          delay = mergedConfig.batchWindow * 3; // Slower when idle
        } else if (totalPendingUpdates > 10) {
          delay = Math.max(4, mergedConfig.batchWindow / 2); // Faster when busy
        }
        break;
    }

    batchTimeoutRef.current = setTimeout(() => {
      flushBatchesByPriority();
    }, delay);
  }, [mergedConfig, isIdle]);

  /**
   * Flush batches by priority order
   */
  const flushBatchesByPriority = useCallback(() => {
    const priorities = ['immediate', 'high', 'normal', 'low'];
    
    // Only process background updates when idle
    if (isIdle) {
      priorities.push('background');
    }

    for (const priority of priorities) {
      const queue = priorityQueues.current[priority];
      if (queue.length > 0) {
        const updates = queue.splice(0, mergedConfig.maxBatchSize);
        processBatch(updates);
        
        // If there are still updates, schedule next batch
        if (Object.values(priorityQueues.current).some(q => q.length > 0)) {
          scheduleBatch();
        }
        return;
      }
    }
  }, [isIdle, mergedConfig.maxBatchSize, processBatch, scheduleBatch]);

  /**
   * Flush all pending batches immediately
   */
  const flushAllBatches = useCallback(() => {
    const allUpdates = [];
    
    Object.values(priorityQueues.current).forEach(queue => {
      allUpdates.push(...queue.splice(0));
    });

    if (allUpdates.length > 0) {
      // Sort by priority
      allUpdates.sort((a, b) => a.priority - b.priority);
      processBatch(allUpdates);
    }
  }, [processBatch]);

  /**
   * Add an update to the appropriate priority queue
   */
  const queueUpdate = useCallback((action, options = {}) => {
    const {
      priority = 'normal',
      dedupe = true,
      metadata = {}
    } = options;

    const update = {
      action,
      priority: mergedConfig.priorities[priority] || mergedConfig.priorities.normal,
      timestamp: Date.now(),
      id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata
    };

    // Deduplication logic
    if (dedupe) {
      const queue = priorityQueues.current[priority] || priorityQueues.current.normal;
      const existingIndex = queue.findIndex(existing => 
        existing.action.type === action.type && 
        JSON.stringify(existing.action.payload) === JSON.stringify(action.payload)
      );
      
      if (existingIndex !== -1) {
        // Update the existing entry instead of adding duplicate
        queue[existingIndex] = update;
        return update.id;
      }
    }

    // Add to appropriate queue
    const targetQueue = priorityQueues.current[priority] || priorityQueues.current.normal;
    targetQueue.push(update);

    // Check memory pressure
    const totalUpdates = Object.values(priorityQueues.current)
      .reduce((total, queue) => total + queue.length, 0);
    
    statsRef.current.memoryPressure = totalUpdates / mergedConfig.memoryThreshold;

    // Schedule batch processing
    scheduleBatch();

    return update.id;
  }, [mergedConfig, scheduleBatch]);

  /**
   * Cancel a pending update by ID
   */
  const cancelUpdate = useCallback((updateId) => {
    for (const queue of Object.values(priorityQueues.current)) {
      const index = queue.findIndex(update => update.id === updateId);
      if (index !== -1) {
        queue.splice(index, 1);
        return true;
      }
    }
    return false;
  }, []);

  /**
   * Get current batch statistics
   */
  const getStatistics = useCallback(() => ({
    ...statsRef.current,
    pendingUpdates: Object.values(priorityQueues.current)
      .reduce((total, queue) => total + queue.length, 0),
    queueSizes: Object.fromEntries(
      Object.entries(priorityQueues.current).map(([priority, queue]) => [priority, queue.length])
    ),
    isIdle,
    performanceMetrics
  }), [isIdle, performanceMetrics]);

  /**
   * Clear all pending updates
   */
  const clearAllUpdates = useCallback(() => {
    Object.values(priorityQueues.current).forEach(queue => queue.length = 0);
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      flushAllBatches(); // Process any remaining updates
    };
  }, [flushAllBatches]);

  const contextValue = useMemo(() => ({
    queueUpdate,
    cancelUpdate,
    flushAllBatches,
    getStatistics,
    clearAllUpdates,
    config: mergedConfig,
    isIdle
  }), [
    queueUpdate, 
    cancelUpdate, 
    flushAllBatches, 
    getStatistics, 
    clearAllUpdates, 
    mergedConfig, 
    isIdle
  ]);

  return (
    <BatchContext.Provider value={contextValue}>
      {children}
    </BatchContext.Provider>
  );
};

/**
 * Hook to access batch updater functionality
 */
export const useBatchUpdater = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error('useBatchUpdater must be used within a BatchUpdaterProvider');
  }
  return context;
};

/**
 * HOC for automatic batching of component updates
 */
export const withBatchUpdates = (WrappedComponent, batchOptions = {}) => {
  const BatchedComponent = React.forwardRef((props, ref) => {
    const { queueUpdate } = useBatchUpdater();
    
    const batchedProps = useMemo(() => {
      const newProps = { ...props };
      
      // Wrap any function props that might trigger state updates
      Object.keys(props).forEach(key => {
        if (typeof props[key] === 'function' && key.startsWith('on')) {
          const originalFn = props[key];
          newProps[key] = (...args) => {
            // Queue the update instead of executing immediately
            const action = {
              type: `COMPONENT_${WrappedComponent.name?.toUpperCase()}_${key.toUpperCase()}`,
              payload: { args, componentName: WrappedComponent.name }
            };
            
            queueUpdate(action, {
              priority: batchOptions.priority || 'normal',
              dedupe: batchOptions.dedupe !== false
            });
            
            // Still call the original function
            return originalFn(...args);
          };
        }
      });
      
      return newProps;
    }, [props, queueUpdate]);

    return <WrappedComponent ref={ref} {...batchedProps} />;
  });

  BatchedComponent.displayName = `withBatchUpdates(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return BatchedComponent;
};

/**
 * Error Boundary for BatchUpdater to handle errors gracefully
 */
export class BatchUpdaterErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[BatchUpdater] Error boundary caught error:', error, errorInfo);
    
    // Reset state after a delay to allow recovery
    setTimeout(() => {
      this.setState({ hasError: false, error: null });
    }, 1000);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="batch-updater-error">
          <p>BatchUpdater encountered an error. Recovering...</p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Debug component for monitoring batch performance
 */
export const BatchUpdaterDebugPanel = ({ 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const { getStatistics, config } = useBatchUpdater();
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setStats(getStatistics());
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, getStatistics]);

  if (!enabled || !isVisible) {
    return enabled ? (
      <button 
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 9999,
          padding: '8px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px'
        }}
      >
        Show Batch Stats
      </button>
    ) : null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '300px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <strong>Batch Updater Stats</strong>
        <button onClick={() => setIsVisible(false)} style={{ 
          background: 'none', 
          border: 'none', 
          color: 'white', 
          cursor: 'pointer' 
        }}>×</button>
      </div>
      
      {stats && (
        <>
          <div>Total Batches: {stats.totalBatches}</div>
          <div>Total Updates: {stats.totalUpdates}</div>
          <div>Avg Batch Size: {stats.averageBatchSize.toFixed(2)}</div>
          <div>Avg Batch Time: {stats.averageBatchTime.toFixed(2)}ms</div>
          <div>Pending Updates: {stats.pendingUpdates}</div>
          <div>Memory Pressure: {(stats.memoryPressure * 100).toFixed(1)}%</div>
          <div>Is Idle: {stats.isIdle ? 'Yes' : 'No'}</div>
          <div>Strategy: {config.strategy}</div>
          
          <div style={{ marginTop: '8px' }}>
            <strong>Queue Sizes:</strong>
            {Object.entries(stats.queueSizes).map(([priority, size]) => (
              <div key={priority} style={{ marginLeft: '8px' }}>
                {priority}: {size}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Default export
export default BatchUpdaterProvider; 
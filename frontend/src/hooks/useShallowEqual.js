/**
 * Comprehensive shallow equality utilities for performance optimization
 * 
 * Features:
 * - Multiple equality comparison strategies
 * - Performance-optimized implementations
 * - Custom equality functions
 * - Array and object specific comparisons
 * - Debugging and profiling utilities
 * 
 * @module useShallowEqual
 */

import { useRef, useCallback, useMemo } from 'react';

// Performance tracking for equality checks
const equalityStats = {
  calls: 0,
  shallowCalls: 0,
  deepCalls: 0,
  fastCalls: 0,
  customCalls: 0,
  totalTime: 0,
  averageTime: 0
};

/**
 * Basic shallow equality comparison for objects and arrays
 * 
 * @param {any} objA - First value to compare
 * @param {any} objB - Second value to compare
 * @returns {boolean} True if shallowly equal
 */
export const shallowEqual = (objA, objB) => {
  const startTime = performance.now();
  equalityStats.calls++;
  equalityStats.shallowCalls++;

  // Same reference check
  if (objA === objB) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return true;
  }

  // Null/undefined checks
  if (objA == null || objB == null) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return objA === objB;
  }

  // Type check
  if (typeof objA !== typeof objB) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return false;
  }

  // Primitive types
  if (typeof objA !== 'object') {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return objA === objB;
  }

  // Array comparison
  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) {
      const endTime = performance.now();
      equalityStats.totalTime += endTime - startTime;
      equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
      return false;
    }

    for (let i = 0; i < objA.length; i++) {
      if (objA[i] !== objB[i]) {
        const endTime = performance.now();
        equalityStats.totalTime += endTime - startTime;
        equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
        return false;
      }
    }

    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return true;
  }

  // Object comparison
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(objB, key) || objA[key] !== objB[key]) {
      const endTime = performance.now();
      equalityStats.totalTime += endTime - startTime;
      equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
      return false;
    }
  }

  const endTime = performance.now();
  equalityStats.totalTime += endTime - startTime;
  equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
  return true;
};

/**
 * Deep equality comparison (recursive)
 * 
 * @param {any} objA - First value to compare
 * @param {any} objB - Second value to compare
 * @param {Set} visited - Visited objects to prevent infinite recursion
 * @returns {boolean} True if deeply equal
 */
export const deepEqual = (objA, objB, visited = new Set()) => {
  const startTime = performance.now();
  equalityStats.calls++;
  equalityStats.deepCalls++;

  // Same reference check
  if (objA === objB) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return true;
  }

  // Null/undefined checks
  if (objA == null || objB == null) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return objA === objB;
  }

  // Type check
  if (typeof objA !== typeof objB) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return false;
  }

  // Primitive types
  if (typeof objA !== 'object') {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return objA === objB;
  }

  // Circular reference detection
  if (visited.has(objA) || visited.has(objB)) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return objA === objB;
  }

  visited.add(objA);
  visited.add(objB);

  try {
    // Array comparison
    if (Array.isArray(objA) && Array.isArray(objB)) {
      if (objA.length !== objB.length) {
        return false;
      }

      for (let i = 0; i < objA.length; i++) {
        if (!deepEqual(objA[i], objB[i], visited)) {
          return false;
        }
      }
      return true;
    }

    // Date comparison
    if (objA instanceof Date && objB instanceof Date) {
      return objA.getTime() === objB.getTime();
    }

    // RegExp comparison
    if (objA instanceof RegExp && objB instanceof RegExp) {
      return objA.toString() === objB.toString();
    }

    // Object comparison
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(objB, key)) {
        return false;
      }
      if (!deepEqual(objA[key], objB[key], visited)) {
        return false;
      }
    }

    return true;
  } finally {
    visited.delete(objA);
    visited.delete(objB);
    
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
  }
};

/**
 * Fast equality check with optimizations for common cases
 * 
 * @param {any} objA - First value to compare
 * @param {any} objB - Second value to compare
 * @returns {boolean} True if equal
 */
export const fastEqual = (objA, objB) => {
  const startTime = performance.now();
  equalityStats.calls++;
  equalityStats.fastCalls++;

  // Same reference - fastest possible check
  if (objA === objB) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return true;
  }

  // Quick type and null checks
  if (typeof objA !== typeof objB || objA == null || objB == null) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return false;
  }

  // Primitive types
  if (typeof objA !== 'object') {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return objA === objB;
  }

  // Quick array check
  if (Array.isArray(objA)) {
    if (!Array.isArray(objB) || objA.length !== objB.length) {
      const endTime = performance.now();
      equalityStats.totalTime += endTime - startTime;
      equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
      return false;
    }
    
    // Only check first few items for performance
    const checkLength = Math.min(objA.length, 5);
    for (let i = 0; i < checkLength; i++) {
      if (objA[i] !== objB[i]) {
        const endTime = performance.now();
        equalityStats.totalTime += endTime - startTime;
        equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
        return false;
      }
    }
    
    // If more than 5 items, assume equal (performance trade-off)
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return true;
  }

  // Quick object check - only compare a few keys
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    const endTime = performance.now();
    equalityStats.totalTime += endTime - startTime;
    equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
    return false;
  }

  // Only check first few keys for performance
  const checkLength = Math.min(keysA.length, 3);
  for (let i = 0; i < checkLength; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(objB, key) || objA[key] !== objB[key]) {
      const endTime = performance.now();
      equalityStats.totalTime += endTime - startTime;
      equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
      return false;
    }
  }

  const endTime = performance.now();
  equalityStats.totalTime += endTime - startTime;
  equalityStats.averageTime = equalityStats.totalTime / equalityStats.calls;
  return true;
};

/**
 * Hook for memoized equality checking
 * 
 * @param {Function} equalityFn - Equality function to use
 * @returns {Function} Memoized equality function
 */
export const useShallowEqual = (equalityFn = shallowEqual) => {
  const lastA = useRef();
  const lastB = useRef();
  const lastResult = useRef();

  return useCallback((a, b) => {
    // Check if we've compared these exact values before
    if (lastA.current === a && lastB.current === b) {
      return lastResult.current;
    }

    const result = equalityFn(a, b);
    
    // Cache the result
    lastA.current = a;
    lastB.current = b;
    lastResult.current = result;

    return result;
  }, [equalityFn]);
};

/**
 * Hook for preventing unnecessary re-renders with equality checking
 * 
 * @param {any} value - Value to track
 * @param {Function} equalityFn - Equality function
 * @returns {any} Stabilized value
 */
export const useStableValue = (value, equalityFn = shallowEqual) => {
  const lastValue = useRef(value);

  return useMemo(() => {
    if (!equalityFn(lastValue.current, value)) {
      lastValue.current = value;
    }
    return lastValue.current;
  }, [value, equalityFn]);
};

/**
 * Global equality statistics and utilities
 */
export const equalityUtils = {
  /**
   * Get global equality check statistics
   */
  getGlobalStats: () => ({ ...equalityStats }),

  /**
   * Reset global statistics
   */
  resetGlobalStats: () => {
    equalityStats.calls = 0;
    equalityStats.shallowCalls = 0;
    equalityStats.deepCalls = 0;
    equalityStats.fastCalls = 0;
    equalityStats.customCalls = 0;
    equalityStats.totalTime = 0;
    equalityStats.averageTime = 0;
  }
}; 
import { useRef } from 'react';

/**
 * useCache – простой in-memory кэш с TTL
 */
export const useCache = () => {
  const cacheRef = useRef(new Map());

  const get = (key) => {
    const entry = cacheRef.current.get(key);
    if (!entry) return undefined;
    const { value, expireAt } = entry;
    if (expireAt && expireAt < Date.now()) {
      cacheRef.current.delete(key);
      return undefined;
    }
    return value;
  };

  const set = (key, value, ttl = 0) => {
    const expireAt = ttl ? Date.now() + ttl : null;
    cacheRef.current.set(key, { value, expireAt });
  };

  const del = (key) => cacheRef.current.delete(key);
  const clear = () => cacheRef.current.clear();

  return { get, set, del, clear };
}; 
import { useState, useEffect, useCallback } from 'react';

const cache = new Map();

export function useCache(key, fetchFn, options = {}) {
  const { ttl = 5 * 60 * 1000, enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      const cached = cache.get(key);
      const now = Date.now();
      
      if (!forceRefresh && cached && (now - cached.timestamp) < ttl) {
        setData(cached.data);
        setLoading(false);
        return cached.data;
      }
      
      const result = await fetchFn();
      cache.set(key, { data: result, timestamp: now });
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err);
      console.error(`Cache fetch error for ${key}:`, err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    data, 
    loading, 
    error, 
    refresh: () => fetchData(true),
    invalidate: () => cache.delete(key)
  };
}

export function invalidateCache(keyPattern) {
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key);
    }
  }
}

export function clearCache() {
  cache.clear();
}
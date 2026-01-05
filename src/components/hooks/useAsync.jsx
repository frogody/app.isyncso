import { useState, useEffect, useCallback } from 'react';

export function useAsync(asyncFn, deps = [], options = {}) {
  const { immediate = true } = options;
  const [state, setState] = useState({
    loading: immediate,
    error: null,
    data: null
  });

  const execute = useCallback(async (...args) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const result = await asyncFn(...args);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      setState({ loading: false, error, data: null });
      throw error;
    }
  }, deps);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute
  };
}
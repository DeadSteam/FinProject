import { useState, useCallback } from 'react';

export const useAsyncState = (initialData = null) => {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lastExecuted, setLastExecuted] = useState(null);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
    setAttempts(0);
    setLastExecuted(null);
  }, [initialData]);

  return {
    state: { data, error, loading, attempts, lastExecuted },
    setData,
    setError,
    setLoading,
    setAttempts,
    setLastExecuted,
    reset
  };
}; 
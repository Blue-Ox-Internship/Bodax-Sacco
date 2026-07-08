import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';

export function useApi(path, fallback) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!path) return;
    let mounted = true;

    setLoading(true);
    setError('');
    
    api
      .get(path)
      .then((response) => {
        if (mounted) {
          setLoading(false);
          setData(response.data);
        }
      })
      .catch((err) => {
        if (mounted) {
          setLoading(false);
          setError(err.response?.data?.message || 'Failed to load data');
        }
      });
      
    return () => { mounted = false; };
  }, [path]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  return { data, setData, loading, error, onRetry: load };
}

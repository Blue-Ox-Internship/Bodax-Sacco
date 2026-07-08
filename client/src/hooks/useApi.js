import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/client.js';

export function useApi(path, fallback) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(() => {
    if (!path) return;

    let finished = false;
    if (mountedRef.current) setError('');

    // Only show the spinner if the request takes longer than 200ms
    const timer = setTimeout(() => {
      if (mountedRef.current && !finished) setLoading(true);
    }, 200);

    api
      .get(path)
      .then((response) => {
        finished = true;
        clearTimeout(timer);
        if (mountedRef.current) {
          setLoading(false);
          setData(response.data);
        }
      })
      .catch((err) => {
        finished = true;
        clearTimeout(timer);
        if (mountedRef.current) {
          setLoading(false);
          setError(err.response?.data?.message || 'Failed to load data');
        }
      });
  }, [path]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  return { data, setData, loading, error, onRetry: load };
}

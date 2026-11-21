import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/api';

/**
 * Loads data from the API with loading / error / pull-to-refresh state.
 * `deps` re-run the request (e.g. a filter); stale responses are ignored.
 */
export function useQuery<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const fetchData = useCallback(async (mode: 'initial' | 'refresh') => {
    const id = ++run.current;
    mode === 'refresh' ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const result = await loadRef.current();
      if (id === run.current) {
        setData(result);
      }
    } catch (e) {
      if (id === run.current) {
        setError(errorMessage(e));
      }
    } finally {
      if (id === run.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, refreshing, error, refresh: () => fetchData('refresh'), reload: () => fetchData('initial') };
}

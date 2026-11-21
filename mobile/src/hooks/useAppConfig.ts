import { useCallback, useEffect, useState } from 'react';

import { fetchAppConfig, type AppConfig } from '@/api';

export type AppConfigState = {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAppConfig(): AppConfigState {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchAppConfig(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setConfig(result);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unable to load app configuration');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt]);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  return { config, loading, error, refetch };
}

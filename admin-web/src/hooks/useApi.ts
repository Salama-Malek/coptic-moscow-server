import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

type Options = {
  /** Refetch when the window/tab regains focus. Defaults to true. */
  refetchOnFocus?: boolean;
};

export function useApiGet<T>(url: string, deps: unknown[] = [], opts: Options = {}) {
  const { refetchOnFocus = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Failed to load data';
      setError(msg);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Refetch on window focus and tab visibility change.
  // Skips the re-fetch during the initial mount to avoid duplicate requests.
  useEffect(() => {
    if (!refetchOnFocus) return;

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    const onFocus = () => refetch();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refetch, refetchOnFocus]);

  return { data, loading, error, refetch };
}

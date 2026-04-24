import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

type Options = {
  /** Refetch when the window/tab regains focus. Defaults to true. */
  refetchOnFocus?: boolean;
  /** Poll every N milliseconds while the tab is visible. Defaults to no polling. */
  pollInterval?: number;
};

export function useApiGet<T>(url: string, deps: unknown[] = [], opts: Options = {}) {
  const { refetchOnFocus = true, pollInterval } = opts;
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

  // Refetch on window focus + tab visibility change
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

  // Poll while the tab is visible — this is what makes the UI feel "live"
  // without WebSockets. Default cadence (set by callers) is 15s.
  useEffect(() => {
    if (!pollInterval || pollInterval <= 0) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refetch();
    }, pollInterval);
    return () => clearInterval(id);
  }, [refetch, pollInterval]);

  // Mutations emit a 'data-changed' CustomEvent — other hooks refetch immediately.
  // This makes same-tab changes feel instant (no wait for the next poll tick).
  useEffect(() => {
    const onChanged = () => refetch();
    window.addEventListener('data-changed', onChanged);
    return () => window.removeEventListener('data-changed', onChanged);
  }, [refetch]);

  return { data, loading, error, refetch };
}

/** Call after any successful mutation so every useApiGet in the app refetches. */
export function notifyDataChanged(): void {
  window.dispatchEvent(new CustomEvent('data-changed'));
}

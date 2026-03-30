import { useState, useEffect, useCallback, useRef } from "react";
import { cacheGet, cacheSet, cacheIsFresh } from "@/lib/cache";

interface UseCacheOptions<T> {
  /** Unique cache key */
  key: string;
  /** TTL in ms */
  ttl: number;
  /** Async function that fetches data */
  fetcher: () => Promise<T>;
  /** Skip fetching (e.g. no user) */
  enabled?: boolean;
}

/**
 * Cache-first hook: returns cached data immediately, fetches fresh data
 * in the background, and updates if changed.
 */
export function useCachedData<T>({ key, ttl, fetcher, enabled = true }: UseCacheOptions<T>) {
  const [data, setData] = useState<T | null>(() => (enabled ? cacheGet<T>(key) : null));
  const [loading, setLoading] = useState(!cacheGet<T>(key));
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading((prev) => (data === null ? true : prev));
      const fresh = await fetcher();
      setData(fresh);
      cacheSet(key, fresh, ttl);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [key, ttl, fetcher, enabled, data]);

  // Initial load: serve cache, then revalidate if stale
  useEffect(() => {
    if (!enabled) return;
    const cached = cacheGet<T>(key);
    if (cached !== null) {
      setData(cached);
      setLoading(false);
      // Background revalidate if stale
      if (!cacheIsFresh(key)) {
        refresh();
      }
    } else {
      refresh();
    }
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, refresh };
}

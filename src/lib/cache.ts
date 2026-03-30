/**
 * Global caching utility — localStorage with TTL support.
 * Used by hooks that don't use React Query directly.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // ms
}

const PREFIX = "app_cache_";

/** Default TTLs in milliseconds */
export const CacheTTL = {
  FEED: 3 * 60 * 1000,         // 3 min
  PROFILE: 10 * 60 * 1000,     // 10 min
  NOTIFICATIONS: 2 * 60 * 1000,// 2 min
  CARE: 5 * 60 * 1000,         // 5 min
  MARKETPLACE: 5 * 60 * 1000,  // 5 min
  CHAT_LIST: 60 * 1000,        // 1 min
  CHAT_MESSAGES: 30 * 1000,    // 30s
  PETS: 10 * 60 * 1000,        // 10 min
} as const;

function key(k: string) { return PREFIX + k; }

export function cacheGet<T>(cacheKey: string): T | null {
  try {
    const raw = localStorage.getItem(key(cacheKey));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Still return even if stale — caller uses stale-while-revalidate
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheIsFresh(cacheKey: string): boolean {
  try {
    const raw = localStorage.getItem(key(cacheKey));
    if (!raw) return false;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return Date.now() - entry.timestamp < entry.ttl;
  } catch {
    return false;
  }
}

export function cacheSet<T>(cacheKey: string, data: T, ttl: number): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    localStorage.setItem(key(cacheKey), JSON.stringify(entry));
  } catch {
    // Storage full — silently fail
  }
}

export function cacheRemove(cacheKey: string): void {
  localStorage.removeItem(key(cacheKey));
}

/** Remove all app cache entries */
export function cacheClear(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
}

/** Remove cache entries matching a prefix */
export function cacheInvalidate(prefix: string): void {
  const full = key(prefix);
  Object.keys(localStorage)
    .filter((k) => k.startsWith(full))
    .forEach((k) => localStorage.removeItem(k));
}

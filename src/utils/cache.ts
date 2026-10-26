// In-memory cache with stale-while-revalidate:
// - fresh (younger than ttlMs): served from memory;
// - stale (older than ttlMs, younger than staleTtlMs): served from memory immediately while one
//   background load replaces it, so clients don't wait for a slow scrape;
// - expired or missing: loaded, and concurrent requests for the same key share that one load.
import logger from '../winstonLogger.ts';

export type CacheStatus = 'HIT' | 'STALE' | 'MISS';

interface Entry {
  promise: Promise<unknown>;
  /** Set once the load succeeded. */
  settledAt?: number;
  /** A background revalidation in progress. */
  revalidating?: boolean;
}

export interface CacheResult<T> {
  promise: Promise<T>;
  status: CacheStatus;
}

export interface CacheOptions {
  ttlMs: number;
  /** How long a value may still be served while it is revalidated. Defaults to ttlMs (no SWR). */
  staleTtlMs?: number;
  maxEntries: number;
  /** Ignore a cached value and load again. An in-flight load is still shared. */
  refresh?: boolean;
  /** A refresh is ignored while the cached value is younger than this. */
  minRefreshIntervalMs?: number;
}

const store = new Map<string, Entry>();

const evict = (maxEntries: number, staleTtlMs: number): void => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.settledAt !== undefined && now - entry.settledAt >= staleTtlMs)
      store.delete(key);
  }
  // Map keeps insertion order, so the first keys are the oldest.
  for (const key of store.keys()) {
    if (store.size < maxEntries) break;
    store.delete(key);
  }
};

const startLoad = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const promise = Promise.resolve().then(load);
  store.set(key, { promise });
  promise.then(
    () => {
      if (store.get(key)?.promise === promise) {
        store.set(key, { promise, settledAt: Date.now() });
      }
    },
    () => {
      if (store.get(key)?.promise === promise) store.delete(key);
    },
  );
  return promise;
};

const revalidate = <T>(key: string, entry: Entry, load: () => Promise<T>) => {
  if (entry.revalidating) return;
  entry.revalidating = true;
  Promise.resolve()
    .then(load)
    .then(
      (value) => {
        // Only replace the entry we revalidated (a forced refresh may have replaced it).
        if (store.get(key) === entry) {
          store.set(key, {
            promise: Promise.resolve(value),
            settledAt: Date.now(),
          });
        }
      },
      (error: Error) => {
        // Keep serving the stale value; the next request past the TTL tries again.
        entry.revalidating = false;
        logger.warn(`[cache] revalidating ${key} failed: ${error.message}`);
      },
    );
};

export const cached = <T>(
  key: string,
  load: () => Promise<T>,
  {
    ttlMs,
    staleTtlMs = ttlMs,
    maxEntries,
    refresh = false,
    minRefreshIntervalMs = 0,
  }: CacheOptions,
): CacheResult<T> => {
  const entry = store.get(key);

  if (entry) {
    // In flight: share it.
    if (entry.settledAt === undefined) {
      return { promise: entry.promise as Promise<T>, status: 'HIT' };
    }
    const age = Date.now() - entry.settledAt;
    const refreshAllowed = refresh && age >= minRefreshIntervalMs;
    if (!refreshAllowed) {
      if (age < ttlMs) {
        return { promise: entry.promise as Promise<T>, status: 'HIT' };
      }
      if (age < staleTtlMs) {
        revalidate(key, entry, load);
        return { promise: entry.promise as Promise<T>, status: 'STALE' };
      }
    }
  }

  store.delete(key);
  evict(maxEntries, staleTtlMs);
  return { promise: startLoad(key, load), status: 'MISS' };
};

export const cacheSize = (): number => store.size;

export const clearCache = (): void => store.clear();

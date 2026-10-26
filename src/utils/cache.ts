// Tiny in-memory TTL cache that also shares in-flight promises,
// so concurrent requests for the same key trigger only one load.
interface Entry {
  promise: Promise<unknown>;
  expiresAt: number;
  settledAt?: number;
}

export interface CacheResult<T> {
  promise: Promise<T>;
  /** True when the value came from the cache (or an in-flight load). */
  hit: boolean;
}

export interface CacheOptions {
  ttlMs: number;
  maxEntries: number;
  /** Ignore a cached value and load again. An in-flight load is still shared. */
  refresh?: boolean;
  /** A refresh is ignored while the cached value is younger than this. */
  minRefreshIntervalMs?: number;
}

const store = new Map<string, Entry>();

const evict = (maxEntries: number): void => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  // Map keeps insertion order, so the first keys are the oldest.
  for (const key of store.keys()) {
    if (store.size < maxEntries) break;
    store.delete(key);
  }
};

export const cached = <T>(
  key: string,
  load: () => Promise<T>,
  {
    ttlMs,
    maxEntries,
    refresh = false,
    minRefreshIntervalMs = 0,
  }: CacheOptions,
): CacheResult<T> => {
  const now = Date.now();
  const entry = store.get(key);
  const fresh =
    entry?.settledAt === undefined ||
    now - entry.settledAt < minRefreshIntervalMs;
  if (entry && entry.expiresAt > now && (!refresh || fresh)) {
    return { promise: entry.promise as Promise<T>, hit: true };
  }

  store.delete(key);
  evict(maxEntries);
  const promise = Promise.resolve().then(load);
  store.set(key, { promise, expiresAt: Infinity });
  promise.then(
    () => {
      if (store.get(key)?.promise === promise) {
        const settledAt = Date.now();
        store.set(key, { promise, expiresAt: settledAt + ttlMs, settledAt });
      }
    },
    () => {
      if (store.get(key)?.promise === promise) store.delete(key);
    },
  );
  return { promise, hit: false };
};

export const cacheSize = (): number => store.size;

export const clearCache = (): void => store.clear();

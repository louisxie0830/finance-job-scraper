const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toList = (value: string | undefined, fallback: string[]): string[] =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;

// Express `trust proxy`: a hop count ("1" behind one proxy such as Render),
// true/false, or a comma-separated list of IPs/subnets/names like "loopback".
export const parseTrustProxy = (
  value: string | undefined,
  fallback: number | string[] = ['loopback'],
): number | boolean | string[] => {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return toList(trimmed, ['loopback']);
};

// Render sets RENDER=true. Its clients arrive through one proxy hop, never from localhost,
// so the localhost-only defaults would block every request there.
const onRender = process.env.RENDER === 'true';

const config = {
  port: toInt(process.env.PORT, 3000),
  // Only these client IPs may call the API. Use '*' to allow everyone.
  allowedIps: toList(
    process.env.ALLOWED_IPS,
    onRender ? ['*'] : ['127.0.0.1', '::1'],
  ),
  trustProxy: parseTrustProxy(
    process.env.TRUST_PROXY,
    onRender ? 1 : ['loopback'],
  ),
  // When set, every job route requires an `X-API-Key` header matching one of these keys.
  apiKeys: toList(process.env.API_KEYS, []),
  // Browser origins allowed to call the API cross-origin. Empty disables CORS.
  corsOrigins: toList(process.env.CORS_ORIGINS, []),
  docsEnabled: process.env.DOCS_ENABLED !== 'false',
  // Scrape every source once at startup so the first requests are served from the cache.
  warmUp: process.env.WARM_UP !== 'false',
  requestTimeoutMs: toInt(process.env.REQUEST_TIMEOUT_MS, 5 * 60 * 1000),
  cache: {
    ttlMs: toInt(process.env.CACHE_TTL_MS, 10 * 60 * 1000),
    // After ttlMs a cached result is still served instantly for this long while it is refreshed
    // in the background (stale-while-revalidate).
    staleTtlMs: toInt(process.env.CACHE_STALE_TTL_MS, 24 * 60 * 60 * 1000),
    maxEntries: toInt(process.env.CACHE_MAX_ENTRIES, 500),
    // `?refresh=true` is ignored for results younger than this, so clients can't hammer the bank sites.
    minRefreshIntervalMs: toInt(process.env.MIN_REFRESH_INTERVAL_MS, 60 * 1000),
  },
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
    limit: toInt(process.env.RATE_LIMIT_MAX, 100),
  },
  http: {
    timeoutMs: toInt(process.env.HTTP_TIMEOUT_MS, 30 * 1000),
    maxContentLength: toInt(
      process.env.HTTP_MAX_CONTENT_LENGTH,
      20 * 1024 * 1024,
    ),
    // Kept low: some sites (E.SUN) sit behind a WAF.
    concurrency: toInt(process.env.HTTP_CONCURRENCY, 3),
    // For public JSON APIs built for this traffic (Fubon, Workday).
    apiConcurrency: toInt(process.env.HTTP_API_CONCURRENCY, 8),
  },
  browser: {
    // Unset uses Puppeteer's chrome-headless-shell (`npx puppeteer browsers install chrome-headless-shell`).
    // Set it to use an installed full Chrome instead.
    executablePath: process.env.CHROME_PATH || undefined,
    concurrency: toInt(process.env.BROWSER_CONCURRENCY, 3),
    timeoutMs: toInt(process.env.BROWSER_TIMEOUT_MS, 60 * 1000),
  },
  logDir: process.env.LOG_DIR || 'logs',
};

export default config;

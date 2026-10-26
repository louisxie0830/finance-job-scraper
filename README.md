# Finance Job Scraper

**English** | [繁體中文](README.zh-TW.md)

A Node.js / TypeScript API that collects job listings from Taiwanese financial companies and serves them in one consistent format, with Swagger docs, caching and filtering.

## Table of Contents

- [Sources](#sources)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Security](#security)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Logging](#logging)
- [Contributing](#contributing)
- [License](#license)

## Sources

| Source id  | Company                                      | Method                                   |
| ---------- | -------------------------------------------- | ---------------------------------------- |
| `taishin`  | Taishin Shin Kong Financial Holding          | HTML page                                |
| `cathaybk` | Cathay Financial Holdings (all subsidiaries) | JSON API                                 |
| `esunfhc`  | E.SUN FHC                                    | JSON API                                 |
| `sinopac`  | SinoPac Holdings                             | Headless browser (chrome-headless-shell) |
| `fubon`    | Fubon Financial Holding (all subsidiaries)   | JSON API                                 |
| `ctbc`     | CTBC Financial Holding (all subsidiaries)    | Workday API                              |
| `kgi`      | KGI Financial Holding (all subsidiaries)     | Workday API                              |

## Installation

Requires Node.js 22.18 or later (Node 24 LTS recommended). The project is written in TypeScript; Node runs the `.ts` sources directly in development, and `npm run build` compiles them to `dist/` for production.

```bash
git clone https://github.com/louisxie0830/finance-job-scraper.git
cd finance-job-scraper
npm install
```

The SinoPac routes render pages with Puppeteer. Run `npx puppeteer browsers install chrome-headless-shell` once to download the lightweight headless browser, or point `CHROME_PATH` at an installed Chrome.

## Usage

```bash
npm run dev       # run src/ with auto-reload
npm run build     # compile TypeScript to dist/
npm start         # run the compiled server (dist/server.js)
npm test          # unit + API tests (node:test, no network access)
npm run typecheck # tsc --noEmit
npm run lint      # ESLint (typescript-eslint)
npm run format    # Prettier
```

With Docker. The image runs Node directly under `tini` with chrome-headless-shell; PM2 (`npm run run-prod`) is only for running outside a container. `API_KEYS` is optional:

```bash
docker compose up --build
```

GitHub Actions (`.github/workflows/ci.yml`) runs type checking, lint, formatting and tests on every push and pull request, and builds the Docker image, starts it and smoke-tests both an HTTP source and the headless-browser source.

## API

Interactive docs (Swagger UI) are served at **`/docs`**, and the OpenAPI 3.1 spec at `/openapi.json`.

| Route                                      | Description                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `GET /jobs`                                | All sources in one response, with per-source status                                                             |
| `GET /taishin/jobs`                        | Taishin Shin Kong Financial Holding                                                                             |
| `GET /cathaybk/jobs`                       | Cathay Financial Holdings (all subsidiaries)                                                                    |
| `GET /esunfhc/jobs`                        | E.SUN FHC                                                                                                       |
| `GET /sinopac/jobs`                        | SinoPac Holdings                                                                                                |
| `GET /fubon/jobs`                          | Fubon Financial Holding (all subsidiaries)                                                                      |
| `GET /ctbc/jobs`                           | CTBC Financial Holding (all subsidiaries)                                                                       |
| `GET /kgi/jobs`                            | KGI Financial Holding (all subsidiaries)                                                                        |
| `GET /{source}/job/description?jobId=<id>` | One job's description and location, for `sinopac`, `fubon`, `ctbc` and `kgi` (their lists have no descriptions) |
| `GET /health`                              | Liveness probe (public)                                                                                         |
| `GET /status`                              | Uptime, memory, cache and browser status (requires API key)                                                     |

Job routes accept these query parameters:

- `q`: space-separated keywords that must all appear in the title or description (title only for sources whose list has no descriptions).
- `area`: text that must appear in the location or `city`. 台 and 臺 match each other. KGI lists branch/building names as its location, so its jobs also carry a `city` mapped from KGI's official branch addresses.
- `refresh=true`: scrape again instead of using the cache.
- `source=taishin,sinopac` (`/jobs` only): which sources to include.

Every source is scraped once at startup, so the first requests are already served from memory. Results stay fresh for 10 minutes; after that the cached copy is still returned instantly (for up to 24 hours) while a single background scrape refreshes it (stale-while-revalidate). Concurrent requests for the same data share one scrape. The `X-Cache` response header shows `HIT`, `STALE` or `MISS`.

## Security

- **API keys**: when `API_KEYS` is set, every job route and `/status` require an `X-API-Key` header. Keys are compared in constant time and never accepted in the query string.
- **IP allowlist**: `ALLOWED_IPS` defaults to localhost only. On Render (detected via `RENDER=true`) it defaults to `*` and `TRUST_PROXY` to `1`, because requests arrive through Render's proxy.
- **CORS**: disabled unless `CORS_ORIGINS` lists the allowed origins.
- **Rate limiting**: per client IP. A `refresh=true` is ignored for results younger than `MIN_REFRESH_INTERVAL_MS`, so clients can't use the service to hammer the bank sites.
- **No internal details in errors**: clients get a reference id that matches `X-Request-Id` and the server log.
- **SSRF protection**: the headless browser refuses to load localhost, private-network and cloud-metadata addresses, and non-web schemes.
- **Bounded resources**: outgoing requests have timeouts, response-size and redirect limits, and the cache has a maximum size.
- **Security headers**: helmet sets CSP, `nosniff`, `Referrer-Policy: no-referrer` and hides `X-Powered-By`.
- **Container**: runs as a non-root user. `docker-compose.yml` also uses a read-only filesystem, drops all capabilities, sets `no-new-privileges` and publishes the port on the host's loopback only.

## Project Structure

```plaintext
finance-job-scraper/
├── .github/workflows/     # CI: tests and Docker image smoke test
├── src/
│   ├── server.ts          # Entry point: starts the server, warm-up, graceful shutdown
│   ├── app.ts             # Express app (middleware, docs, routes)
│   ├── config/            # Environment-based configuration
│   ├── docs/              # OpenAPI spec
│   ├── middleware/        # API key, IP allowlist, request id, timeout, errors
│   ├── plugin/            # axios, cheerio and shared Puppeteer browser
│   ├── routes/            # Job, health and status routes
│   ├── scrapers/          # One scraper per company (Workday shared by CTBC and KGI)
│   ├── utils/             # Cache, filtering, concurrency, network guard
│   ├── types.ts           # Shared types
│   └── winstonLogger.ts   # Winston logger
├── test/                  # Parser, API and security tests
├── Dockerfile
├── docker-compose.yml
└── ecosystem.config.cjs   # PM2 configuration (outside containers)
```

## Configuration

All settings are optional environment variables (see `src/config/index.ts`):

| Variable                  | Default                         | Description                                                                                |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `PORT`                    | `3000`                          | HTTP port                                                                                  |
| `API_KEYS`                | (none)                          | Comma-separated API keys; when set, required                                               |
| `ALLOWED_IPS`             | `127.0.0.1,::1` (`*` on Render) | Client IPs allowed to call the API (`*` allows all)                                        |
| `TRUST_PROXY`             | `loopback` (`1` on Render)      | Express `trust proxy`: hop count (`1` behind Render/one proxy), `true`/`false`, or IP list |
| `CORS_ORIGINS`            | (none)                          | Comma-separated browser origins allowed via CORS                                           |
| `DOCS_ENABLED`            | `true`                          | Serve `/docs` and `/openapi.json`                                                          |
| `WARM_UP`                 | `true`                          | Scrape every source once at startup                                                        |
| `CACHE_TTL_MS`            | `600000`                        | How long scrape results are cached                                                         |
| `CACHE_STALE_TTL_MS`      | `86400000`                      | How long an expired result is still served while it refreshes                              |
| `CACHE_MAX_ENTRIES`       | `500`                           | Maximum cached entries                                                                     |
| `MIN_REFRESH_INTERVAL_MS` | `60000`                         | Minimum age before `refresh=true` re-scrapes                                               |
| `REQUEST_TIMEOUT_MS`      | `300000`                        | Respond 503 when a request takes longer                                                    |
| `RATE_LIMIT_WINDOW_MS`    | `600000`                        | Rate limit window                                                                          |
| `RATE_LIMIT_MAX`          | `100`                           | Requests per window per IP                                                                 |
| `HTTP_TIMEOUT_MS`         | `30000`                         | Timeout for outgoing HTTP requests                                                         |
| `HTTP_MAX_CONTENT_LENGTH` | `20971520`                      | Maximum upstream response size in bytes                                                    |
| `HTTP_CONCURRENCY`        | `3`                             | Parallel outgoing requests per scrape                                                      |
| `HTTP_API_CONCURRENCY`    | `8`                             | Parallel requests for public JSON APIs (Fubon, Workday)                                    |
| `CHROME_PATH`             | (none)                          | Use an installed full Chrome instead of chrome-headless-shell                              |
| `BROWSER_CONCURRENCY`     | `3`                             | Pages rendered in parallel                                                                 |
| `BROWSER_TIMEOUT_MS`      | `60000`                         | Puppeteer launch/navigation timeout                                                        |
| `LOG_DIR`                 | `logs`                          | Directory for log files                                                                    |
| `LOG_LEVEL`               | `info`                          | Winston log level                                                                          |

## Logging

The application uses [Winston](https://github.com/winstonjs/winston). Logs are written to `logs/error.log` and `logs/combined.log`, and each line carries the request id.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss any changes or improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

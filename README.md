# Finance Job Scraper

This project is a finance job scraper built with Node.js, designed to extract job listings from various finance-related job portals.

## Table of Contents

- [Finance Job Scraper](#finance-job-scraper)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
  - [API Routes](#api-routes)
  - [Project Structure](#project-structure)
  - [Configuration](#configuration)
  - [Logging](#logging)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

Requires Node.js 22.18 or later (Node 24 LTS recommended). The project is written in TypeScript; Node runs the `.ts` sources directly in development, and `npm run build` compiles them to `dist/` for production.

```bash
git clone https://github.com/louisxie0830/finance-job-scraper.git
cd finance-job-scraper
npm install
```

The SinoPac routes render pages with Puppeteer. Point `CHROME_PATH` at a local Chrome, or run `npx puppeteer browsers install chrome` to download one.

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

With Docker (requires `API_KEYS`, e.g. in a `.env` file):

```bash
API_KEYS=change-me docker compose up --build
```

## API

Interactive docs (Swagger UI) are served at **`/docs`**, and the OpenAPI 3.1 spec at `/openapi.json`.

| Route                                     | Description                                                 |
| ----------------------------------------- | ----------------------------------------------------------- |
| `GET /jobs`                               | All sources in one response, with per-source status         |
| `GET /taishin/jobs`                       | Taishin Bank                                                |
| `GET /cathaybk/jobs`                      | Cathay Financial Holdings (all subsidiaries)                |
| `GET /esunfhc/jobs`                       | E.SUN FHC                                                   |
| `GET /sinopac/jobs`                       | SinoPac Holdings                                            |
| `GET /sinopac/job/description?jobId=<id>` | A SinoPac job's description and location                    |
| `GET /health`                             | Liveness probe (public)                                     |
| `GET /status`                             | Uptime, memory, cache and browser status (requires API key) |

Job routes accept these query parameters:

- `q`: space-separated keywords that must all appear in the title or description.
- `area`: text that must appear in the location. 台 and 臺 match each other.
- `refresh=true`: scrape again instead of using the cache.
- `source=taishin,sinopac` (`/jobs` only): which sources to include.

Results are cached in memory for 10 minutes by default, and concurrent requests for the same data share a single scrape. The `X-Cache` response header shows `HIT` or `MISS`.

## Security

- **API keys**: when `API_KEYS` is set, every job route and `/status` require an `X-API-Key` header. Keys are compared in constant time and never accepted in the query string.
- **IP allowlist**: `ALLOWED_IPS` defaults to localhost only.
- **CORS**: disabled unless `CORS_ORIGINS` lists the allowed origins.
- **Rate limiting**: per IP. A `refresh=true` is ignored for results younger than `MIN_REFRESH_INTERVAL_MS`, so clients can't use the service to hammer the bank sites.
- **No internal details in errors**: clients get a reference id that matches `X-Request-Id` and the server log.
- **SSRF protection**: the headless browser refuses to load localhost, private-network and cloud-metadata addresses, and non-web schemes.
- **Bounded resources**: outgoing requests have timeouts, response-size and redirect limits, and the cache has a maximum size.
- **Container**: runs as a non-root user with a read-only filesystem, all capabilities dropped and `no-new-privileges`. The port is published on the host's loopback only.

## Project Structure

```plaintext
finance-job-scraper/
├── src/
│   ├── server.ts          # Entry point: starts the server, graceful shutdown
│   ├── app.ts             # Express app (middleware, docs, routes)
│   ├── config/            # Environment-based configuration
│   ├── docs/              # OpenAPI spec
│   ├── middleware/        # API key, IP allowlist, request id, timeout, errors
│   ├── plugin/            # axios, cheerio and shared Puppeteer browser
│   ├── routes/            # Job, health and status routes
│   ├── scrapers/          # One scraper per company
│   ├── utils/             # Cache, filtering, concurrency, network guard
│   ├── types.ts           # Shared types
│   └── winstonLogger.ts   # Winston logger
├── test/                  # Parser, API and security tests
├── Dockerfile
├── docker-compose.yml
└── ecosystem.config.cjs   # PM2 configuration
```

## Configuration

All settings are optional environment variables (see `src/config/index.ts`):

| Variable                  | Default           | Description                                                                                |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `PORT`                    | `3000`            | HTTP port                                                                                  |
| `API_KEYS`                | (none)            | Comma-separated API keys; when set, required                                               |
| `ALLOWED_IPS`             | `127.0.0.1,::1`   | Client IPs allowed to call the API (`*` allows all)                                        |
| `TRUST_PROXY`             | `loopback`        | Express `trust proxy`: hop count (`1` behind Render/one proxy), `true`/`false`, or IP list |
| `CORS_ORIGINS`            | (none)            | Comma-separated browser origins allowed via CORS                                           |
| `DOCS_ENABLED`            | `true`            | Serve `/docs` and `/openapi.json`                                                          |
| `CACHE_TTL_MS`            | `600000`          | How long scrape results are cached                                                         |
| `CACHE_MAX_ENTRIES`       | `500`             | Maximum cached entries                                                                     |
| `MIN_REFRESH_INTERVAL_MS` | `60000`           | Minimum age before `refresh=true` re-scrapes                                               |
| `REQUEST_TIMEOUT_MS`      | `300000`          | Respond 503 when a request takes longer                                                    |
| `RATE_LIMIT_WINDOW_MS`    | `600000`          | Rate limit window                                                                          |
| `RATE_LIMIT_MAX`          | `100`             | Requests per window per IP                                                                 |
| `HTTP_TIMEOUT_MS`         | `30000`           | Timeout for outgoing HTTP requests                                                         |
| `HTTP_MAX_CONTENT_LENGTH` | `20971520`        | Maximum upstream response size in bytes                                                    |
| `HTTP_CONCURRENCY`        | `3`               | Parallel outgoing requests per scrape                                                      |
| `CHROME_PATH`             | Puppeteer default | Chrome executable for Puppeteer                                                            |
| `BROWSER_CONCURRENCY`     | `3`               | Pages rendered in parallel                                                                 |
| `BROWSER_TIMEOUT_MS`      | `60000`           | Puppeteer launch/navigation timeout                                                        |
| `LOG_DIR`                 | `logs`            | Directory for log files                                                                    |
| `LOG_LEVEL`               | `info`            | Winston log level                                                                          |

## Logging

The application uses [Winston](https://github.com/winstonjs/winston). Logs are written to `logs/error.log` and `logs/combined.log`, and each line carries the request id.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue to discuss any changes or improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

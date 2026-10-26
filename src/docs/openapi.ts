import sources from '../scrapers/index.ts';

const filterParams = [
  {
    name: 'q',
    in: 'query',
    description:
      'Space-separated keywords; every keyword must appear in the title or description (case-insensitive).',
    schema: { type: 'string', maxLength: 100 },
  },
  {
    name: 'area',
    in: 'query',
    description: 'Text that must appear in the job area, e.g. 台北.',
    schema: { type: 'string', maxLength: 100 },
  },
  {
    name: 'refresh',
    in: 'query',
    description:
      'Bypass the cache and scrape again. Ignored while the cached result is younger than MIN_REFRESH_INTERVAL_MS (60s by default).',
    schema: { type: 'boolean', default: false },
  },
];

const xCache = {
  'X-Cache': {
    description: 'HIT when served from the in-memory cache, MISS otherwise.',
    schema: { type: 'string', enum: ['HIT', 'MISS'] },
  },
};

const textError = (description: string) => ({
  description,
  content: { 'text/plain': { schema: { type: 'string' } } },
});

const protectedResponses = {
  401: textError(
    'Missing or invalid X-API-Key (only when API keys are configured)',
  ),
  403: textError('Client IP not in the allowlist'),
  429: textError('Rate limit exceeded'),
};

const security = [{ ApiKeyAuth: [] }];

const sourcePaths = Object.fromEntries(
  sources.map((source) => [
    `/${source.id}/jobs`,
    {
      get: {
        tags: ['Jobs'],
        summary: `Job listings from ${source.name}`,
        operationId: `get${source.id[0]?.toUpperCase()}${source.id.slice(1)}Jobs`,
        security,
        parameters: filterParams,
        responses: {
          200: {
            description: 'Job listings',
            headers: xCache,
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Job' },
                },
              },
            },
          },
          400: textError('Invalid query parameter'),
          ...protectedResponses,
          500: textError(
            'Scraping failed. The body carries a reference id for the server log.',
          ),
        },
      },
    },
  ]),
);

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Finance Job Scraper API',
    version: '2.0.0',
    description:
      'Scrapes job listings from Taiwanese finance companies. Results are cached in memory; concurrent identical requests share one scrape.',
  },
  tags: [{ name: 'Jobs' }, { name: 'System' }],
  paths: {
    '/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'Job listings from every source in one response',
        description:
          'Sources are scraped in parallel. A failing source is reported in `sources` instead of failing the whole request.',
        operationId: 'getAllJobs',
        security,
        parameters: [
          ...filterParams,
          {
            name: 'source',
            in: 'query',
            description: 'Comma-separated source ids to include.',
            schema: { type: 'string' },
            example: 'taishin,sinopac',
          },
        ],
        responses: {
          200: {
            description: 'At least one source succeeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AllJobs' },
              },
            },
          },
          400: textError('Invalid query parameter'),
          ...protectedResponses,
          502: {
            description: 'Every selected source failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AllJobs' },
              },
            },
          },
        },
      },
    },
    ...sourcePaths,
    '/sinopac/job/description': {
      get: {
        tags: ['Jobs'],
        summary: 'Description and location of a SinoPac job',
        operationId: 'getSinopacJobDetail',
        security,
        parameters: [
          {
            name: 'jobId',
            in: 'query',
            required: true,
            description: 'The `id` returned by /sinopac/jobs.',
            schema: { type: 'string', pattern: '^[\\w-]{1,64}$' },
            example: 'JOB0000718',
          },
          filterParams[2],
        ],
        responses: {
          200: {
            description: 'Job detail',
            headers: xCache,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JobDetail' },
              },
            },
          },
          400: textError('Missing or invalid jobId'),
          ...protectedResponses,
          500: textError(
            'Scraping failed. The body carries a reference id for the server log.',
          ),
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Liveness probe',
        operationId: 'getHealth',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', const: 'ok' } },
                },
              },
            },
          },
        },
      },
    },
    '/status': {
      get: {
        tags: ['System'],
        summary: 'Process, cache and browser status',
        operationId: 'getStatus',
        security,
        responses: {
          200: {
            description: 'Status details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Status' },
              },
            },
          },
          ...protectedResponses,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description:
          'Required only when the server sets API_KEYS. Use the Authorize button to send it from this page.',
      },
    },
    schemas: {
      Job: {
        type: 'object',
        required: ['source', 'title'],
        properties: {
          source: {
            type: 'string',
            enum: sources.map((source) => source.id),
          },
          title: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
          area: { type: ['string', 'null'] },
          link: { type: ['string', 'null'], format: 'uri' },
          id: {
            type: ['string', 'null'],
            description: 'Source-specific job id.',
          },
          key: { type: 'string', description: 'Job category key (E.SUN).' },
          category: {
            type: 'string',
            description: 'Job category name (E.SUN).',
          },
          applFormNo: {
            type: 'string',
            description: 'Application form number (Cathay, same as id).',
          },
        },
      },
      JobDetail: {
        type: 'object',
        properties: {
          description: { type: ['string', 'null'] },
          area: { type: ['string', 'null'] },
        },
      },
      SourceStatus: {
        type: 'object',
        required: ['id', 'name', 'ok', 'cached', 'count'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          ok: { type: 'boolean' },
          cached: { type: 'boolean' },
          count: {
            type: 'integer',
            description: 'Jobs from this source after filtering.',
          },
          error: { type: 'string' },
        },
      },
      AllJobs: {
        type: 'object',
        required: ['total', 'sources', 'jobs'],
        properties: {
          total: { type: 'integer' },
          sources: {
            type: 'array',
            items: { $ref: '#/components/schemas/SourceStatus' },
          },
          jobs: {
            type: 'array',
            items: { $ref: '#/components/schemas/Job' },
          },
        },
      },
      Status: {
        type: 'object',
        properties: {
          status: { type: 'string', const: 'ok' },
          uptimeSeconds: { type: 'integer' },
          memoryMb: { type: 'integer' },
          cacheEntries: { type: 'integer' },
          browser: {
            type: 'object',
            properties: {
              launched: { type: 'boolean' },
              pending: { type: 'integer' },
              running: { type: 'integer' },
            },
          },
        },
      },
    },
  },
};

export default openapi;

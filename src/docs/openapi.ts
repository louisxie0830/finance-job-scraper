import sources from '../scrapers/index.ts';
import type { SourceId } from '../types.ts';

export type DocLanguage = 'en' | 'zh-TW';

export const DOC_LANGUAGES: {
  lang: DocLanguage;
  name: string;
  path: string;
}[] = [
  { lang: 'en', name: 'English', path: '/openapi.json' },
  { lang: 'zh-TW', name: '繁體中文', path: '/openapi.zh-TW.json' },
];

const en = {
  title: 'Finance Job Scraper API',
  description:
    'Scrapes job listings from Taiwanese finance companies. Every source is scraped at startup; results stay fresh for 10 minutes and are then served instantly from the cache while one background scrape refreshes them. Concurrent identical requests share one scrape.',
  tagJobs: 'Jobs',
  tagSystem: 'System',
  sourceName: {
    taishin: 'Taishin Shin Kong Financial Holding',
    cathaybk: 'Cathay Financial Holdings',
    esunfhc: 'E.SUN FHC',
    sinopac: 'SinoPac Holdings',
    fubon: 'Fubon Financial Holding',
    ctbc: 'CTBC Financial Holding',
    kgi: 'KGI Financial Holding',
  } satisfies Record<SourceId, string>,
  q: 'Space-separated keywords; every keyword must appear in the title or description (case-insensitive). Title only for sources whose list has no descriptions.',
  area: 'Text that must appear in the job area or city, e.g. 台北. 台 and 臺 match each other.',
  refresh:
    'Bypass the cache and scrape again. Ignored while the cached result is younger than MIN_REFRESH_INTERVAL_MS (60s by default).',
  source: 'Comma-separated source ids to include.',
  xCache:
    'HIT: served from the cache. STALE: an expired copy served instantly while it refreshes in the background. MISS: scraped for this request.',
  error401: 'Missing or invalid X-API-Key (only when API keys are configured)',
  error403: 'Client IP not in the allowlist',
  error429: 'Rate limit exceeded',
  error400: 'Invalid query parameter',
  error400JobId: 'Missing or invalid jobId',
  error500:
    'Scraping failed. The body carries a reference id for the server log.',
  jobsSummary: (name: string) => `Job listings from ${name}`,
  jobsOk: 'Job listings',
  detailSummary: (name: string) => `Description and location of a ${name} job`,
  detailJobId: (id: string) => `The \`id\` returned by /${id}/jobs.`,
  detailOk: 'Job detail',
  allSummary: 'Job listings from every source in one response',
  allDescription:
    'Sources are scraped in parallel. A failing source is reported in `sources` instead of failing the whole request.',
  allOk: 'At least one source succeeded',
  all502: 'Every selected source failed',
  healthSummary: 'Liveness probe',
  healthOk: 'Service is up',
  statusSummary: 'Process, cache and browser status',
  statusOk: 'Status details',
  apiKey:
    'Required only when the server sets API_KEYS. Use the Authorize button to send it from this page.',
  fieldSource: 'Source id.',
  fieldTitle: 'Job title.',
  fieldDescription: 'Job description, when the source list includes it.',
  fieldArea: 'Location as written by the source.',
  fieldCity: 'City or county, when `area` is a branch/building name (KGI).',
  fieldLink: 'Public link to the job or its listing page.',
  fieldId: 'Source-specific job id.',
  fieldCompany: 'Hiring company within the group (Fubon, CTBC, KGI).',
  fieldKey: 'Job category key (E.SUN).',
  fieldCategory: 'Job category name (E.SUN).',
  fieldApplFormNo: 'Application form number (Cathay, same as id).',
  fieldTotal: 'Number of jobs after filtering.',
  fieldCount: 'Jobs from this source after filtering.',
  fieldOk: 'Whether this source was scraped successfully.',
  fieldCached: 'Whether the result came from the cache.',
  fieldError: 'Error with a reference id, when the source failed.',
};

type Messages = typeof en;

const zhTW: Messages = {
  title: '金融業職缺爬蟲 API',
  description:
    '彙整台灣金融業者的職缺。服務啟動時會先抓取每個來源；資料 10 分鐘內視為最新，之後仍會立即從快取回傳，同時在背景重新抓取一次。同時間相同的請求只會觸發一次抓取。',
  tagJobs: '職缺',
  tagSystem: '系統',
  sourceName: {
    taishin: '台新新光金控',
    cathaybk: '國泰金控',
    esunfhc: '玉山金控',
    sinopac: '永豐金控',
    fubon: '富邦金控',
    ctbc: '中信金控',
    kgi: '凱基金控',
  },
  q: '以空白分隔的關鍵字，全部都要出現在職稱或職缺內容中（不分大小寫）。列表沒有職缺內容的來源只比對職稱。',
  area: '地點或城市須包含的文字，例如「台北」。「台」與「臺」視為相同。',
  refresh:
    '不使用快取，重新抓取。快取資料比 MIN_REFRESH_INTERVAL_MS（預設 60 秒）還新時會被忽略。',
  source: '要包含的來源 id，以逗號分隔。',
  xCache:
    'HIT：從快取回傳。STALE：快取已過期，先立即回傳舊資料，同時在背景更新。MISS：這次請求才實際抓取。',
  error401: '缺少或錯誤的 X-API-Key（僅在有設定 API key 時）',
  error403: '用戶端 IP 不在白名單內',
  error429: '超過請求次數上限',
  error400: '查詢參數不正確',
  error400JobId: '缺少 jobId 或格式不正確',
  error500: '抓取失敗。回應內容附有參考編號，可對照伺服器日誌。',
  jobsSummary: (name: string) => `${name} 職缺`,
  jobsOk: '職缺列表',
  detailSummary: (name: string) => `${name}單一職缺的內容與地點`,
  detailJobId: (id: string) => `/${id}/jobs 回傳的 \`id\`。`,
  detailOk: '職缺內容',
  allSummary: '一次取得所有來源的職缺',
  allDescription:
    '各來源同時抓取。某個來源失敗時只會在 `sources` 中標示，不會讓整個請求失敗。',
  allOk: '至少一個來源成功',
  all502: '所有選定的來源都失敗',
  healthSummary: '存活檢查',
  healthOk: '服務正常',
  statusSummary: '程序、快取與瀏覽器狀態',
  statusOk: '狀態資訊',
  apiKey: '只有伺服器設定 API_KEYS 時才需要。可用本頁的 Authorize 按鈕帶入。',
  fieldSource: '來源 id。',
  fieldTitle: '職稱。',
  fieldDescription: '職缺內容（來源列表有提供時）。',
  fieldArea: '來源網站原本寫的地點。',
  fieldCity: '縣市；當 `area` 是分行或大樓名稱時提供（凱基）。',
  fieldLink: '職缺或職缺列表頁的公開連結。',
  fieldId: '來源網站的職缺 id。',
  fieldCompany: '集團內的招募公司（富邦、中信、凱基）。',
  fieldKey: '職缺類別代碼（玉山）。',
  fieldCategory: '職缺類別名稱（玉山）。',
  fieldApplFormNo: '應徵表單編號（國泰，與 id 相同）。',
  fieldTotal: '篩選後的職缺數。',
  fieldCount: '此來源篩選後的職缺數。',
  fieldOk: '此來源是否抓取成功。',
  fieldCached: '結果是否來自快取。',
  fieldError: '來源失敗時的錯誤訊息，附參考編號。',
};

const MESSAGES: Record<DocLanguage, Messages> = { en, 'zh-TW': zhTW };

const DETAIL_EXAMPLES: Partial<Record<string, string>> = {
  sinopac: 'JOB0000718',
  fubon: 'BUFTW0022120260001',
  ctbc: 'IC_JR9437',
};

const pascal = (id: string) => `${id[0]?.toUpperCase()}${id.slice(1)}`;

const nullableString = (description: string) => ({
  type: ['string', 'null'],
  description,
});

const buildOpenApi = (lang: DocLanguage) => {
  const t = MESSAGES[lang];

  const filterParams = [
    {
      name: 'q',
      in: 'query',
      description: t.q,
      schema: { type: 'string', maxLength: 100 },
    },
    {
      name: 'area',
      in: 'query',
      description: t.area,
      schema: { type: 'string', maxLength: 100 },
    },
  ];
  const refreshParam = {
    name: 'refresh',
    in: 'query',
    description: t.refresh,
    schema: { type: 'boolean', default: false },
  };

  const xCache = {
    'X-Cache': {
      description: t.xCache,
      schema: { type: 'string', enum: ['HIT', 'STALE', 'MISS'] },
    },
  };

  const textError = (description: string) => ({
    description,
    content: { 'text/plain': { schema: { type: 'string' } } },
  });

  const protectedResponses = {
    401: textError(t.error401),
    403: textError(t.error403),
    429: textError(t.error429),
  };

  const security = [{ ApiKeyAuth: [] }];
  const tagJobs = [t.tagJobs];
  const tagSystem = [t.tagSystem];

  const sourcePaths = Object.fromEntries(
    sources.map((source) => [
      `/${source.id}/jobs`,
      {
        get: {
          tags: tagJobs,
          summary: t.jobsSummary(t.sourceName[source.id]),
          operationId: `get${pascal(source.id)}Jobs`,
          security,
          parameters: [...filterParams, refreshParam],
          responses: {
            200: {
              description: t.jobsOk,
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
            400: textError(t.error400),
            ...protectedResponses,
            500: textError(t.error500),
          },
        },
      },
    ]),
  );

  const detailPaths = Object.fromEntries(
    sources.flatMap((source) =>
      source.detail
        ? [
            [
              `/${source.id}/job/description`,
              {
                get: {
                  tags: tagJobs,
                  summary: t.detailSummary(t.sourceName[source.id]),
                  operationId: `get${pascal(source.id)}JobDetail`,
                  security,
                  parameters: [
                    {
                      name: 'jobId',
                      in: 'query',
                      required: true,
                      description: t.detailJobId(source.id),
                      schema: {
                        type: 'string',
                        pattern: source.detail.idPattern.source,
                      },
                      example: DETAIL_EXAMPLES[source.id],
                    },
                    refreshParam,
                  ],
                  responses: {
                    200: {
                      description: t.detailOk,
                      headers: xCache,
                      content: {
                        'application/json': {
                          schema: { $ref: '#/components/schemas/JobDetail' },
                        },
                      },
                    },
                    400: textError(t.error400JobId),
                    ...protectedResponses,
                    500: textError(t.error500),
                  },
                },
              },
            ],
          ]
        : [],
    ),
  );

  return {
    openapi: '3.1.0',
    info: {
      title: t.title,
      version: '2.0.0',
      description: t.description,
    },
    tags: [{ name: t.tagJobs }, { name: t.tagSystem }],
    paths: {
      '/jobs': {
        get: {
          tags: tagJobs,
          summary: t.allSummary,
          description: t.allDescription,
          operationId: 'getAllJobs',
          security,
          parameters: [
            ...filterParams,
            refreshParam,
            {
              name: 'source',
              in: 'query',
              description: t.source,
              schema: { type: 'string' },
              example: 'taishin,sinopac',
            },
          ],
          responses: {
            200: {
              description: t.allOk,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AllJobs' },
                },
              },
            },
            400: textError(t.error400),
            ...protectedResponses,
            502: {
              description: t.all502,
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
      ...detailPaths,
      '/health': {
        get: {
          tags: tagSystem,
          summary: t.healthSummary,
          operationId: 'getHealth',
          responses: {
            200: {
              description: t.healthOk,
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
          tags: tagSystem,
          summary: t.statusSummary,
          operationId: 'getStatus',
          security,
          responses: {
            200: {
              description: t.statusOk,
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
          description: t.apiKey,
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
              description: t.fieldSource,
            },
            title: nullableString(t.fieldTitle),
            description: nullableString(t.fieldDescription),
            area: nullableString(t.fieldArea),
            city: nullableString(t.fieldCity),
            link: { ...nullableString(t.fieldLink), format: 'uri' },
            id: nullableString(t.fieldId),
            company: nullableString(t.fieldCompany),
            key: { type: 'string', description: t.fieldKey },
            category: { type: 'string', description: t.fieldCategory },
            applFormNo: { type: 'string', description: t.fieldApplFormNo },
          },
        },
        JobDetail: {
          type: 'object',
          properties: {
            description: nullableString(t.fieldDescription),
            area: nullableString(t.fieldArea),
          },
        },
        SourceStatus: {
          type: 'object',
          required: ['id', 'name', 'ok', 'cached', 'count'],
          properties: {
            id: { type: 'string', description: t.fieldSource },
            name: { type: 'string' },
            ok: { type: 'boolean', description: t.fieldOk },
            cached: { type: 'boolean', description: t.fieldCached },
            count: { type: 'integer', description: t.fieldCount },
            error: { type: 'string', description: t.fieldError },
          },
        },
        AllJobs: {
          type: 'object',
          required: ['total', 'sources', 'jobs'],
          properties: {
            total: { type: 'integer', description: t.fieldTotal },
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
};

// Built once per language at startup; the spec never changes at runtime.
export const openapiByLanguage: Record<
  DocLanguage,
  ReturnType<typeof buildOpenApi>
> = { en: buildOpenApi('en'), 'zh-TW': buildOpenApi('zh-TW') };

export default openapiByLanguage.en;

import { Router, type Request, type Response } from 'express';
import config from '../config/index.ts';
import { JOB_ID_PATTERN, scrapeJobDetail } from '../scrapers/sinopac.ts';
import { cached } from '../utils/cache.ts';
import { HttpError } from '../utils/httpError.ts';
import { filterJobs, type JobFilter } from '../utils/jobFilter.ts';
import logger from '../winstonLogger.ts';
import type { Source } from '../types.ts';

const MAX_FILTER_LENGTH = 100;

const queryString = (req: Request, name: string): string | undefined => {
  const value: unknown = req.query[name];
  return typeof value === 'string' ? value : undefined;
};

const parseFilter = (req: Request): JobFilter => {
  const q = queryString(req, 'q');
  const area = queryString(req, 'area');
  if ((q?.length ?? 0) > MAX_FILTER_LENGTH)
    throw new HttpError(400, `"q" must be at most ${MAX_FILTER_LENGTH} chars`);
  if ((area?.length ?? 0) > MAX_FILTER_LENGTH)
    throw new HttpError(
      400,
      `"area" must be at most ${MAX_FILTER_LENGTH} chars`,
    );
  return { q, area };
};

const SOURCE_LIST_PATTERN = /^[a-z,]{1,100}$/;

const wantsRefresh = (req: Request): boolean =>
  ['1', 'true'].includes(queryString(req, 'refresh') ?? '');

// Clients get a reference id; the underlying error (URLs, DNS names, parser details) stays in the log.
const scrapeFailed = (
  req: Request,
  res: Response,
  label: string,
  error: unknown,
) => {
  logger.error(`[${label}] [${req.id}] ${(error as Error).message}`);
  res.status(500).send(`Error occurred while scraping jobs (ref: ${req.id})`);
};

const loadSource = (source: Source, refresh: boolean) =>
  cached(`jobs:${source.id}`, source.scrape, { ...config.cache, refresh });

const sourceJobsHandler =
  (source: Source) =>
  async (req: Request, res: Response): Promise<void> => {
    const filter = parseFilter(req);
    const { promise, hit } = loadSource(source, wantsRefresh(req));
    try {
      const jobs = await promise;
      res.set('X-Cache', hit ? 'HIT' : 'MISS');
      res.json(filterJobs(jobs, filter));
    } catch (error) {
      scrapeFailed(req, res, source.id, error);
    }
  };

const allJobsHandler =
  (sources: Source[]) =>
  async (req: Request, res: Response): Promise<void> => {
    const filter = parseFilter(req);
    const refresh = wantsRefresh(req);
    const sourceParam = queryString(req, 'source');
    if (sourceParam !== undefined && !SOURCE_LIST_PATTERN.test(sourceParam))
      throw new HttpError(400, 'Unknown "source"');
    const requested = sourceParam?.split(',').filter(Boolean);
    const selected = requested
      ? sources.filter((source) => requested.includes(source.id))
      : sources;
    if (selected.length === 0) throw new HttpError(400, 'Unknown "source"');

    const results = await Promise.all(
      selected.map(async (source) => {
        const { promise, hit } = loadSource(source, refresh);
        try {
          return { source, hit, jobs: await promise };
        } catch (error) {
          logger.error(
            `[${source.id}] [${req.id}] ${(error as Error).message}`,
          );
          return { source, hit, error: `Scraping failed (ref: ${req.id})` };
        }
      }),
    );

    const jobs = filterJobs(
      results.flatMap((result) => result.jobs ?? []),
      filter,
    );
    const ok = results.some((result) => result.jobs);
    res.status(ok ? 200 : 502).json({
      total: jobs.length,
      sources: results.map(({ source, hit, jobs, error }) => ({
        id: source.id,
        name: source.name,
        ok: !error,
        cached: hit,
        count: jobs ? filterJobs(jobs, filter).length : 0,
        ...(error && { error }),
      })),
      jobs,
    });
  };

const sinopacDetailHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const jobId = queryString(req, 'jobId');
  if (!jobId || !JOB_ID_PATTERN.test(jobId)) {
    throw new HttpError(400, 'Job ID is required');
  }
  const { promise, hit } = cached(
    `sinopac-detail:${jobId}`,
    () => scrapeJobDetail(jobId),
    { ...config.cache, refresh: wantsRefresh(req) },
  );
  try {
    const detail = await promise;
    res.set('X-Cache', hit ? 'HIT' : 'MISS');
    res.json(detail);
  } catch (error) {
    scrapeFailed(req, res, 'sinopac-detail', error);
  }
};

export const createJobsRouter = (sources: Source[]): Router => {
  const router = Router();
  router.get('/jobs', allJobsHandler(sources));
  for (const source of sources) {
    router.get(`/${source.id}/jobs`, sourceJobsHandler(source));
  }
  router.get('/sinopac/job/description', sinopacDetailHandler);
  return router;
};

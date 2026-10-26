import config from '../config/index.ts';
import axios from '../plugin/axiosInstance.ts';
import mapWithConcurrency from '../utils/concurrency.ts';
import type { Job, JobDetail, Source } from '../types.ts';

// careers.fubon.com is an Angular SPA backed by this public JSON API.
const API_BASE = 'https://careers.fubon.com/api/jobs';
const JOB_LINK_BASE = 'https://careers.fubon.com/jobs/search';
const MAX_PAGES = 200; // 10 jobs per page, fixed by the API.

export const FUBON_ID_PATTERN = /^[A-Za-z0-9]{1,40}$/;

interface RawJob {
  jobId?: unknown;
  buName?: unknown;
  jobName?: unknown;
  workLocation?: unknown;
  isOpen?: unknown;
}

interface SearchResponse {
  items?: RawJob[];
  pagination?: { totalPages?: number };
}

interface DetailResponse {
  description?: unknown;
  otherDesc?: unknown;
  workLocation?: unknown;
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

// workLocation is "台北市中山區\n(民族二路95號9樓)"; keep the city/district line.
const firstLine = (value: unknown): string | null =>
  str(str(value)?.split(/\r?\n/)[0]);

const headers = { Accept: 'application/json' };

export const parseSearch = (data: SearchResponse): Job[] => {
  if (!Array.isArray(data?.items))
    throw new Error('Unexpected Fubon response.');
  return data.items
    .filter((raw) => raw.isOpen !== false)
    .flatMap((raw) => {
      const id = str(raw.jobId);
      if (!id) return [];
      return [
        {
          source: 'fubon',
          title: str(raw.jobName),
          area: firstLine(raw.workLocation),
          link: `${JOB_LINK_BASE}/${encodeURIComponent(id)}`,
          id,
          company: str(raw.buName),
        },
      ];
    });
};

export const parseDetail = (data: DetailResponse): JobDetail => {
  const description = [str(data?.description), str(data?.otherDesc)]
    .filter(Boolean)
    .join('\n\n')
    .replace(/\r\n/g, '\n');
  return {
    description: description || null,
    area: str(data?.workLocation),
  };
};

const fetchPage = async (page: number): Promise<SearchResponse> => {
  const { data } = await axios.get<SearchResponse>(`${API_BASE}/search`, {
    params: { QuickFilter: 0, Page: page },
    headers,
  });
  return data;
};

const scrape = async (): Promise<Job[]> => {
  const first = await fetchPage(1);
  const totalPages = Math.min(first.pagination?.totalPages ?? 1, MAX_PAGES);
  const rest = await mapWithConcurrency(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => i + 2),
    config.http.concurrency,
    async (page) => parseSearch(await fetchPage(page)),
  );

  // Paging can shift while jobs are added, so de-duplicate by id.
  const seen = new Set<string>();
  const jobs = [parseSearch(first), ...rest].flat().filter((job) => {
    if (!job.id || seen.has(job.id)) return false;
    seen.add(job.id);
    return true;
  });
  if (jobs.length === 0) throw new Error('No job listings found.');
  return jobs;
};

const scrapeDetail = async (jobId: string): Promise<JobDetail> => {
  const { data } = await axios.get<DetailResponse>(
    `${API_BASE}/${encodeURIComponent(jobId)}`,
    { headers },
  );
  return parseDetail(data);
};

const fubon: Source = {
  id: 'fubon',
  name: 'Fubon Financial Holding',
  scrape,
  detail: { idPattern: FUBON_ID_PATTERN, scrape: scrapeDetail },
};

export default fubon;

import config from '../config/index.ts';
import axios from '../plugin/axiosInstance.ts';
import mapWithConcurrency from '../utils/concurrency.ts';
import htmlToText from '../utils/htmlToText.ts';
import type { Job, JobDetail, Source, SourceId } from '../types.ts';

// Workday's public career-site API ("CXS"), shared by every company hosted on myworkdayjobs.com.
const PAGE_SIZE = 20; // Workday rejects larger pages.
const MAX_PAGES_PER_COMPANY = 100;

/** Job ids are Workday paths like "IC_JR9437" or "-KGIFH-Building/XMLNAME----_JR106453". */
export const WORKDAY_ID_PATTERN = /^[\w-]{1,120}(?:\/[\w-]{1,120})?$/;

export interface WorkdaySite {
  id: SourceId;
  name: string;
  /** e.g. "ctbcholding.wd3.myworkdayjobs.com" */
  host: string;
  tenant: string;
  site: string;
  /** Maps location names (often building or branch names) to a city. */
  cities?: Record<string, string>;
}

interface Posting {
  title?: unknown;
  externalPath?: unknown;
  locationsText?: unknown;
}

interface FacetValue {
  id?: unknown;
  descriptor?: unknown;
  count?: unknown;
}

interface JobsResponse {
  total?: number;
  jobPostings?: Posting[];
  facets?: { facetParameter?: string; values?: FacetValue[] }[];
}

interface DetailResponse {
  jobPostingInfo?: { jobDescription?: unknown; location?: unknown };
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const headers = {
  Accept: 'application/json',
  'Accept-Language': 'zh-TW',
};

export const parsePostings = (
  site: WorkdaySite,
  postings: Posting[] | undefined,
  company: string | null,
): Job[] =>
  (postings ?? []).flatMap((posting) => {
    const path = str(posting.externalPath);
    if (!path?.startsWith('/job/')) return [];
    const area = str(posting.locationsText);
    return [
      {
        source: site.id,
        title: str(posting.title),
        area,
        ...(site.cities && { city: (area && site.cities[area]) || null }),
        link: `https://${site.host}/zh-TW/${site.site}${path}`,
        id: path.slice('/job/'.length),
        company,
      },
    ];
  });

export const createWorkdaySource = (site: WorkdaySite): Source => {
  const apiBase = `https://${site.host}/wday/cxs/${site.tenant}/${site.site}`;

  const fetchPage = async (
    offset: number,
    appliedFacets: Record<string, string[]> = {},
  ): Promise<JobsResponse> => {
    const { data } = await axios.post<JobsResponse>(
      `${apiBase}/jobs`,
      { appliedFacets, limit: PAGE_SIZE, offset, searchText: '' },
      { headers },
    );
    if (!Array.isArray(data?.jobPostings))
      throw new Error('Unexpected Workday response.');
    return data;
  };

  // Fetching per hiring company tells us each job's company without a detail request per job.
  // Every (company, page) request goes through one shared pool, so companies load in parallel.
  const scrape = async (): Promise<Job[]> => {
    const first = await fetchPage(0);
    const companies = (
      first.facets?.find((facet) => facet.facetParameter === 'hiringCompany')
        ?.values ?? []
    ).flatMap((facet) => {
      const companyId = str(facet.id);
      const count = typeof facet.count === 'number' ? facet.count : 0;
      return companyId && count > 0
        ? [{ companyId, name: str(facet.descriptor), count }]
        : [];
    });

    const requests = companies.flatMap(({ companyId, name, count }) =>
      Array.from(
        {
          length: Math.min(Math.ceil(count / PAGE_SIZE), MAX_PAGES_PER_COMPANY),
        },
        (_, page) => ({ companyId, name, offset: page * PAGE_SIZE }),
      ),
    );

    const jobs =
      requests.length > 0
        ? (
            await mapWithConcurrency(
              requests,
              config.http.apiConcurrency,
              async ({ companyId, name, offset }) => {
                const data = await fetchPage(offset, {
                  hiringCompany: [companyId],
                });
                return parsePostings(site, data.jobPostings, name);
              },
            )
          ).flat()
        : parsePostings(site, first.jobPostings, null);
    if (jobs.length === 0) throw new Error('No job listings found.');

    // A job can be listed under more than one company; keep the first.
    const seen = new Set<string>();
    return jobs.filter((job) => {
      if (!job.id || seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });
  };

  const scrapeDetail = async (jobId: string): Promise<JobDetail> => {
    const { data } = await axios.get<DetailResponse>(
      `${apiBase}/job/${jobId}`,
      {
        headers,
      },
    );
    const info = data?.jobPostingInfo;
    if (!info) throw new Error('Unexpected Workday response.');
    return {
      description: htmlToText(str(info.jobDescription)),
      area: str(info.location),
    };
  };

  return {
    id: site.id,
    name: site.name,
    scrape,
    detail: { idPattern: WORKDAY_ID_PATTERN, scrape: scrapeDetail },
  };
};

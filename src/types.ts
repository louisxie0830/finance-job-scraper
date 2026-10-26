export type SourceId =
  'taishin' | 'cathaybk' | 'esunfhc' | 'sinopac' | 'fubon' | 'ctbc' | 'kgi';

export interface Job {
  source: SourceId;
  title: string | null;
  description?: string | null;
  area?: string | null;
  /** City or county, when `area` is a site/branch name rather than a place (KGI). */
  city?: string | null;
  link?: string | null;
  /** Source-specific job id, when the site exposes one. */
  id?: string | null;
  /** Hiring company within the group (Fubon, CTBC, KGI). */
  company?: string | null;
  /** E.SUN job category key. */
  key?: string;
  /** Human-readable job category (E.SUN). */
  category?: string;
  /** Cathay application form number (same as `id`, kept for compatibility). */
  applFormNo?: string;
}

export interface JobDetail {
  description: string | null;
  area: string | null;
}

export interface Source {
  id: SourceId;
  name: string;
  scrape: () => Promise<Job[]>;
  /** Sources whose list has no descriptions expose them per job. */
  detail?: {
    /** Validates the `id` from the job list before it is put into a URL. */
    idPattern: RegExp;
    scrape: (jobId: string) => Promise<JobDetail>;
  };
}

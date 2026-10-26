export type SourceId = 'taishin' | 'cathaybk' | 'esunfhc' | 'sinopac';

export interface Job {
  source: SourceId;
  title: string | null;
  description?: string | null;
  area?: string | null;
  link?: string | null;
  /** Source-specific job id, when the site exposes one. */
  id?: string | null;
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
}

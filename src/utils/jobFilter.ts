import type { Job } from '../types.ts';

export interface JobFilter {
  /** Keywords that must all appear in the title or description. */
  q?: string;
  /** Text that must appear in the area. */
  area?: string;
}

// Sites mix 臺 and 台 (臺北 vs 台北), so match them as the same character.
const normalize = (text: string | null | undefined): string =>
  (text ?? '').toLowerCase().replaceAll('臺', '台');

export const filterJobs = (jobs: Job[], { q, area }: JobFilter): Job[] => {
  const keywords = normalize(q).split(/\s+/).filter(Boolean);
  const areaText = normalize(area).trim();
  if (keywords.length === 0 && !areaText) return jobs;

  return jobs.filter((job) => {
    const text = `${normalize(job.title)} ${normalize(job.description)}`;
    return (
      keywords.every((keyword) => text.includes(keyword)) &&
      (!areaText || normalize(job.area).includes(areaText))
    );
  });
};

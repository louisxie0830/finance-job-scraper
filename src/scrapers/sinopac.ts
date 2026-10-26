import loadRenderedHtml from '../plugin/puppeteerLoader.ts';
import cheerioLoad from '../plugin/cheerioLoader.ts';
import type { Job, JobDetail, Source } from '../types.ts';

const BASE_URL = 'https://bankrecruit.sinopac.com';
const jobSearchUrl = `${BASE_URL}/jobSearch/`;

const JOB_LINK_SELECTOR = 'a.mb-2.line-clamp-2.text-lg.font-bold.text-gray-700';
const DESCRIPTION_SELECTOR =
  'p.col-span-12.list-inside.list-decimal.whitespace-pre-line.break-words.text-gray-600';

const JOB_ID_PATTERN = /^[\w-]{1,64}$/;

export const parseJobs = (data: string): Job[] => {
  const $ = cheerioLoad(data);
  const jobElements = $(JOB_LINK_SELECTOR);
  if (jobElements.length === 0)
    throw new Error('No job listings found on the page.');

  return jobElements.toArray().map((element) => {
    const href = $(element).attr('href');
    return {
      source: 'sinopac',
      title: $(element).text().trim() || null,
      link: href ? `${BASE_URL}${href}` : null,
      id: href?.split('=')[1] || null,
    };
  });
};

export const parseJobDetail = (data: string): JobDetail => {
  const $ = cheerioLoad(data);
  return {
    description: $(DESCRIPTION_SELECTOR).text() || null,
    area:
      $('h5')
        .filter((index, element) => $(element).text().includes('上班地點'))
        .next()
        .text()
        .trim() || null,
  };
};

const scrapeJobDetail = async (jobId: string): Promise<JobDetail> => {
  const url = `${BASE_URL}/jobDetail?jobId=${encodeURIComponent(jobId)}`;
  return parseJobDetail(
    await loadRenderedHtml(url, { waitForSelector: DESCRIPTION_SELECTOR }),
  );
};

const sinopac: Source = {
  id: 'sinopac',
  name: 'SinoPac Holdings',
  scrape: async () =>
    parseJobs(
      await loadRenderedHtml(jobSearchUrl, {
        waitForSelector: JOB_LINK_SELECTOR,
      }),
    ),
  detail: { idPattern: JOB_ID_PATTERN, scrape: scrapeJobDetail },
};

export default sinopac;

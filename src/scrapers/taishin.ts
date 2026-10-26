import { fetchHtml } from '../plugin/axiosInstance.ts';
import cheerioLoad from '../plugin/cheerioLoader.ts';
import type { Job, Source } from '../types.ts';

const BASE_URL = 'https://tshr.taishinholdings.com.tw';
const searchJobUrl = `${BASE_URL}/Job/List?page=9999`;

export const parseJobs = (data: string): Job[] => {
  const $ = cheerioLoad(data);
  const jobElements = $('.m-col-bd.is-equal-height.jQ-pushBd li');
  if (jobElements.length === 0)
    throw new Error('No job listings found on the page.');

  return jobElements.toArray().map((element) => {
    const $element = $(element);
    const href = $element.find('.m-section-hd a').attr('href');
    return {
      source: 'taishin',
      title: $element.find('.b-space-preline').text().trim() || null,
      description: $element.find('.m-item-bd p').text().trim() || null,
      area: $element.find('.m-item-ft.b-text-gray-8e p').text().trim() || null,
      link: href ? `${BASE_URL}${href}` : null,
    };
  });
};

const taishin: Source = {
  id: 'taishin',
  name: 'Taishin Bank',
  scrape: async () => parseJobs(await fetchHtml(searchJobUrl)),
};

export default taishin;

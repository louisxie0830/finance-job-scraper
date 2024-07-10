import puppeteerLoader from '../../plugin/puppeteerLoader.js';
import cheerioLoad from '../../plugin/cheerioLoader.js';

const BASE_URL = 'https://bankrecruit.sinopac.com';
const jobSearch = `${BASE_URL}/jobSearch/`;

const processData = async () => {
  const data = await puppeteerLoader(jobSearch);
  const $ = cheerioLoad(data);
  let jobs = [];
  const jobElements = $('a.mb-2.line-clamp-2.text-lg.font-bold.text-gray-700');
  if (jobElements.length === 0)
    throw new Error('No job listings found on the page.');

  jobElements.each((index, element) => {
    jobs.push({
      title: $(element).text().trim() || null,
      link: $(element).attr('href')
        ? `${BASE_URL}${$(element).attr('href')}`
        : null,
      id: $(element).attr('href').split('=')[1] || null,
    });
  });

  if (jobs.length === 0) throw new Error('No valid job data found.');

  return jobs;
};

const jobs = async (req, res) => {
  try {
    const results = await processData();
    res.json(results);
  } catch (error) {
    if (!res.headersSent) {
      res
        .status(500)
        .send(`Error occurred while scraping jobs: ${error.message}`);
    }
  }
};

export default jobs;

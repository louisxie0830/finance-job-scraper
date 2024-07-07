import axios from '../../plugin/axiosInstance.js';
import cheerioLoad from '../../plugin/cheerioLoader.js';

const BASE_URL = 'https://tshr.taishinholdings.com.tw';
const searchJobUrl = `${BASE_URL}/Job/List?page=9999`;

const fetchSearchJob = async () => {
  try {
    const { data } = await axios.get(searchJobUrl);
    if (!data) throw new Error('Failed to load the webpage.');
    return data;
  } catch (error) {
    throw new Error(`Error occurred while scraping jobs: ${error.message}`);
  }
};

const processSearchJob = (data) => {
  const $ = cheerioLoad(data);
  const jobs = [];
  const jobElements = $('.m-col-bd.is-equal-height.jQ-pushBd li');
  if (jobElements.length === 0)
    throw new Error('No job listings found on the page.');

  jobElements.each((index, element) => {
    const title = $(element).find('.b-space-preline').text().trim() || null;
    const description = $(element).find('.m-item-bd p').text().trim() || null;
    const area =
      $(element).find('.m-item-ft.b-text-gray-8e p').text().trim() || null;
    let link = $(element).find('.m-section-hd a').attr('href');
    link = link ? `${BASE_URL}${link}` : null;
    jobs.push({
      title,
      description,
      area,
      link,
    });
  });
  if (jobs.length === 0) throw new Error('No valid job data found.');

  return jobs;
};

const jobs = async (req, res) => {
  try {
    const data = await fetchSearchJob();
    const jobs = processSearchJob(data);
    res.json(jobs);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res
        .status(500)
        .send(`Error occurred while scraping jobs: ${error.message}`);
    }
  }
};

export default jobs;

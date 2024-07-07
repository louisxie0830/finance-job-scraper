import axios from '../../plugin/axiosInstance.js';
import cheerioLoad from '../../plugin/cheerioLoader.js';
import { cleanString } from '../../utils/stringUtils.js';

const BASE_URL =
  'https://recruit.cathayholdings.com/CathaybkHR/servlet/HttpDispatcher/';
const searchJobUrl = `${BASE_URL}EZA0_0310/searchJob`;
const jobDetailUrl = `${BASE_URL}EZA0_0320/jobDetail`;
const companyNameEnum = {
  C0: '金控',
  '01': '銀行',
  A0: '人壽',
  E0: '證券',
  F0: '產險',
  G0: '投信',
  L0: '投顧',
  N0: '期貨',
  GRP: '集團',
};

const processSearchJob = (data) => {
  const $ = cheerioLoad(data);
  let jobs = [];
  const scriptElements = $('script');

  if (scriptElements.length === 0)
    throw new Error('No script listing found on the page.');
  scriptElements.each((index, element) => {
    const scriptContent = $(element).html();
    const jsonStringMatch = scriptContent.match(
      /var jsonString\s*=\s*'([^']+)'/,
    );

    if (jsonStringMatch && jsonStringMatch[1]) {
      const jsonString = cleanString(jsonStringMatch[1]);
      jobs = JSON.parse(jsonString);
    }
  });
  if (jobs.length === 0) throw new Error('No valid job data found.');
  jobs = jobs.map((job) => {
    const { companyId, locationName, job_title, applFormNo } = job;
    return {
      title: `${companyNameEnum[companyId]}-${job_title}`,
      area: locationName,
      link: jobDetailUrl,
      applFormNo: applFormNo,
    };
  });

  return jobs;
};

const fetchSearchJob = async () => {
  try {
    const { data } = await axios.get(searchJobUrl);
    if (!data) throw new Error('Failed to load the webpage.');

    return data;
  } catch (error) {
    throw new Error(`Error occurred while scraping jobs: ${error.message}`);
  }
};

const fetchJobDetail = async (applFormNo) => {
  try {
    const { data } = await axios.post(
      jobDetailUrl,
      { APPL_FORM_NO: applFormNo },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    if (!data) throw new Error('Failed to load the webpage.');
    return data;
  } catch (error) {
    throw new Error(`Error occurred while scraping jobs: ${error.message}`);
  }
};

const jobs = async (req, res) => {
  try {
    let results = await fetchSearchJob();
    results = processSearchJob(results);
    results = await Promise.all(
      results.map(async (job) => {
        const { applFormNo } = job;
        if (applFormNo) {
          const data = await fetchJobDetail(applFormNo);
          const $ = cheerioLoad(data);
          job.description = cleanString(
            cleanString($('.wp-break').text().trim()),
          );
        }
        return job;
      }),
    );
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

import axios from '../../plugin/axiosInstance.js';
import cheerioLoad from '../../plugin/cheerioLoader.js';

const BASE_URL = 'https://hr.esunfhc.com/StaffAcquisition/hireexam/EliteDetail';

const processData = (data, key) => {
  const $ = cheerioLoad(data);
  const jobs = [];
  const jobElements = $('.job-table.rwd-table.list-wrapper .list-item');
  if (jobElements.length === 0)
    throw new Error('No job listings found on the page.');
  jobElements.each((index, element) => {
    const title = $(element).find('tr td:nth-child(1)').text().trim() || null;
    const description =
      $(element).find('tr td:nth-child(2)').text().trim() || null;
    const area =
      $(`#job-${index + 1} .popup-block:nth-child(4) p`)
        .text()
        .trim() || null;
    jobs.push({ area, title, description, key });
  });
  return jobs;
};

const createFetchJobFunction = (id, key) => async () => {
  try {
    const url = `${BASE_URL}/${id}`;
    const { data } = await axios.get(url);
    if (!data) throw new Error('Failed to load the webpage.');
    const jobs = processData(data, key);
    if (jobs.length === 0) throw new Error('No valid job data found.');
    return jobs;
  } catch (error) {
    throw new Error(`Error occurred while scraping jobs: ${error.message}`);
  }
};

const fetchFinancialTechnologyJobs = createFetchJobFunction(
  39,
  'financialTechnologyJobs',
);
const fetchPersonalBankingJobs = createFetchJobFunction(
  40,
  'personalBankingJobs',
);
const fetchCorporateBankingJobs = createFetchJobFunction(
  41,
  'corporateBankingJobs',
);
const fetchPrivateBankingAndWealthManagementJobs = createFetchJobFunction(
  37,
  'privateBankingAndWealthManagementJobs',
);
const fetchHeadOfficeJobs = createFetchJobFunction(42, 'headOfficeJobs');
const fetchPaymentServicesJobs = createFetchJobFunction(
  43,
  'paymentServicesJobs',
);
const fetchFinancialTradingJobs = createFetchJobFunction(
  44,
  'financialTradingJobs',
);
const fetchESunSecuritiesJobs = createFetchJobFunction(
  46,
  'ESunSecuritiesJobs',
);
const fetchOtherJobs = createFetchJobFunction(47, 'otherJobs');

const jobs = async (req, res) => {
  try {
    const results = await Promise.all([
      fetchFinancialTechnologyJobs(),
      fetchPersonalBankingJobs(),
      fetchCorporateBankingJobs(),
      fetchPrivateBankingAndWealthManagementJobs(),
      fetchHeadOfficeJobs(),
      fetchPaymentServicesJobs(),
      fetchFinancialTradingJobs(),
      fetchESunSecuritiesJobs(),
      fetchOtherJobs(),
    ]);

    res.json(results.flat());
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

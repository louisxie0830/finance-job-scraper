import puppeteerLoader from '../../plugin/puppeteerLoader.js';
import cheerioLoad from '../../plugin/cheerioLoader.js';

const jobDetail = async (req, res) => {
  try {
    const data = await puppeteerLoader(
      'https://bankrecruit.sinopac.com/jobDetail?jobId=JOB0000494',
    );
    const $ = cheerioLoad(data);
    res.json(data);
  } catch (error) {
    if (!res.headersSent) {
      res
        .status(500)
        .send(`Error occurred while scraping jobs: ${error.message}`);
    }
  }
};

export default jobDetail;

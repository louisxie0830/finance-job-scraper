import puppeteerLoader from '../../plugin/puppeteerLoader.js';
import cheerioLoad from '../../plugin/cheerioLoader.js';

const jobDetail = async (req, res) => {
  try {
    const data = await puppeteerLoader(
      'https://bankrecruit.sinopac.com/jobDetail?jobId=JOB0000494',
    );
    const job = {};
    const $ = cheerioLoad(data);
    job.description =
      $(
        'p.col-span-12.list-inside.list-decimal.whitespace-pre-line.break-words.text-gray-600',
      ).text() || null;
    job.area =
      $('h5')
        .filter((index, element) => {
          return $(element).text().includes('上班地點');
        })
        .next()
        .text()
        .trim() || null;
    console.log('job: ', job);
    res.json(job);
  } catch (error) {
    if (!res.headersSent) {
      res
        .status(500)
        .send(`Error occurred while scraping jobs: ${error.message}`);
    }
  }
};

export default jobDetail;

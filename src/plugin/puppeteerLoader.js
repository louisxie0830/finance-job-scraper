import puppeteer from 'puppeteer';
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 5 });

const puppeteerLoader = async (url) => {
  console.log('url: ', url);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      dumpio: true,
      timeout: 60000,
    });

    const page = await browser.newPage();
    console.log('page: ', page);
    const response = await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('response: ', response);
    if (response.status() === 302) {
      await page.waitForNavigation();
    }

    const content = await page.content();
    console.log('content: ', content);
    if (content && typeof content !== 'string')
      throw new Error('Failed to load HTML content.');

    return content;
  } catch (error) {
    throw new Error(`Error during navigation: ${error}`);
  } finally {
    if (browser) await browser.close();
  }
};

const addTaskToQueue = (url) => {
  return queue.add(() => puppeteerLoader(url));
};

export default addTaskToQueue;

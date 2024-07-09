import puppeteer from 'puppeteer';
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 5 });

const puppeteerLoader = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      dumpio: true,
      timeout: 60000,
    });

    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle2' });

    if (response.status() === 302) {
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    const content = await page.content();

    if (!content || typeof content !== 'string') {
      throw new Error('Failed to load HTML content.');
    }

    await browser.close();
    return content;
  } catch (error) {
    console.error(`Error during navigation: ${error}`);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error(`Error closing browser: ${closeError}`);
      }
    }
  }
};

const addTaskToQueue = (url) => {
  return queue.add(() => puppeteerLoader(url));
};

export default addTaskToQueue;

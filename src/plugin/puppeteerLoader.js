import puppeteer from 'puppeteer';
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 5 });

const puppeteerLoader = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const content = await page.content();
  await browser.close();
  return content;
};

const addTaskToQueue = (url) => {
  return queue.add(() => puppeteerLoader(url));
};

export default addTaskToQueue;

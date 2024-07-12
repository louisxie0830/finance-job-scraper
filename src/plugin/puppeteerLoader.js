import puppeteer from 'puppeteer';
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 5 });

const puppeteerLoader = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--disable-features=site-per-process',
        '--disable-web-security',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--safebrowsing-disable-auto-update',
        '--disable-sync-preferences',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-print-preview',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--no-zygote',
      ],
      dumpio: true,
      timeout: 60000,
    });

    const page = await browser.newPage();
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    if (response.status() === 302) {
      await page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 60000,
      });
    }

    const content = await page.content();

    if (!content || typeof content !== 'string') {
      throw new Error('Failed to load HTML content.');
    }

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
  return queue
    .add(() => puppeteerLoader(url))
    .catch((error) => {
      console.error(`Error processing URL ${url}: ${error}`);
      throw `Error processing URL ${url}: ${error}`;
    });
};

export default addTaskToQueue;

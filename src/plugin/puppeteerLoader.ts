import puppeteer, { type Browser } from 'puppeteer';
import PQueue from 'p-queue';
import config from '../config/index.ts';
import { isBlockedUrl } from '../utils/networkGuard.ts';
import logger from '../winstonLogger.ts';

const queue = new PQueue({ concurrency: config.browser.concurrency });

// One shared browser per process; each task only opens its own page.
let browserPromise: Promise<Browser> | null = null;

const launchBrowser = async (): Promise<Browser> => {
  const browser = await puppeteer.launch({
    executablePath: config.browser.executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-component-update',
      '--disable-breakpad',
      '--metrics-recording-only',
      '--no-first-run',
      '--deny-permission-prompts',
    ],
    timeout: config.browser.timeoutMs,
  });
  browser.on('disconnected', () => {
    logger.warn('Browser disconnected, will relaunch on next request.');
    browserPromise = null;
  });
  return browser;
};

const getBrowser = (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((error: unknown) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
};

const BLOCKED_RESOURCES = new Set(['image', 'media', 'font']);
// Analytics/ads never affect the content we scrape, but delay "network idle".
const TRACKER_HOSTS =
  /(^|\.)(googletagmanager\.com|google-analytics\.com|doubleclick\.net|facebook\.net|facebook\.com|clarity\.ms|hotjar\.com)$/;

const isTracker = (rawUrl: string): boolean => {
  try {
    return TRACKER_HOSTS.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
};

export interface LoadOptions {
  /** Wait for client-rendered content (SPA) before reading the HTML. */
  waitForSelector?: string;
}

const loadPage = async (
  url: string,
  { waitForSelector }: LoadOptions = {},
): Promise<string> => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(config.browser.timeoutMs);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (isBlockedUrl(request.url())) {
        logger.warn(
          `Blocked browser request to ${request.url().slice(0, 200)}`,
        );
        void request.abort('accessdenied');
      } else if (
        BLOCKED_RESOURCES.has(request.resourceType()) ||
        isTracker(request.url())
      ) {
        void request.abort();
      } else {
        void request.continue();
      }
    });

    // goto follows redirects on its own, so no extra waitForNavigation is needed.
    // With a selector to wait for, DOM ready is enough; otherwise wait for the network to settle.
    await page.goto(url, {
      waitUntil: waitForSelector ? 'domcontentloaded' : 'networkidle2',
      timeout: config.browser.timeoutMs,
    });
    if (waitForSelector) {
      await page
        .waitForSelector(waitForSelector, { timeout: config.browser.timeoutMs })
        .catch(() => {
          logger.warn(`Selector "${waitForSelector}" not found on ${url}`);
        });
    }

    const content = await page.content();
    if (!content) throw new Error('Failed to load HTML content.');
    return content;
  } finally {
    await page.close().catch((error: Error) => {
      logger.warn(`Error closing page: ${error.message}`);
    });
  }
};

const loadRenderedHtml = async (
  url: string,
  options?: LoadOptions,
): Promise<string> => {
  try {
    return await queue.add(() => loadPage(url, options));
  } catch (error) {
    throw new Error(
      `Error processing URL ${url}: ${(error as Error).message}`,
      { cause: error },
    );
  }
};

export const browserStatus = () => ({
  launched: browserPromise !== null,
  pending: queue.size,
  running: queue.pending,
});

export const closeBrowser = async (): Promise<void> => {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  await browser?.close();
};

export default loadRenderedHtml;

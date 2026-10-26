import { Router } from 'express';
import { browserStatus } from '../plugin/puppeteerLoader.ts';
import { cacheSize } from '../utils/cache.ts';

/** Public liveness probe: reveals nothing about the process. */
export const healthRouter = Router().get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/** Operational details; mounted behind the API key. */
export const statusRouter = Router().get('/status', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    cacheEntries: cacheSize(),
    browser: browserStatus(),
  });
});

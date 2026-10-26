import express, { type Express, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import config from './config/index.ts';
import openapi from './docs/openapi.ts';
import apiKey from './middleware/apiKey.ts';
import errorHandler from './middleware/errorHandler.ts';
import ipAllowlist from './middleware/ipAllowlist.ts';
import requestId from './middleware/requestId.ts';
import requestTimeout from './middleware/requestTimeout.ts';
import { healthRouter, statusRouter } from './routes/health.ts';
import { createJobsRouter } from './routes/jobs.ts';
import defaultSources from './scrapers/index.ts';
import logger from './winstonLogger.ts';
import type { Source } from './types.ts';

morgan.token('id', (req: Request) => req.id);

export const createApp = (sources: Source[] = defaultSources): Express => {
  const app = express();

  app.set('trust proxy', config.trustProxy);
  // Flat query strings only (no nested objects); handlers validate their own params.
  app.set('query parser', 'simple');

  app.use(requestId);
  app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));
  app.use(ipAllowlist(config.allowedIps));
  app.use(
    cors({
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
      methods: ['GET'],
      allowedHeaders: ['X-API-Key'],
      exposedHeaders: ['X-Cache', 'X-Request-Id'],
    }),
  );
  app.use(
    morgan(
      ':id :method :url :status :res[content-length] - :response-time ms',
      {
        stream: { write: (message) => logger.info(message.trim()) },
      },
    ),
  );
  app.use(compression());

  // Docs and health checks are cheap and public (still behind the IP allowlist).
  if (config.docsEnabled) {
    app.get('/openapi.json', (req, res) => {
      res.json(openapi);
    });
    app.use(
      '/docs',
      swaggerUi.serve,
      swaggerUi.setup(openapi, {
        customSiteTitle: 'Finance Job Scraper API',
      }),
    );
  }
  app.use(healthRouter);

  app.use(apiKey(config.apiKeys));
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      limit: config.rateLimit.limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  app.use(requestTimeout(config.requestTimeoutMs));
  app.use(statusRouter);

  app.get('/', (req, res) => {
    res.send(
      `Welcome to the finance-job-scraper service!${config.docsEnabled ? ' API docs: /docs' : ''}`,
    );
  });
  app.use(createJobsRouter(sources));

  app.use((req, res) => {
    res.status(404).send('Not Found');
  });
  app.use(errorHandler);

  return app;
};

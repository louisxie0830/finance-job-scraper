import { createApp } from './app.ts';
import config from './config/index.ts';
import { closeBrowser } from './plugin/puppeteerLoader.ts';
import logger from './winstonLogger.ts';

const server = createApp().listen(config.port, () => {
  logger.info(`Server running at http://localhost:${config.port}`);
  logger.info(`API docs at http://localhost:${config.port}/docs`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down...`);
  server.close();
  closeBrowser()
    .catch((error: Error) =>
      logger.error(`Error closing browser: ${error.message}`),
    )
    .finally(() => process.exit(0));
};

process.on('unhandledRejection', (reason) => {
  logger.error(
    `Unhandled rejection: ${(reason as Error)?.stack ?? String(reason)}`,
  );
});
process.on('uncaughtException', (error) => {
  // State may be corrupt: log and let PM2 restart the process.
  logger.error(`Uncaught exception: ${error.stack ?? error.message}`);
  process.exit(1);
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

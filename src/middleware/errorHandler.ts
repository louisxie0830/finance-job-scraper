import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/httpError.ts';
import logger from '../winstonLogger.ts';

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof HttpError) {
    res.status(err.status).send(err.message);
    return;
  }
  logger.error(`[${req.id}] ${(err as Error).stack ?? String(err)}`);
  const statusCode = (err as { status?: number }).status || 500;
  res.status(statusCode).send({ error: 'Internal Server Error', ref: req.id });
};

export default errorHandler;

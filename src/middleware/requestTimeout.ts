import type { RequestHandler } from 'express';

const requestTimeout =
  (ms: number): RequestHandler =>
  (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).send('Service unavailable. Please retry.');
      }
    }, ms);
    const clear = () => clearTimeout(timer);
    res.on('finish', clear);
    res.on('close', clear);
    next();
  };

export default requestTimeout;

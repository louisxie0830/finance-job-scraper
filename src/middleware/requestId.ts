import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
  }
}

// Always generated server-side: a client-supplied id could be used to forge log lines.
const requestId: RequestHandler = (req, res, next) => {
  req.id = randomUUID();
  res.set('X-Request-Id', req.id);
  next();
};

export default requestId;

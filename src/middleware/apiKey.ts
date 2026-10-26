import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

// Hash first so keys of different lengths can still be compared in constant time.
const digest = (value: string): Buffer =>
  createHash('sha256').update(value).digest();

/** Requires a valid `X-API-Key` header. Does nothing when no keys are configured. */
const apiKey = (keys: string[]): RequestHandler => {
  if (keys.length === 0) return (req, res, next) => next();
  const digests = keys.map(digest);

  return (req, res, next) => {
    const provided = req.get('x-api-key');
    if (provided) {
      const providedDigest = digest(provided);
      // Check every key so timing does not reveal which one matched.
      let valid = false;
      for (const keyDigest of digests) {
        valid = timingSafeEqual(providedDigest, keyDigest) || valid;
      }
      if (valid) return next();
    }
    res.set('WWW-Authenticate', 'ApiKey header="X-API-Key"');
    res.status(401).send('Unauthorized');
  };
};

export default apiKey;

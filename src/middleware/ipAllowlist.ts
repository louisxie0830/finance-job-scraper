import type { RequestHandler } from 'express';

// Strip the IPv4-mapped IPv6 prefix so '::ffff:127.0.0.1' matches '127.0.0.1'.
const normalize = (ip = ''): string => ip.replace(/^::ffff:/, '');

const ipAllowlist = (allowedIps: string[]): RequestHandler => {
  if (allowedIps.includes('*')) return (req, res, next) => next();
  const allowed = new Set(allowedIps.map(normalize));

  return (req, res, next) => {
    if (allowed.has(normalize(req.ip))) return next();
    res.status(403).send('Forbidden');
  };
};

export default ipAllowlist;

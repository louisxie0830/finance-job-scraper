import { isIP } from 'node:net';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'data:', 'blob:']);

const isPrivateIPv4 = (ip: string): boolean => {
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast and reserved
  );
};

const isPrivateIPv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice('::ffff:'.length);
    return isIP(mapped) === 4 ? isPrivateIPv4(mapped) : true;
  }
  return (
    lower === '::' ||
    lower === '::1' ||
    /^f[cd]/.test(lower) || // unique local
    /^fe[89ab]/.test(lower) // link-local
  );
};

/**
 * True when a URL the headless browser wants to load points at the local machine or a private
 * network. Scraped pages must never be able to reach internal services (SSRF).
 * Only literal IPs and localhost names are checked; hostnames are not resolved.
 */
export const isBlockedUrl = (rawUrl: string): boolean => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return true;
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return true;
  if (url.protocol === 'data:' || url.protocol === 'blob:') return false;

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  const version = isIP(host);
  if (version === 4) return isPrivateIPv4(host);
  if (version === 6) return isPrivateIPv6(host);
  return false;
};

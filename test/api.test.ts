import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { createApp } from '../src/app.ts';
import { clearCache } from '../src/utils/cache.ts';
import type { Source } from '../src/types.ts';

let scrapes = 0;

// Fake sources so the API can be tested without hitting the bank sites.
const sources: Source[] = [
  {
    id: 'taishin',
    name: 'Fake Taishin',
    scrape: async () => {
      scrapes += 1;
      return [
        { source: 'taishin', title: '資料工程師', area: '台北市' },
        { source: 'taishin', title: '理財專員', area: '台中市' },
      ];
    },
    detail: {
      idPattern: /^[\w-]{1,64}$/,
      scrape: async (jobId) => ({ description: `detail ${jobId}`, area: null }),
    },
  },
  {
    id: 'cathaybk',
    name: 'Fake Cathay',
    scrape: async () => {
      throw new Error('site changed');
    },
  },
];

let server: Server;
let baseUrl: string;

before(async () => {
  clearCache();
  server = createApp(sources).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

test('GET /taishin/jobs returns an array, filters and caches', async () => {
  const first = await fetch(`${baseUrl}/taishin/jobs`);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('x-cache'), 'MISS');
  assert.equal(((await first.json()) as unknown[]).length, 2);

  const filtered = await fetch(`${baseUrl}/taishin/jobs?area=台北`);
  assert.equal(filtered.headers.get('x-cache'), 'HIT');
  assert.deepEqual(
    ((await filtered.json()) as { title: string }[]).map((job) => job.title),
    ['資料工程師'],
  );
  assert.equal(scrapes, 1);
});

test('GET /cathaybk/jobs hides internal error details', async () => {
  const res = await fetch(`${baseUrl}/cathaybk/jobs`);
  assert.equal(res.status, 500);
  const requestId = res.headers.get('x-request-id');
  assert.ok(requestId);
  const body = await res.text();
  assert.equal(body, `Error occurred while scraping jobs (ref: ${requestId})`);
  assert.doesNotMatch(body, /site changed/);
});

test('refresh is throttled for recently scraped results', async () => {
  const before = scrapes;
  const res = await fetch(`${baseUrl}/taishin/jobs?refresh=true`);
  assert.equal(res.headers.get('x-cache'), 'HIT');
  assert.equal(scrapes, before);
});

test('GET /jobs aggregates sources and reports failures', async () => {
  const res = await fetch(`${baseUrl}/jobs?q=理財`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    total: number;
    sources: { id: string; ok: boolean; count: number; error?: string }[];
  };
  assert.equal(body.total, 1);
  assert.deepEqual(
    body.sources.map(({ id, ok, count, error }) => ({ id, ok, count, error })),
    [
      { id: 'taishin', ok: true, count: 1, error: undefined },
      {
        id: 'cathaybk',
        ok: false,
        count: 0,
        error: `Scraping failed (ref: ${res.headers.get('x-request-id')})`,
      },
    ],
  );
});

test('GET /jobs returns 502 when every selected source fails', async () => {
  const res = await fetch(`${baseUrl}/jobs?source=cathaybk`);
  assert.equal(res.status, 502);
});

test('GET /jobs rejects unknown sources and oversized filters', async () => {
  assert.equal((await fetch(`${baseUrl}/jobs?source=nope`)).status, 400);
  assert.equal((await fetch(`${baseUrl}/jobs?source=<x>`)).status, 400);
  const longQ = 'x'.repeat(101);
  assert.equal((await fetch(`${baseUrl}/jobs?q=${longQ}`)).status, 400);
});

test('GET /:source/job/description validates jobId and caches', async () => {
  const url = `${baseUrl}/taishin/job/description`;
  assert.equal((await fetch(url)).status, 400);
  assert.equal((await fetch(`${url}?jobId=../x`)).status, 400);
  const ok = await fetch(`${url}?jobId=A1`);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { description: 'detail A1', area: null });
  const again = await fetch(`${url}?jobId=A1`);
  assert.equal(again.headers.get('x-cache'), 'HIT');
  // Sources without a detail scraper get no description route.
  assert.equal(
    (await fetch(`${baseUrl}/cathaybk/job/description?jobId=A1`)).status,
    404,
  );
});

test('GET /health reveals only liveness; /status has details', async () => {
  const health = await fetch(`${baseUrl}/health`);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const status = (await (await fetch(`${baseUrl}/status`)).json()) as Record<
    string,
    unknown
  >;
  assert.ok('cacheEntries' in status);
});

test('security headers, CORS closed, unknown routes 404', async () => {
  const res = await fetch(`${baseUrl}/taishin/jobs`, {
    headers: { Origin: 'https://evil.example' },
  });
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal((await fetch(`${baseUrl}/nope`)).status, 404);
});

test('docs are served', async () => {
  const spec = (await (await fetch(`${baseUrl}/openapi.json`)).json()) as {
    openapi: string;
    paths: Record<string, unknown>;
  };
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.paths['/jobs']);

  const docs = await fetch(`${baseUrl}/docs/`);
  assert.equal(docs.status, 200);
  assert.match(await docs.text(), /swagger-ui/);
});

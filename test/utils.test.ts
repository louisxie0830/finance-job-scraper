import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, RequestHandler, Response } from 'express';

import { cached, cacheSize, clearCache } from '../src/utils/cache.ts';
import { filterJobs } from '../src/utils/jobFilter.ts';
import ipAllowlist from '../src/middleware/ipAllowlist.ts';
import type { Job } from '../src/types.ts';

const opts = { ttlMs: 1000, maxEntries: 100 };

test('cache: dedupes concurrent calls and caches results', async () => {
  let calls = 0;
  const load = async () => ++calls;
  const first = cached('k1', load, opts);
  const second = cached('k1', load, opts);
  assert.equal(first.hit, false);
  assert.equal(second.hit, true);
  assert.deepEqual(await Promise.all([first.promise, second.promise]), [1, 1]);
  const third = cached('k1', load, opts);
  assert.equal(third.hit, true);
  assert.equal(await third.promise, 1);
  assert.equal(calls, 1);
});

test('cache: refresh reloads a settled value', async () => {
  let calls = 0;
  const load = async () => ++calls;
  await cached('k-refresh', load, opts).promise;
  const refreshed = cached('k-refresh', load, { ...opts, refresh: true });
  assert.equal(refreshed.hit, false);
  assert.equal(await refreshed.promise, 2);
});

test('cache: failures are not cached', async () => {
  let calls = 0;
  const load = async () => {
    calls += 1;
    if (calls === 1) throw new Error('boom');
    return 'ok';
  };
  await assert.rejects(cached('k2', load, opts).promise, /boom/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await cached('k2', load, opts).promise, 'ok');
});

test('cache: evicts oldest entries beyond maxEntries', async () => {
  clearCache();
  for (let i = 0; i < 5; i += 1) {
    await cached(`evict-${i}`, async () => i, { ...opts, maxEntries: 3 })
      .promise;
  }
  assert.equal(cacheSize(), 3);
});

const jobs: Job[] = [
  {
    source: 'taishin',
    title: 'Data Engineer',
    description: '資料平台',
    area: '台北市',
  },
  { source: 'sinopac', title: '理財專員', description: null, area: '台中市' },
];

test('filterJobs: matches all keywords case-insensitively', () => {
  assert.deepEqual(
    filterJobs(jobs, { q: 'data 平台' }).map((job) => job.source),
    ['taishin'],
  );
  assert.equal(filterJobs(jobs, { q: 'data 理財' }).length, 0);
});

test('filterJobs: filters by area and passes through when empty', () => {
  assert.deepEqual(
    filterJobs(jobs, { area: '台中' }).map((job) => job.source),
    ['sinopac'],
  );
  assert.equal(filterJobs(jobs, {}).length, 2);
  assert.deepEqual(
    filterJobs(jobs, { area: '臺北' }).map((job) => job.source),
    ['taishin'],
  );
});

const run = (middleware: RequestHandler, ip: string) => {
  let status = 200;
  let passed = false;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    send() {},
  } as unknown as Response;
  void middleware({ ip } as Request, res, () => {
    passed = true;
  });
  return { status, passed };
};

test('ipAllowlist: allows listed and IPv4-mapped addresses', () => {
  const mw = ipAllowlist(['127.0.0.1', '::1']);
  assert.equal(run(mw, '127.0.0.1').passed, true);
  assert.equal(run(mw, '::ffff:127.0.0.1').passed, true);
  assert.equal(run(mw, '::1').passed, true);
  assert.deepEqual(run(mw, '10.0.0.5'), { status: 403, passed: false });
});

test('ipAllowlist: wildcard allows everyone', () => {
  assert.equal(run(ipAllowlist(['*']), '10.0.0.5').passed, true);
});

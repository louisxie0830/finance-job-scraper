import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';

import apiKey from '../src/middleware/apiKey.ts';
import { isBlockedUrl } from '../src/utils/networkGuard.ts';

test('apiKey: requires a matching X-API-Key when keys are configured', async () => {
  const app = express();
  app.use(apiKey(['secret-one', 'secret-two']));
  app.get('/', (req, res) => {
    res.send('ok');
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  try {
    assert.equal((await fetch(url)).status, 401);
    const wrong = await fetch(url, { headers: { 'X-API-Key': 'secret' } });
    assert.equal(wrong.status, 401);
    const ok = await fetch(url, { headers: { 'X-API-Key': 'secret-two' } });
    assert.equal(ok.status, 200);
    // Keys in the query string are never accepted (they would end up in logs).
    assert.equal((await fetch(`${url}?api_key=secret-one`)).status, 401);
  } finally {
    server.close();
  }
});

test('apiKey: open when no keys are configured', () => {
  let passed = false;
  void apiKey([])({} as never, {} as never, () => {
    passed = true;
  });
  assert.equal(passed, true);
});

test('isBlockedUrl: blocks local, private and non-web targets', () => {
  for (const url of [
    'http://localhost:3000/',
    'http://127.0.0.1/',
    'http://10.1.2.3/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[fd00::1]/',
    'file:///etc/passwd',
    'chrome://settings',
    'not a url',
  ]) {
    assert.equal(isBlockedUrl(url), true, url);
  }
});

test('isBlockedUrl: allows public web, data and blob URLs', () => {
  for (const url of [
    'https://bankrecruit.sinopac.com/jobSearch/',
    'https://www.googletagmanager.com/gtm.js',
    'http://8.8.8.8/',
    'data:image/png;base64,AAAA',
  ]) {
    assert.equal(isBlockedUrl(url), false, url);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseDetail, parseSearch } from '../src/scrapers/fubon.ts';
import {
  parsePostings,
  WORKDAY_ID_PATTERN,
  type WorkdaySite,
} from '../src/scrapers/workday.ts';
import htmlToText from '../src/utils/htmlToText.ts';

test('fubon: parses search results and skips closed jobs', () => {
  const jobs = parseSearch({
    items: [
      {
        jobId: 'BUTTW0095720260001',
        buName: '台北富邦銀行',
        jobName: '授服經辦',
        workLocation: '高雄市新興區\n(民族二路95號9樓)',
        isOpen: true,
      },
      { jobId: 'CLOSED1', jobName: '已關閉', isOpen: false },
    ],
  });
  assert.deepEqual(jobs, [
    {
      source: 'fubon',
      title: '授服經辦',
      area: '高雄市新興區',
      link: 'https://careers.fubon.com/jobs/search/BUTTW0095720260001',
      id: 'BUTTW0095720260001',
      company: '台北富邦銀行',
    },
  ]);
});

test('fubon: detail joins description and requirements', () => {
  assert.deepEqual(
    parseDetail({
      description: '1.帳務處理\r\n2.結帳',
      otherDesc: '具會計師事務所經驗',
      workLocation: '台北市中正區',
    }),
    {
      description: '1.帳務處理\n2.結帳\n\n具會計師事務所經驗',
      area: '台北市中正區',
    },
  );
});

const site: WorkdaySite = {
  id: 'kgi',
  name: 'KGI',
  host: 'cdfh.wd3.myworkdayjobs.com',
  tenant: 'cdfh',
  site: 'External',
};

test('workday: parses postings with company and link', () => {
  const jobs = parsePostings(
    site,
    [
      {
        title: '分行理財專員',
        externalPath: '/job/XMLNAME----_JR106452',
        locationsText: '林口(銀行)',
      },
      { title: 'no path' },
    ],
    '凱基商業銀行',
  );
  assert.deepEqual(jobs, [
    {
      source: 'kgi',
      title: '分行理財專員',
      area: '林口(銀行)',
      link: 'https://cdfh.wd3.myworkdayjobs.com/zh-TW/External/job/XMLNAME----_JR106452',
      id: 'XMLNAME----_JR106452',
      company: '凱基商業銀行',
    },
  ]);
});

test('workday: job id pattern allows Workday paths but not traversal', () => {
  assert.ok(WORKDAY_ID_PATTERN.test('IC_JR9437'));
  assert.ok(WORKDAY_ID_PATTERN.test('-KGIFH-Building/XMLNAME----_JR106453'));
  assert.ok(!WORKDAY_ID_PATTERN.test('../../jobs'));
  assert.ok(!WORKDAY_ID_PATTERN.test('a/b/c'));
  assert.ok(!WORKDAY_ID_PATTERN.test('a?x=1'));
});

test('htmlToText: keeps line breaks and decodes entities', () => {
  assert.equal(
    htmlToText('<p>加入我們&#xff0c;一起</p><p>1.規劃<br />2.執行</p>'),
    '加入我們，一起\n1.規劃\n2.執行',
  );
  assert.equal(htmlToText(''), null);
});

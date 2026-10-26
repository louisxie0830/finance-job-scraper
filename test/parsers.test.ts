import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseJobs as parseTaishin } from '../src/scrapers/taishin.ts';
import { parseJobList as parseCathay } from '../src/scrapers/cathaybk.ts';
import {
  parseCategories as parseEsunCategories,
  parseJobs as parseEsun,
} from '../src/scrapers/esunfhc.ts';
import {
  parseJobs as parseSinopac,
  parseJobDetail as parseSinopacDetail,
} from '../src/scrapers/sinopac.ts';

test('taishin: parses job list', () => {
  const html = `
    <div class="m-col-bd is-equal-height jQ-pushBd"><ul><li>
      <div class="m-section-hd"><a href="/Job/Detail/1"><span class="b-space-preline"> 理財專員 </span></a></div>
      <div class="m-item-bd"><p>負責理財業務</p></div>
      <div class="m-item-ft b-text-gray-8e"><p>台北市</p></div>
      <ul><li>nested list item inside the card</li></ul>
    </li></ul></div>`;
  assert.deepEqual(parseTaishin(html), [
    {
      source: 'taishin',
      title: '理財專員',
      description: '負責理財業務',
      area: '台北市',
      link: 'https://tshr.taishinholdings.com.tw/Job/Detail/1',
    },
  ]);
});

test('taishin: throws when no listings', () => {
  assert.throws(() => parseTaishin('<html></html>'), /No job listings/);
});

test('cathaybk: parses the JSON job list', () => {
  const jobs = parseCathay({
    MWHEADER: { RETURNCODE: '0000' },
    TRANRS: {
      JOB_LIST: [
        {
          APPL_FORM_NO: 'I00026938',
          JOB_TITLE: ' 分行工讀生 ',
          JOB_DESCRIPTION: '文件整理',
          LOCATION_NAME: '臺北市 松山區',
          COMPANY_LIST: ['01'],
          IS_OPEN: 'Y',
        },
        { APPL_FORM_NO: 'closed', JOB_TITLE: '已關閉', IS_OPEN: 'N' },
        { APPL_FORM_NO: 42, JOB_TITLE: '未知公司', COMPANY_LIST: ['ZZ'] },
      ],
    },
  });
  assert.deepEqual(jobs, [
    {
      source: 'cathaybk',
      title: '銀行-分行工讀生',
      description: '文件整理',
      area: '臺北市 松山區',
      link: 'https://recruit.cathayholdings.com/iMatch/job/info/I00026938',
      id: 'I00026938',
      applFormNo: 'I00026938',
    },
    {
      source: 'cathaybk',
      title: '未知公司',
      description: null,
      area: null,
      link: null,
      id: null,
    },
  ]);
});

test('cathaybk: rejects error return codes', () => {
  assert.throws(
    () => parseCathay({ MWHEADER: { RETURNCODE: '9999' } }),
    /returned 9999/,
  );
});

test('esunfhc: parses categories and jobs', () => {
  const categories = parseEsunCategories({
    ReturnCode: 'A0',
    ReturnData: [
      { EliteItemID: 39, EliteItemName: '金融科技' },
      { EliteItemID: 'x', EliteItemName: '壞資料' },
    ],
  });
  assert.deepEqual(categories, [{ id: 39, name: '金融科技' }]);

  const jobs = parseEsun(
    {
      ReturnCode: 'A0',
      ReturnData: [
        {
          CapacitySettingID: 300,
          CapacitySettingName: '全端工程師',
          Descrption: '負責開發',
          WorkLocation: '台北市中山區',
        },
      ],
    },
    { id: 39, name: '金融科技' },
  );
  assert.deepEqual(jobs, [
    {
      source: 'esunfhc',
      title: '全端工程師',
      description: '負責開發',
      area: '台北市中山區',
      link: 'https://recruit.esunbank.com.tw/Recruit/EliteDetail?eliteItemID=39',
      id: '300',
      key: 'financialTechnologyJobs',
      category: '金融科技',
    },
  ]);
});

test('esunfhc: empty category (A1) yields empty list, bad code throws', () => {
  assert.deepEqual(
    parseEsun({ ReturnCode: 'A1' }, { id: 45, name: '實習' }),
    [],
  );
  assert.throws(() => parseEsun({ ReturnCode: 'B9' }, { id: 1, name: 'x' }));
});

test('sinopac: parses list with area and tolerates missing href', () => {
  const cls = 'mb-2 line-clamp-2 text-lg font-bold text-gray-700';
  const html = `
    <div class="cards">
      <div class="card"><span>策略發展部</span><a class="${cls}" href="/jobDetail?jobId=123">交易員</a>
        <p>工作地區：台北市</p><p>學歷：大學</p><p>經歷：5年以上</p><button>我要應徵</button></div>
      <div class="card"><a class="${cls}">無連結</a><p>學歷：大學</p></div>
    </div>`;
  assert.deepEqual(parseSinopac(html), [
    {
      source: 'sinopac',
      title: '交易員',
      area: '台北市',
      link: 'https://bankrecruit.sinopac.com/jobDetail?jobId=123',
      id: '123',
    },
    { source: 'sinopac', title: '無連結', area: null, link: null, id: null },
  ]);
});

test('sinopac: parses job detail', () => {
  const html = `
    <p class="col-span-12 list-inside list-decimal whitespace-pre-line break-words text-gray-600">工作內容</p>
    <h5>上班地點</h5><p> 台北市 </p>`;
  assert.deepEqual(parseSinopacDetail(html), {
    description: '工作內容',
    area: '台北市',
  });
});

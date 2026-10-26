import { randomBytes } from 'node:crypto';
import axios from '../plugin/axiosInstance.ts';
import type { Job, Source } from '../types.ts';

// The recruiting site is an Angular SPA (iMatch) backed by this JSON API.
const API_BASE = 'https://recruit.cathayholdings.com/api';
const JOB_LIST_MSGID = 'EZM-C-JOBLISTQ001';
const JOB_LINK_BASE = 'https://recruit.cathayholdings.com/iMatch/job/info';

const companyNameEnum: Record<string, string> = {
  C0: '金控',
  '01': '銀行',
  '02': '銀行',
  '03': '銀行',
  A0: '人壽',
  E0: '證券',
  F0: '產險',
  G0: '投信',
  G1: '私募',
  K0: '創投',
  L0: '投顧',
  N0: '期貨',
  GRP: '集團',
};

interface RawJob {
  APPL_FORM_NO?: unknown;
  JOB_TITLE?: unknown;
  JOB_DESCRIPTION?: unknown;
  LOCATION_NAME?: unknown;
  COMPANY_LIST?: unknown;
  IS_OPEN?: unknown;
}

interface JobListResponse {
  MWHEADER?: { RETURNCODE?: string; RETURNDESC?: string };
  TRANRS?: { JOB_LIST?: unknown };
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

// The API rejects requests without this envelope; TXNSEQ just needs to be unique.
const envelope = (msgId: string, payload: object) => ({
  MWHEADER: {
    TXNSEQ: `${Date.now()}${randomBytes(3).toString('hex')}`,
    MSGID: msgId,
    SOURCECHANNEL: 'HRD-LX-FND-01',
  },
  TRANRQ: payload,
});

export const parseJobList = (data: JobListResponse): Job[] => {
  if (data?.MWHEADER?.RETURNCODE !== '0000') {
    throw new Error(
      `Cathay API returned ${data?.MWHEADER?.RETURNCODE ?? 'no return code'}`,
    );
  }
  const list = data.TRANRS?.JOB_LIST;
  if (!Array.isArray(list) || list.length === 0)
    throw new Error('No valid job data found.');

  return (list as RawJob[])
    .filter((raw) => raw.IS_OPEN !== 'N')
    .map((raw) => {
      const id = str(raw.APPL_FORM_NO);
      const companyId = Array.isArray(raw.COMPANY_LIST)
        ? str(raw.COMPANY_LIST[0])
        : null;
      const company = (companyId && companyNameEnum[companyId]) || null;
      const title = str(raw.JOB_TITLE);
      return {
        source: 'cathaybk',
        title: company && title ? `${company}-${title}` : title,
        description: str(raw.JOB_DESCRIPTION),
        area: str(raw.LOCATION_NAME),
        link: id ? `${JOB_LINK_BASE}/${encodeURIComponent(id)}` : null,
        id,
        ...(id && { applFormNo: id }),
      };
    });
};

const scrape = async (): Promise<Job[]> => {
  const { data } = await axios.post<JobListResponse>(
    `${API_BASE}/job/${JOB_LIST_MSGID}`,
    envelope(JOB_LIST_MSGID, {}),
    { headers: { 'accept-language': 'zh_TW' } },
  );
  return parseJobList(data);
};

const cathaybk: Source = {
  id: 'cathaybk',
  name: 'Cathay Financial Holdings',
  scrape,
};

export default cathaybk;

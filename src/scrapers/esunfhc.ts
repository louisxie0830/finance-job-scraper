import config from '../config/index.ts';
import axios from '../plugin/axiosInstance.ts';
import mapWithConcurrency from '../utils/concurrency.ts';
import logger from '../winstonLogger.ts';
import type { Job, Source } from '../types.ts';

// The recruiting site moved to a Vue SPA backed by this JSON API (POST only).
const API_BASE =
  'https://recruit.esunbank.com.tw/ahr_recruit_api/StaffAcquisition';
const CATEGORY_LINK_BASE =
  'https://recruit.esunbank.com.tw/Recruit/EliteDetail?eliteItemID=';

// Keys kept from the old scraper so existing clients keep working.
const LEGACY_KEYS: Record<number, string> = {
  37: 'privateBankingAndWealthManagementJobs',
  39: 'financialTechnologyJobs',
  40: 'personalBankingJobs',
  41: 'corporateBankingJobs',
  42: 'headOfficeJobs',
  43: 'paymentServicesJobs',
  44: 'financialTradingJobs',
  46: 'ESunSecuritiesJobs',
  47: 'otherJobs',
  48: 'privateBankingAndWealthManagementJobs',
};

interface ApiResponse {
  ReturnCode?: string;
  ReturnData?: unknown;
}

interface Category {
  id: number;
  name: string;
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const post = async (path: string): Promise<ApiResponse> => {
  const { data } = await axios.post<ApiResponse>(`${API_BASE}/${path}`, '', {
    headers: { Pragma: 'no-cache', 'Content-Length': '0' },
  });
  return data;
};

// "A0" means data, "A1" means an empty result.
const returnData = (data: ApiResponse): unknown[] => {
  if (data?.ReturnCode === 'A1') return [];
  if (data?.ReturnCode !== 'A0' || !Array.isArray(data.ReturnData)) {
    throw new Error(
      `E.SUN API returned ${data?.ReturnCode ?? 'no return code'}`,
    );
  }
  return data.ReturnData;
};

export const parseCategories = (data: ApiResponse): Category[] =>
  returnData(data).flatMap((raw) => {
    const item = raw as { EliteItemID?: unknown; EliteItemName?: unknown };
    const id = Number(item.EliteItemID);
    const name = str(item.EliteItemName);
    return Number.isInteger(id) && id > 0 && name ? [{ id, name }] : [];
  });

export const parseJobs = (data: ApiResponse, category: Category): Job[] =>
  returnData(data).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      source: 'esunfhc',
      title: str(item.CapacitySettingName),
      // The API really spells it "Descrption".
      description: str(item.Descrption),
      area: str(item.WorkLocation),
      link: `${CATEGORY_LINK_BASE}${category.id}`,
      id:
        item.CapacitySettingID == null ? null : String(item.CapacitySettingID),
      key: LEGACY_KEYS[category.id] ?? `category${category.id}`,
      category: category.name,
    };
  });

const scrape = async (): Promise<Job[]> => {
  const categories = parseCategories(await post('GetEliteItem'));
  if (categories.length === 0) throw new Error('No job categories found.');

  const results = await mapWithConcurrency(
    categories,
    config.http.concurrency,
    async (category) => {
      try {
        return parseJobs(
          await post(`GetEliteItemDetail?eliteItemID=${category.id}`),
          category,
        );
      } catch (error) {
        logger.warn(
          `[esunfhc] category ${category.id}: ${(error as Error).message}`,
        );
        return null;
      }
    },
  );
  if (results.every((result) => result === null))
    throw new Error('Every E.SUN category failed to load.');

  const jobs = results.flatMap((result) => result ?? []);
  if (jobs.length === 0) throw new Error('No job listings found.');
  return jobs;
};

const esunfhc: Source = {
  id: 'esunfhc',
  name: 'E.SUN FHC',
  scrape,
};

export default esunfhc;

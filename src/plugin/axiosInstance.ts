import axios from 'axios';
import axiosRetry from 'axios-retry';
import config from '../config/index.ts';

const axiosInstance = axios.create({
  timeout: config.http.timeoutMs,
  maxContentLength: config.http.maxContentLength,
  maxBodyLength: 1024 * 1024,
  maxRedirects: 5,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  },
});

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT',
});

/** GET a page as text, failing on an empty body. */
export const fetchHtml = async (url: string): Promise<string> => {
  const { data } = await axiosInstance.get<string>(url, {
    responseType: 'text',
  });
  if (!data) throw new Error('Failed to load the webpage.');
  return data;
};

export default axiosInstance;

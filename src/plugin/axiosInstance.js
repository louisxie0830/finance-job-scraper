import axios from 'axios';
import axiosRetry from 'axios-retry';

const axiosInstance = axios.create();

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.code === 'ETIMEDOUT'
    );
  },
});

export default axiosInstance;

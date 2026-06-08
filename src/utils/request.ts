import axios from 'axios';
import type { ApiResponse } from '../../shared/types.js';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

request.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse;
    if (!data.success) {
      return Promise.reject(new Error(data.error || data.message || '请求失败'));
    }
    return response;
  },
  (error) => {
    const message = error.response?.data?.error || error.message || '网络错误';
    return Promise.reject(new Error(message));
  }
);

export default request;

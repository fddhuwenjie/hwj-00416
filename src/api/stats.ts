import request from '../utils/request.js';
import type { DashboardStats, RevenueData, ApiResponse } from '../../shared/types.js';

export const statsApi = {
  getDashboard: () => {
    return request.get<ApiResponse<DashboardStats>>('/stats/dashboard').then(r => r.data.data!);
  },

  getRevenue: (days?: number) => {
    return request.get<ApiResponse<RevenueData[]>>('/stats/revenue', { params: { days } }).then(r => r.data.data!);
  },
};

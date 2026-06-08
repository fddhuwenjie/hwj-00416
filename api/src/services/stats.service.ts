import { statsRepository } from '../repositories/stats.repository.js';
import type { DashboardStats, RevenueData } from '../../../shared/types.js';

export class StatsService {
  async getDashboardStats(): Promise<DashboardStats> {
    return statsRepository.getDashboardStats();
  }

  async getRevenueData(days: number = 30): Promise<RevenueData[]> {
    return statsRepository.getRevenueData(days);
  }
}

export const statsService = new StatsService();

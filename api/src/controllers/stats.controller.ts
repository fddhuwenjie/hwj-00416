import { Request, Response } from 'express';
import { statsService } from '../services/stats.service.js';
import type { ApiResponse } from '../../../shared/types.js';

export class StatsController {
  async getDashboardStats(_req: Request, res: Response) {
    try {
      const stats = await statsService.getDashboardStats();
      res.json({ success: true, data: stats } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }

  async getRevenueData(req: Request, res: Response) {
    try {
      const { days } = req.query;
      const data = await statsService.getRevenueData(days ? Number(days) : 30);
      res.json({ success: true, data } as ApiResponse);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message } as ApiResponse);
    }
  }
}

export const statsController = new StatsController();

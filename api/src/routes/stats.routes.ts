import { Router } from 'express';
import { statsController } from '../controllers/stats.controller.js';

const router = Router();

router.get('/dashboard', statsController.getDashboardStats);
router.get('/revenue', statsController.getRevenueData);

export default router;

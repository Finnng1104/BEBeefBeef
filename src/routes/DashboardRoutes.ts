import { Router } from 'express';
import DashboardController from '../controller/DashboardController';

const router = Router();

router.get('/metrics', DashboardController.getMetrics);
router.get('/revenue-chart', DashboardController.getRevenueChart);
router.get('/recent-transactions', DashboardController.getRecentTransactions);

export default router;

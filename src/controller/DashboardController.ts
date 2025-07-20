import { Request, Response } from 'express';
import DashboardService from '../services/DashboardService';

class DashboardController {
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const timeRange = (req.query.timeRange as 'daily' | 'weekly' | 'monthly') || 'daily';
      const data = await DashboardService.getMetrics(timeRange);

      res.status(200).json({
        success: true,
        message: 'Dashboard metrics retrieved successfully',
        data,
      });
    } catch (error: any) {
      console.error('Error retrieving dashboard metrics:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getRevenueChart(req: Request, res: Response): Promise<void> {
    try {
      const { year } = req.query;
      const selectedYear = year ? parseInt(year as string) : new Date().getFullYear();

      const data = await DashboardService.getRevenueChart(selectedYear);
      res.status(200).json({
        success: true,
        message: 'Revenue chart retrieved successfully',
        data,
      });
    } catch (error: any) {
      console.error('Error retrieving revenue chart:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getRecentTransactions(req: Request, res: Response): Promise<void> {
    try {
      const data = await DashboardService.getRecentTransactions();
      res.status(200).json({
        success: true,
        message: 'Recent transactions retrieved successfully',
        data,
      });
    } catch (error: any) {
      console.error('Error retrieving recent transactions:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default DashboardController;

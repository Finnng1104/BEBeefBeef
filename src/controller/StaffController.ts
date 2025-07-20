import StaffService from '../services/StaffService';
import { Request, Response } from 'express';

class StaffController {
  async getAllStaff(req: Request, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 1000;
      const allStaff = await StaffService.getAllStaff(page, pageSize);
      return res.status(200).json(allStaff);
    } catch (error: any) {
      return res.status(500).json({
        status: 'Error',
        message: error.message,
      });
    }
  }

  async createStaff(req: Request, res: Response) {
    try {
      const staff = await StaffService.createStaff(req.body);
      return res.status(201).json(staff);
    } catch (error: any) {
      return res.status(500).json({
        status: 'Error',
        message: error.message,
      });
    }
  }

  async updateStaff(req: Request, res: Response): Promise<Response> {
    try {
      const { staffId } = req.params;
      const data = req.body;
      const result = await StaffService.updateStaff(staffId, data);

      if (result.status === 'SUCCESS') {
        return res.status(200).json({
          status: result.status,
          message: result.message,
          data: result.data,
        });
      } else {
        return res.status(400).json({
          status: result.status,
          message: result.message,
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        status: 'ERROR',
        message: `Server error: ${error.message}`,
      });
    }
  }

  async deleteStaff(req: Request, res: Response): Promise<Response> {
    try {
      const { staffId } = req.params;
      const result = await StaffService.deleteStaff(staffId);

      if (result.status === 'SUCCESS') {
        return res.status(200).json({
          status: result.status,
          message: result.message,
        });
      } else {
        return res.status(400).json({
          status: result.status,
          message: result.message,
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        status: 'ERROR',
        message: `Server error: ${error.message}`,
      });
    }
  }

  async filterStaff(req: Request, res: Response) {
    try {
      const filterOptions = {
        nameSort: req.query.nameSort as string, // 'A->Z', 'Z->A'
        emailSort: req.query.emailSort as string, // 'A->Z', 'Z->A'
        gender: req.query.gender as string, // 'male', 'female', 'other'
        status: req.query.status as string, // 'active', 'inactive', 'blocked'
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 10,
      };

      const result = await StaffService.filterStaff(filterOptions);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }
}

export default new StaffController();

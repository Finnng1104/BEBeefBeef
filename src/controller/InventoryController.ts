import { Request, Response } from 'express';
import InventoryService from '../services/InventoryService';
import { IUser } from '../models/UserModel';
import { Types } from 'mongoose';

class InventoryController {
  async getInventoryTransaction(req: Request, res: Response): Promise<any> {
    const query = req.query;
    const resultTransaction = await InventoryService.getInventoryTransactions(query);
    if (resultTransaction) {
      return res.status(200).json({
        status: 'success',
        message: 'Inventory transactions retrieved successfully',
        data: resultTransaction,
      });
    } else {
      return res.status(404).json({ message: 'No inventory transactions found' });
    }
  }

  async importInventoryDaily(req: Request, res: Response): Promise<any> {
    const { ingredients, type = 'import' } = req.body;
    const userId = (req.user as IUser).id as Types.ObjectId;

    try {
      const result = await InventoryService.createInventoryBatch(
        type,
        ingredients,
        userId.toString(),
      );

      return res.status(201).json({
        status: 'success',
        message: 'Lưu batch nhập kho thành công!',
        data: result,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      return res.status(400).json({ message: error.message || 'Lỗi khi nhập kho!' });
    }
  }

  async exportInventoryDaily(req: Request, res: Response): Promise<any> {
    const { ingredients, type = 'export' } = req.body;
    const userId = (req.user as IUser).id as Types.ObjectId;

    try {
      const result = await InventoryService.createInventoryBatch(
        type,
        ingredients,
        userId.toString(),
      );

      return res.status(201).json({
        status: 'success',
        message: 'Lưu batch xuất kho thành công!',
        data: result,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      return res.status(400).json({ message: error.message || 'Lỗi khi xuất kho!' });
    }
  }

  async auditInventoryDaily(req: Request, res: Response): Promise<any> {
    const { ingredients, type = 'audit' } = req.body;
    const userId = (req.user as IUser).id as Types.ObjectId;

    try {
      const result = await InventoryService.createInventoryBatch(
        type,
        ingredients,
        userId.toString(),
      );

      return res.status(201).json({
        status: 'success',
        message: 'Lưu batch kiểm kê kho thành công!',
        data: result,
      });
    } catch (error: any) {
      console.error('Audit error:', error);
      return res.status(400).json({ message: error.message || 'Lỗi khi kiểm kê kho!' });
    }
  }

  async exportInventoryTransactionsExcel(req: Request, res: Response): Promise<any> {
    try {
      const fileBuffer = await InventoryService.generateInventoryExcel(req.query);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_transactions.xlsx');

      return res.send(fileBuffer);
    } catch (error) {
      console.error('❌ Export error:', error);
      return res.status(500).json({ message: 'Export failed', error });
    }
  }

  async exportInventoryTransactionsCsv(req: Request, res: Response): Promise<any> {
    try {
      const fileBuffer = await InventoryService.generateInventoryCsv(req.query);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_transactions.csv');

      return res.send(fileBuffer);
    } catch (error) {
      console.error('❌ Export error:', error);
      return res.status(500).json({ message: 'Export failed', error });
    }
  }

  async exportInventoryTransactionsPdf(req: Request, res: Response): Promise<any> {
    try {
      const pdfBuffer = await InventoryService.generateInventoryPdf(req.query);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_transactions.pdf');

      if (pdfBuffer.length === 0) {
        throw new Error('Generated PDF is empty.');
      }

      return res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ Export error:', error);
      return res.status(500).json({ message: 'Export failed', error });
    }
  }
}

export default new InventoryController();

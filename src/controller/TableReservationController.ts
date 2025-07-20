import { Request, Response } from 'express';
import TableReservationService from '../services/TableReservationService';
import { IUser } from '../models/UserModel';

const TableReservationController = {
  getAllStatus: async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await TableReservationService.getAllStatus();
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get table status error:', error);
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  holdTable: async (req: Request, res: Response): Promise<void> => {
    try {
      const { table_code, heldBy, date, time } = req.body;
      const userId = (req.user as IUser)?.id || heldBy; // ưu tiên token, nếu không có thì lấy từ body

      if (!table_code) {
        res.status(400).json({ message: 'Thiếu mã bàn' });
        return;
      }

      if (!date || !time) {
        res.status(400).json({ message: 'Thiếu thông tin ngày và giờ' });
        return;
      }

      const result = await TableReservationService.holdTable(table_code, userId, date, time);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'TABLE_ALREADY_HELD') {
        res.status(409).json({ message: 'Bàn này đang được giữ bởi người khác' });
        return;
      }
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  releaseTable: async (req: Request, res: Response): Promise<void> => {
    try {
      const { table_code } = req.body;
      const userId = (req.user as IUser)?.id;
      if (!table_code || !userId) {
        res.status(400).json({ message: 'Thiếu thông tin huỷ giữ bàn' });
        return;
      }
      const result = await TableReservationService.releaseTable(table_code, userId);
      res.json({ success: true, data: result });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },
};

export default TableReservationController;

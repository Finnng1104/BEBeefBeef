import { Request, Response } from 'express';
import FCMTokenModel from '../models/FCMTokenModel';

const FCMController = {
  async registerToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ message: 'Token là bắt buộc' });
        return;
      }

      await FCMTokenModel.updateOne(
        { userId, token },
        { $set: { userId, token, updatedAt: new Date() } },
        { upsert: true },
      );

      res.status(200).json({ message: 'Đăng ký token thành công' });
    } catch (error) {
      console.error('registerToken error:', error);
      res.status(500).json({ message: 'Lỗi khi đăng ký FCM token' });
    }
  },
};

export default FCMController;

import { Request, Response } from 'express';
import LoyaltyService from '../services/LoyaltyService';

const LoyaltyController = {
  // Lấy điểm hiện tại, tổng chi tiêu, hạng của user
  async getAccountInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?._id || req.params.userId;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const info = await LoyaltyService.getAccountInfo(userId);
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy lịch sử cộng/trừ điểm
  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?._id || req.params.userId;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const history = await LoyaltyService.getTransactionHistory(userId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Cộng điểm và tổng chi tiêu (khi đơn hàng thành công)
  async addPoints(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?._id || req.body.userId;
      const { orderId, amount } = req.body;
      if (!userId || !orderId || !amount) {
        res.status(400).json({ message: 'Thiếu thông tin' });
        return;
      }
      const result = await LoyaltyService.addPoints(userId, orderId, amount);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy danh sách tất cả các tier
  async getAllTiers(req: Request, res: Response): Promise<void> {
    try {
      const tiers = await LoyaltyService.getAllTiers();
      res.json(tiers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy danh sách các tier active (cho user)
  async getActiveTiers(req: Request, res: Response): Promise<void> {
    try {
      const tiers = await LoyaltyService.getActiveTiers();
      res.json(tiers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Tạo tier mới (cho admin)
  async createTier(req: Request, res: Response): Promise<void> {
    try {
      const { tier_name, min_spent, discount, benefits } = req.body;
      if (!tier_name || !min_spent || !discount) {
        res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        return;
      }
      const tier = await LoyaltyService.createTier({
        tier_name,
        min_spent,
        discount,
        benefits,
      });
      res.status(201).json(tier);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Cập nhật tier (cho admin)
  async updateTier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;
      const tier = await LoyaltyService.updateTier(id, data);
      res.json(tier);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Xóa tier (cho admin)
  async deleteTier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tier = await LoyaltyService.deleteTier(id);
      res.json(tier);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy tất cả định nghĩa milestone (cho admin)
  async getAllMilestoneDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const milestones = await LoyaltyService.getAllMilestoneDefinitions();
      res.json(milestones);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Tạo định nghĩa milestone mới (cho admin)
  async createMilestoneDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { milestone_amount, milestone_name, description, voucher_id } = req.body;
      if (!milestone_amount || !milestone_name || !voucher_id) {
        res.status(400).json({ message: 'Thiếu thông tin' });
        return;
      }
      const milestone = await LoyaltyService.createMilestoneDefinition({
        milestone_amount,
        milestone_name,
        description,
        voucher_id,
      });
      res.json(milestone);
    } catch (err: any) {
      console.error('Lỗi khi tạo milestone:', err); // Thêm log lỗi chi tiết
      res.status(500).json({ message: err.message, error: err });
    }
  },

  // Cập nhật định nghĩa milestone (cho admin)
  async updateMilestoneDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;
      // Không cần validate description ở đây
      const milestone = await LoyaltyService.updateMilestoneDefinition(id, data);
      res.json(milestone);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Xóa định nghĩa milestone (cho admin)
  async deleteMilestoneDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const milestone = await LoyaltyService.deleteMilestoneDefinition(id);
      res.json(milestone);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy lịch sử các mốc đã đạt được của user
  async getUserMilestones(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?._id || req.params.userId;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const milestones = await LoyaltyService.getUserMilestones(userId);
      res.json(milestones);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy tất cả giao dịch (cho admin)
  async getAllTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, search, type } = req.query;
      const transactions = await LoyaltyService.getAllTransactions({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        type: type as string,
      });
      res.json(transactions);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy tất cả tài khoản loyalty (cho admin)
  async getAllAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const accounts = await LoyaltyService.getAllAccounts({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
      });
      res.json(accounts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy chi tiết tài khoản loyalty của user cụ thể (cho admin)
  async getAccountByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const account = await LoyaltyService.getAccountByUserId(userId);
      res.json(account);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  async updateAccount(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updated = await LoyaltyService.updateAccount(id, data);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  // Lấy các mốc quà tặng đang active (cho user)
  async getActiveMilestoneDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const milestones = await LoyaltyService.getActiveMilestoneDefinitions();
      res.json(milestones);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
};

export default LoyaltyController;

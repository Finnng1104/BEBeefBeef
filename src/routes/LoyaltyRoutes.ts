import { Router } from 'express';
import LoyaltyController from '../controller/LoyaltyController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';

const router = Router();

// Lấy thông tin tài khoản loyalty của user hiện tại
router.get('/account', AuthMiddleWare.verifyToken, LoyaltyController.getAccountInfo);
// Lấy lịch sử giao dịch điểm của user hiện tại
router.get('/transactions', AuthMiddleWare.verifyToken, LoyaltyController.getTransactionHistory);
// Cộng điểm khi đơn hàng thành công (có thể dùng cho webhook hoặc gọi từ BE)
router.post('/add-points', LoyaltyController.addPoints);
// Lấy danh sách tất cả các tier
router.get('/tiers', LoyaltyController.getAllTiers);
router.get('/tiers/active', LoyaltyController.getActiveTiers);

// ===== ADMIN ROUTES =====
// Tier Management
router.post('/tiers', AuthMiddleWare.verifyToken, LoyaltyController.createTier);
router.put('/tiers/:id', AuthMiddleWare.verifyToken, LoyaltyController.updateTier);
router.delete('/tiers/:id', AuthMiddleWare.verifyToken, LoyaltyController.deleteTier);

// Milestone Definitions Management
router.get(
  '/milestone-definitions',
  AuthMiddleWare.verifyToken,
  LoyaltyController.getAllMilestoneDefinitions,
);
router.post(
  '/milestone-definitions',
  AuthMiddleWare.verifyToken,
  LoyaltyController.createMilestoneDefinition,
);
router.put(
  '/milestone-definitions/:id',
  AuthMiddleWare.verifyToken,
  LoyaltyController.updateMilestoneDefinition,
);
router.delete(
  '/milestone-definitions/:id',
  AuthMiddleWare.verifyToken,
  LoyaltyController.deleteMilestoneDefinition,
);

// Lấy các mốc quà tặng active cho user
router.get(
  '/milestone-definitions/active',
  AuthMiddleWare.verifyToken,
  LoyaltyController.getActiveMilestoneDefinitions,
);

// User Milestones
router.get('/milestones', AuthMiddleWare.verifyToken, LoyaltyController.getUserMilestones);

// Admin Transaction History
router.get('/admin/transactions', AuthMiddleWare.verifyToken, LoyaltyController.getAllTransactions);

// Admin Account Management
router.get('/admin/accounts', AuthMiddleWare.verifyToken, LoyaltyController.getAllAccounts);
router.get(
  '/admin/accounts/:userId',
  AuthMiddleWare.verifyToken,
  LoyaltyController.getAccountByUserId,
);
router.put('/admin/accounts/:id', AuthMiddleWare.verifyToken, LoyaltyController.updateAccount);

export default router;

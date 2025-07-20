import cron from 'node-cron';
import LoyaltyAccount from '../models/LoyaltyAccountModel';
import LoyaltyService from '../services/LoyaltyService';

// Hàm chỉ reset chi tiêu năm mới về 0
export const runLoyaltyYearlyJob = async () => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();

  // Lấy tất cả account
  const accounts = await LoyaltyAccount.find();

  for (const account of accounts) {
    // Reset chi tiêu năm mới về 0
    account.yearly_spending[currentYear] = 0;
    account.markModified('yearly_spending');
    await LoyaltyService.recalculateTier(account);
    await account.save();
  }

  console.log(`[LOYALTY] Đã reset chi tiêu về 0 cho năm ${currentYear}.`);
};

// Lên lịch chạy vào 00:00 ngày 1/1 hàng năm
export const scheduleLoyaltyYearlyJob = () => {
  cron.schedule('0 0 1 1 *', async () => {
    await runLoyaltyYearlyJob();
  });
};

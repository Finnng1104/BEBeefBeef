import LoyaltyAccount from '../models/LoyaltyAccountModel';
import LoyaltyTransaction from '../models/LoyaltyTransactionModel';
import LoyaltyTier from '../models/LoyaltyTierModel';
import LoyaltyMilestoneDefinition from '../models/LoyaltyMilestoneDefinitionModel';
import VoucherService from './VoucherService';
import UserVoucher from '../models/UserVoucherModel';
import { Types } from 'mongoose';
import LoyaltyMilestone from '../models/LoyaltyMilestoneModel';

const POINTS_PER_AMOUNT = 100000; // 1 điểm cho mỗi 100.000đ

const LoyaltyService = {
  // Lấy điểm, tổng chi tiêu, tier hiện tại
  async getAccountInfo(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const account = await LoyaltyAccount.findOne({ user_id: userObjectId }).populate(
      'current_tier',
    );
    if (!account) return { total_points: 0, total_spent: 0, current_tier: null };
    const accountObj = account.toObject();
    return {
      ...accountObj,
      current_tier: accountObj.current_tier, // đã populate
    };
  },

  // Lấy lịch sử cộng/trừ điểm
  async getTransactionHistory(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const account = await LoyaltyAccount.findOne({ user_id: userObjectId });
    if (!account) return [];
    return LoyaltyTransaction.find({ account_id: account._id }).sort({ created_at: -1 });
  },

  // Lấy tất cả các tier
  async getAllTiers() {
    return LoyaltyTier.find().sort({ min_spent: 1 });
  },

  // Lấy các tier active (cho user)
  async getActiveTiers() {
    return LoyaltyTier.find({ is_active: true }).sort({ min_spent: 1 });
  },

  // Tạo tier mới (cho admin)
  async createTier(data: {
    tier_name: 'new' | 'bronze' | 'silver' | 'gold' | 'diamond';
    min_spent: number;
    discount: number;
    benefits?: string;
  }) {
    return LoyaltyTier.create(data);
  },

  // Cập nhật tier (cho admin)
  async updateTier(id: string, data: any) {
    // Không cho update sort_order
    if ('sort_order' in data) delete data.sort_order;
    return LoyaltyTier.findByIdAndUpdate(id, data, { new: true });
  },

  // Xóa tier (cho admin)
  async deleteTier(id: string) {
    return LoyaltyTier.findByIdAndDelete(id);
  },

  // Hàm tính lại tier dựa trên tổng chi tiêu tích lũy
  async recalculateTier(account: any) {
    const tiers = await LoyaltyTier.find().sort({ min_spent: 1 });
    const totalSpent = account.total_spent || 0;
    let newTier = account.current_tier;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (totalSpent >= tiers[i].min_spent) {
        newTier = tiers[i]._id;
        break;
      }
    }
    account.current_tier = newTier;
    return account;
  },

  // Lấy tất cả các định nghĩa milestone (cho admin)
  async getAllMilestoneDefinitions() {
    // Lấy tất cả các mốc, không filter is_active
    return LoyaltyMilestoneDefinition.find().populate('voucher_id').sort({ milestone_amount: 1 });
  },

  // Lấy các mốc quà tặng đang active (cho user)
  async getActiveMilestoneDefinitions() {
    return LoyaltyMilestoneDefinition.find({ is_active: true })
      .populate('voucher_id')
      .sort({ milestone_amount: 1 });
  },

  // Tạo định nghĩa milestone mới (cho admin)
  async createMilestoneDefinition(data: {
    milestone_amount: number;
    milestone_name: string;
    description: string;
    voucher_id: string;
  }) {
    // Kiểm tra voucher có tồn tại và type là 'gift' không
    const voucher = await VoucherService.getVoucherById(data.voucher_id);
    if (!voucher) {
      throw new Error('Voucher không tồn tại');
    }
    if (voucher.type !== 'gift') {
      throw new Error('Voucher phải có type là "gift"');
    }
    // Kiểm tra voucher đã được gán cho mốc nào khác chưa
    const existingMilestone = await LoyaltyMilestoneDefinition.findOne({
      voucher_id: data.voucher_id,
    });
    if (existingMilestone) {
      throw new Error('Voucher này đã được gán cho một mốc khác');
    }
    return LoyaltyMilestoneDefinition.create(data);
  },

  // Cập nhật định nghĩa milestone (cho admin)
  async updateMilestoneDefinition(id: string, data: any) {
    // Lấy milestone hiện tại
    const milestone = await LoyaltyMilestoneDefinition.findById(id);
    if (!milestone) {
      throw new Error('Không tìm thấy mốc quà tặng');
    }
    // Nếu có voucher_id mới và khác voucher_id cũ, kiểm tra đã gán cho mốc khác chưa
    if (data.voucher_id && data.voucher_id !== milestone.voucher_id.toString()) {
      const existingMilestone = await LoyaltyMilestoneDefinition.findOne({
        voucher_id: data.voucher_id,
      });
      if (existingMilestone) {
        throw new Error('Voucher này đã được gán cho một mốc khác');
      }
    }
    // Kiểm tra đã áp dụng cho user chưa (dựa vào bảng UserVoucher)
    const hasApplied = await UserVoucher.exists({ voucher_id: milestone.voucher_id });
    // Nếu đã áp dụng, chỉ cho sửa các trường: milestone_name, description, is_active
    if (hasApplied) {
      const allowedFields = ['milestone_name', 'description', 'is_active'];
      Object.keys(data).forEach((key) => {
        if (!allowedFields.includes(key)) {
          delete data[key];
        }
      });
    }
    // Nếu chưa áp dụng, cho sửa tất cả (trừ milestone_amount)
    else {
      if ('milestone_amount' in data) delete data.milestone_amount;
    }
    // Nếu có voucher_id mới, kiểm tra voucher
    if (data.voucher_id) {
      const voucher = await VoucherService.getVoucherById(data.voucher_id);
      if (!voucher) {
        throw new Error('Voucher không tồn tại');
      }
      if (voucher.type !== 'gift') {
        throw new Error('Voucher phải có type là "gift"');
      }
    }
    return LoyaltyMilestoneDefinition.findByIdAndUpdate(id, data, { new: true });
  },

  // Xóa định nghĩa milestone (cho admin)
  async deleteMilestoneDefinition(id: string) {
    return LoyaltyMilestoneDefinition.findByIdAndUpdate(id, { is_active: false }, { new: true });
  },

  // Lấy tất cả giao dịch (cho admin)
  async getAllTransactions(params: {
    page: number;
    limit: number;
    search?: string;
    type?: string;
  }) {
    const { page, limit, search, type } = params;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search) {
      // Tìm kiếm theo user thông qua account_id
      const accounts = await LoyaltyAccount.find({
        $or: [
          { 'user.username': { $regex: search, $options: 'i' } },
          { 'user.email': { $regex: search, $options: 'i' } },
        ],
      }).populate('user_id');
      const accountIds = accounts.map((acc) => acc._id);
      query.account_id = { $in: accountIds };
    }

    const transactions = await LoyaltyTransaction.find(query)
      .populate({
        path: 'account_id',
        populate: {
          path: 'user_id',
          select: 'username email',
        },
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LoyaltyTransaction.countDocuments(query);

    // Map user info ra ngoài transaction
    const mappedTransactions = transactions.map((tx) => {
      let user;
      if (
        tx.account_id &&
        typeof tx.account_id === 'object' &&
        tx.account_id !== null &&
        'user_id' in tx.account_id &&
        tx.account_id.user_id &&
        typeof tx.account_id.user_id === 'object' &&
        'username' in tx.account_id.user_id
      ) {
        user = {
          username: tx.account_id.user_id.username,
          email: 'email' in tx.account_id.user_id ? tx.account_id.user_id.email : undefined,
        };
      }
      return {
        ...tx.toObject(),
        user,
      };
    });

    return {
      docs: mappedTransactions,
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  // Lấy tất cả tài khoản loyalty (cho admin)
  async getAllAccounts(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      query['user.username'] = { $regex: search, $options: 'i' };
    }

    const accounts = await LoyaltyAccount.find(query)
      .populate('user_id', 'username email full_name')
      .populate('current_tier') // lấy toàn bộ LoyaltyTier
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LoyaltyAccount.countDocuments(query);

    // Map user info ra ngoài, trả về current_tier đúng model
    const mappedAccounts = accounts.map((acc) => {
      let user;
      if (
        acc.user_id &&
        typeof acc.user_id === 'object' &&
        acc.user_id !== null &&
        'username' in acc.user_id
      ) {
        user = {
          username: acc.user_id.username,
          email: 'email' in acc.user_id ? acc.user_id.email : undefined,
          full_name: 'full_name' in acc.user_id ? acc.user_id.full_name : undefined,
        };
      }
      return {
        ...acc.toObject(),
        user,
        created_at: acc.updated_at,
      };
    });

    return {
      docs: mappedAccounts,
      totalDocs: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  // Lấy chi tiết tài khoản loyalty của user cụ thể (cho admin)
  async getAccountByUserId(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    return LoyaltyAccount.findOne({ user_id: userObjectId })
      .populate('user_id', 'username email full_name')
      .populate('current_tier');
  },

  // Kiểm tra và tạo voucher quà tặng khi đạt mốc chi tiêu hàng năm
  async checkAndCreateGiftVouchers(userId: string, yearlySpending: number) {
    const userObjectId = new Types.ObjectId(userId);
    const currentYear = new Date().getFullYear().toString();

    // Lấy các định nghĩa milestone từ database (có populate voucher)
    const milestoneDefinitions = await LoyaltyMilestoneDefinition.find({ is_active: true })
      .populate('voucher_id')
      .sort({ milestone_amount: 1 });

    // Tìm các mốc đã đạt được
    const achievedMilestones = milestoneDefinitions.filter(
      (milestone) => yearlySpending >= milestone.milestone_amount && milestone.voucher_id,
    );

    if (achievedMilestones.length === 0) return;

    for (const milestone of achievedMilestones) {
      // Kiểm tra xem user đã đạt mốc này trong năm này chưa
      const existingMilestone = await LoyaltyMilestone.findOne({
        user_id: userObjectId,
        year: currentYear,
        milestone_amount: milestone.milestone_amount,
      });

      if (existingMilestone) {
        // Đã đạt mốc này rồi, kiểm tra xem đã tạo voucher chưa
        if (existingMilestone.voucher_created) continue;

        // Gán voucher cho user (voucher đã tồn tại, chỉ cần assign)
        if (
          milestone.voucher_id &&
          typeof milestone.voucher_id === 'object' &&
          'code' in milestone.voucher_id &&
          'type' in milestone.voucher_id &&
          'discount_type' in milestone.voucher_id &&
          'discount_value' in milestone.voucher_id &&
          'quantity' in milestone.voucher_id
        ) {
          await VoucherService.assignVoucherToUsers(
            milestone.voucher_id as unknown as import('../models/VoucherModel').IVoucher,
            [userId],
          );
        }

        // Cập nhật milestone đã tạo voucher
        existingMilestone.voucher_created = true;
        existingMilestone.voucher_id = milestone.voucher_id._id;
        await existingMilestone.save();

        console.log(
          `[LOYALTY] Đã gán voucher ${
            milestone.voucher_id &&
            typeof milestone.voucher_id === 'object' &&
            'code' in milestone.voucher_id
              ? milestone.voucher_id.code
              : ''
          } cho user ${userId} khi đạt mốc ${milestone.milestone_amount}đ`,
        );
      } else {
        // Lần đầu đạt mốc này, tạo milestone record
        const newMilestone = await LoyaltyMilestone.create({
          user_id: userObjectId,
          year: currentYear,
          milestone_amount: milestone.milestone_amount,
          achieved_at: new Date(),
          voucher_created: false,
        });

        // Gán voucher cho user (voucher đã tồn tại, chỉ cần assign)
        if (
          milestone.voucher_id &&
          typeof milestone.voucher_id === 'object' &&
          'code' in milestone.voucher_id &&
          'type' in milestone.voucher_id &&
          'discount_type' in milestone.voucher_id &&
          'discount_value' in milestone.voucher_id &&
          'quantity' in milestone.voucher_id
        ) {
          await VoucherService.assignVoucherToUsers(
            milestone.voucher_id as unknown as import('../models/VoucherModel').IVoucher,
            [userId],
          );
        }

        // Cập nhật milestone đã tạo voucher
        newMilestone.voucher_created = true;
        newMilestone.voucher_id = milestone.voucher_id._id;
        await newMilestone.save();

        console.log(
          `[LOYALTY] Đã gán voucher ${
            milestone.voucher_id &&
            typeof milestone.voucher_id === 'object' &&
            'code' in milestone.voucher_id
              ? milestone.voucher_id.code
              : ''
          } cho user ${userId} khi đạt mốc ${milestone.milestone_amount}đ`,
        );
      }
    }
  },

  // Lấy lịch sử các mốc đã đạt được của user
  async getUserMilestones(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    return LoyaltyMilestone.find({ user_id: userObjectId })
      .populate('voucher_id')
      .sort({ year: -1, milestone_amount: -1 });
  },

  // Cộng điểm và tổng chi tiêu (khi đơn hàng thành công)
  async addPoints(userId: string, orderId: string, amount: number) {
    const userObjectId = new Types.ObjectId(userId);
    const orderObjectId = new Types.ObjectId(orderId);
    let account = await LoyaltyAccount.findOne({ user_id: userObjectId });
    // Lấy danh sách tier, sort tăng dần theo min_spent
    const tiers = await LoyaltyTier.find().sort({ min_spent: 1 });
    const currentYear = new Date().getFullYear().toString();
    if (!account) {
      const lowestTier = tiers[0]?._id;
      account = await LoyaltyAccount.create({
        user_id: userObjectId,
        total_points: 0,
        total_spent: 0,
        current_tier: lowestTier,
        yearly_spending: { [currentYear]: 0 },
      });
    }
    // Tính điểm cộng thêm
    const addPoints = Math.floor(amount / POINTS_PER_AMOUNT);
    account.total_points += addPoints;
    // Cập nhật yearly_spending
    if (!account.yearly_spending) account.yearly_spending = {};
    if (!account.yearly_spending[currentYear]) account.yearly_spending[currentYear] = 0;
    account.yearly_spending[currentYear] += amount;
    account.markModified('yearly_spending');
    // Cập nhật total_spent là tổng tích lũy
    account.total_spent += amount;
    // Tìm tier phù hợp nhất dựa trên tổng chi tiêu tích lũy
    let newTier = account.current_tier;
    const totalSpent = account.total_spent;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (totalSpent >= tiers[i].min_spent) {
        newTier = tiers[i]._id as Types.ObjectId;
        break;
      }
    }
    account.current_tier = newTier;
    await account.save();

    // Kiểm tra và tạo voucher quà tặng dựa trên chi tiêu năm hiện tại
    const yearlySpending = account.yearly_spending[currentYear];
    await this.checkAndCreateGiftVouchers(userId, yearlySpending);

    // Ghi nhận transaction
    await LoyaltyTransaction.create({
      account_id: account._id,
      order_id: orderObjectId,
      points: addPoints,
      amount: amount,
      type: 'earn',
      note: `Cộng điểm từ đơn hàng ${orderId}`,
    });
    return {
      total_points: account.total_points,
      total_spent: account.total_spent,
      current_tier: account.current_tier,
      added_points: addPoints,
    };
  },

  async updateAccount(id: string, data: Partial<any>) {
    const allowedFields = ['total_points'];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    const account = await LoyaltyAccount.findByIdAndUpdate(id, updateData, { new: true });
    return account;
  },
};

export default LoyaltyService;

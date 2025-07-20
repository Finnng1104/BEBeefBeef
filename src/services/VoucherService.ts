import Voucher, { IVoucher } from '../models/VoucherModel';
import { Types } from 'mongoose';
import { PaginateResult } from 'mongoose';
import UserVoucher, { IUserVoucher } from '../models/UserVoucherModel';
import mongoose from 'mongoose';
import User from '../models/UserModel';
import MailerService from './MailerService';

interface VoucherFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  status?: 'active' | 'inactive' | 'expired' | 'out_of_stock';
  type?: 'public' | 'private' | 'gift';
  discount_type?: 'percent' | 'fixed';
  min_discount_value?: number;
  max_discount_value?: number;
  min_order_value?: number;
  max_order_value?: number;
}

// Mở rộng kiểu dữ liệu trả về để bao gồm userIds
type VoucherWithUsers = IVoucher & { userIds?: string[] };

export default class VoucherService {
  static async createVoucher(data: Partial<IVoucher>): Promise<IVoucher> {
    const status = this.calcVoucherStatus(data);
    return Voucher.create({ ...data, status });
  }

  static async getAllVouchers(params: VoucherFilterParams): Promise<PaginateResult<IVoucher>> {
    const {
      page = 1,
      limit = 12,
      search = '',
      sort = '',
      status,
      type,
      discount_type,
      min_discount_value,
      max_discount_value,
      min_order_value,
      max_order_value,
    } = params;

    const query: any = { status: { $ne: 'deleted' } };

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (discount_type) {
      query.discount_type = discount_type;
    }

    if (min_discount_value !== undefined || max_discount_value !== undefined) {
      query.discount_value = {};
      if (min_discount_value !== undefined) {
        query.discount_value.$gte = min_discount_value;
      }
      if (max_discount_value !== undefined) {
        query.discount_value.$lte = max_discount_value;
      }
    }

    if (min_order_value !== undefined || max_order_value !== undefined) {
      query.min_order_value = {};
      if (min_order_value !== undefined) {
        query.min_order_value.$gte = min_order_value;
      }
      if (max_order_value !== undefined) {
        query.min_order_value.$lte = max_order_value;
      }
    }

    const sortMapping: Record<string, Record<string, 1 | -1>> = {
      codeAZ: { code: 1 },
      codeZA: { code: -1 },
      typeAZ: { type: 1 },
      typeZA: { type: -1 },
      discountValueLow: { discount_value: 1 },
      discountValueHigh: { discount_value: -1 },
      orderValueLow: { min_order_value: 1 },
      orderValueHigh: { min_order_value: -1 },
      createdAtNew: { createdAt: -1 },
      createdAtOld: { createdAt: 1 },
      statusAZ: { status: 1 },
      statusZA: { status: -1 },
    };

    const sortOption = sortMapping[sort] || { createdAt: -1 };

    const result = await (Voucher as mongoose.PaginateModel<IVoucher>).paginate(query, {
      page,
      limit,
      sort: sortOption,
    });

    return result;
  }

  static async getTrashVouchers(params: VoucherFilterParams): Promise<PaginateResult<IVoucher>> {
    const {
      page = 1,
      limit = 12,
      search = '',
      sort = '',
      type,
      discount_type,
      min_discount_value,
      max_discount_value,
      min_order_value,
      max_order_value,
    } = params;

    const query: any = { status: 'deleted' };

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (type) {
      query.type = type;
    }

    if (discount_type) {
      query.discount_type = discount_type;
    }

    if (min_discount_value !== undefined || max_discount_value !== undefined) {
      query.discount_value = {};
      if (min_discount_value !== undefined) {
        query.discount_value.$gte = min_discount_value;
      }
      if (max_discount_value !== undefined) {
        query.discount_value.$lte = max_discount_value;
      }
    }

    if (min_order_value !== undefined || max_order_value !== undefined) {
      query.min_order_value = {};
      if (min_order_value !== undefined) {
        query.min_order_value.$gte = min_order_value;
      }
      if (max_order_value !== undefined) {
        query.min_order_value.$lte = max_order_value;
      }
    }

    const sortMapping: Record<string, Record<string, 1 | -1>> = {
      codeAZ: { code: 1 },
      codeZA: { code: -1 },
      typeAZ: { type: 1 },
      typeZA: { type: -1 },
      discountValueLow: { discount_value: 1 },
      discountValueHigh: { discount_value: -1 },
      orderValueLow: { min_order_value: 1 },
      orderValueHigh: { min_order_value: -1 },
      createdAtNew: { createdAt: -1 },
      createdAtOld: { createdAt: 1 },
      statusAZ: { status: 1 },
      statusZA: { status: -1 },
    };

    const sortOption = sortMapping[sort] || { createdAt: -1 };

    const result = await (Voucher as mongoose.PaginateModel<IVoucher>).paginate(query, {
      page,
      limit,
      sort: sortOption,
    });

    return result;
  }

  static async getVoucherById(id: string): Promise<VoucherWithUsers | null> {
    if (!Types.ObjectId.isValid(id)) throw new Error('Invalid voucher id');
    const voucher = await Voucher.findById(id);
    if (!voucher) return null;

    const voucherObject: VoucherWithUsers = voucher.toObject();

    if (voucherObject.type === 'private') {
      const userVouchers = await UserVoucher.find({ voucher_id: voucher._id }).select('user_id');
      voucherObject.userIds = userVouchers.map((uv) => (uv.user_id as Types.ObjectId).toString());
    }

    return voucherObject;
  }

  static async updateVoucher(id: string, data: Partial<IVoucher> & { userIds?: string[] }) {
    if (!Types.ObjectId.isValid(id)) throw new Error('Invalid voucher id');

    const { userIds, ...voucherData } = data;
    const updatePayload: Partial<IVoucher> = { ...voucherData };
    delete updatePayload.code;
    delete updatePayload.type;

    const status = this.calcVoucherStatus(updatePayload);
    const updatedVoucher = await Voucher.findByIdAndUpdate(
      id,
      { ...updatePayload, status },
      { new: true },
    );

    if (!updatedVoucher) {
      throw new Error('Voucher not found');
    }

    if (updatedVoucher.type === 'private' && Array.isArray(userIds)) {
      const existingUserVouchers = await UserVoucher.find({ voucher_id: id });
      const existingUserIds = existingUserVouchers.map((uv) => uv.user_id.toString());
      const totalUserCount = Array.from(new Set([...existingUserIds, ...userIds])).length;
      if (typeof updatedVoucher.quantity === 'number' && totalUserCount > updatedVoucher.quantity) {
        throw new Error('Tổng số user nhận voucher không được vượt quá số lượng voucher!');
      }
      const userIdsToAdd = userIds.filter((uid) => !existingUserIds.includes(uid));
      if (userIdsToAdd.length > 0) {
        await this.assignVoucherToUsers(updatedVoucher, userIdsToAdd);
      }
    }
    return updatedVoucher;
  }

  static async deleteVoucher(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new Error('Invalid voucher id');
    return Voucher.findByIdAndUpdate(id, { status: 'deleted' }, { new: true });
  }

  static async restoreVoucher(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new Error('Invalid voucher id');
    const voucher = await Voucher.findById(id);
    if (!voucher) throw new Error('Voucher not found');
    if (voucher.status !== 'deleted') throw new Error('Voucher is not deleted');
    const now = new Date();
    let newStatus: 'active' | 'inactive' | 'expired' | 'out_of_stock';

    if (voucher.end_date && now > new Date(voucher.end_date)) {
      newStatus = 'expired';
    } else {
      newStatus = this.calcVoucherStatus(voucher.toObject());
    }

    return Voucher.findByIdAndUpdate(id, { status: newStatus }, { new: true });
  }

  static async forceDeleteVoucher(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new Error('Invalid voucher id');

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await UserVoucher.deleteMany({ voucher_id: id }, { session });
      const result = await Voucher.findByIdAndDelete(id, { session });
      if (!result) {
        throw new Error('Không tìm thấy voucher để xóa vĩnh viễn');
      }
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static calcVoucherStatus(
    data: Partial<IVoucher>,
  ): 'active' | 'inactive' | 'expired' | 'out_of_stock' {
    const now = new Date();
    if (
      typeof data.quantity === 'number' &&
      typeof data.used === 'number' &&
      data.quantity > 0 &&
      data.used >= data.quantity
    ) {
      return 'out_of_stock';
    }
    if (data.end_date && now > new Date(data.end_date)) {
      return 'expired';
    }
    if (data.start_date && now < new Date(data.start_date)) {
      return 'inactive';
    }
    return 'active';
  }

  static async getPublicActiveVouchers(page = 1, limit = 12) {
    const query = { type: 'public', status: { $in: ['active', 'out_of_stock'] } };
    const sortOption = { createdAt: -1 };
    return await (Voucher as mongoose.PaginateModel<IVoucher>).paginate(query, {
      page,
      limit,
      sort: sortOption,
    });
  }

  static async saveVoucherForUser(userId: string, voucherId: string): Promise<IUserVoucher> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(voucherId)) {
      throw new Error('Invalid user ID or voucher ID');
    }
    const existingRecord = await UserVoucher.findOne({
      user_id: new Types.ObjectId(userId),
      voucher_id: new Types.ObjectId(voucherId),
    });
    if (existingRecord) {
      return existingRecord;
    }
    const record = await UserVoucher.create({
      user_id: new Types.ObjectId(userId),
      voucher_id: new Types.ObjectId(voucherId),
      status: 'saved',
    });
    return record;
  }

  static async getUserVouchers(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new Error('Invalid user id');

    const userVouchers = await UserVoucher.find({ user_id: userId })
      .populate<{ voucher_id: IVoucher }>('voucher_id')
      .lean(); // Use lean for better performance

    return userVouchers
      .filter((uv) => uv.voucher_id)
      .map((uv) => {
        // Since we used .lean(), uv is a plain object, not a Mongoose document
        const { voucher_id, ...uvData } = uv;
        return {
          ...voucher_id,
          user_voucher_status: uvData.status,
          user_voucher_id: uvData._id,
          user_voucher_savedAt: uvData.createdAt,
          user_voucher_updatedAt: uvData.updatedAt,
        };
      });
  }

  static async assignVoucherToUsers(voucher: IVoucher, userIds: string[]) {
    if (!voucher || !Array.isArray(userIds) || userIds.length === 0) return;

    await this.createUserVouchersForVoucher((voucher._id as Types.ObjectId).toString(), userIds);

    const users = await User.find({ _id: { $in: userIds } })
      .select('email')
      .lean();
    if (!users || users.length === 0) return;

    const emailPromises = users.map((user) => {
      if (user.email) {
        return MailerService.sendVoucherNotification({
          userEmail: user.email,
          voucher: voucher.toObject(),
        }).catch((emailError) => {
          console.error(`Failed to send voucher email to ${user.email}`, emailError);
        });
      }
      return Promise.resolve();
    });

    await Promise.all(emailPromises);
  }

  static async createUserVouchersForVoucher(voucherId: string, userIds: string[]) {
    if (!voucherId || !Array.isArray(userIds) || userIds.length === 0) return;
    const records = userIds.map((userId) => ({
      user_id: new Types.ObjectId(userId),
      voucher_id: new Types.ObjectId(voucherId),
      status: 'saved',
    }));
    await UserVoucher.insertMany(records);
  }

  static async markVoucherUsed(userId: string, voucherId: string) {
    await Voucher.findByIdAndUpdate(voucherId, { $inc: { used: 1 } });
    await UserVoucher.findOneAndUpdate(
      { user_id: userId, voucher_id: voucherId },
      { status: 'used', used_at: new Date() },
    );
  }

  static async validateVoucherForOrder({
    voucher_id,
    user_id,
    items,
  }: {
    voucher_id: string;
    user_id: string;
    items: any[];
    discount_amount?: number;
  }) {
    if (!voucher_id) return;
    const voucher = await Voucher.findById(voucher_id);
    if (!voucher) throw { statusCode: 400, message: 'Voucher không tồn tại!' };
    const now = new Date();
    if (voucher.start_date && now < new Date(voucher.start_date))
      throw { statusCode: 400, message: 'Voucher chưa đến thời gian sử dụng!' };
    if (voucher.end_date && now > new Date(voucher.end_date))
      throw { statusCode: 400, message: 'Voucher đã hết hạn!' };
    if (voucher.quantity > 0 && voucher.used >= voucher.quantity)
      throw { statusCode: 400, message: 'Voucher đã hết lượt sử dụng!' };
    // Kiểm tra min_order_value
    if (voucher.min_order_value) {
      let orderTotal = 0;
      if (Array.isArray(items)) {
        orderTotal = items.reduce(
          (sum, item) => sum + (item.unit_price || item.price || 0) * (item.quantity || 1),
          0,
        );
      }
      if (orderTotal < voucher.min_order_value)
        throw {
          statusCode: 400,
          message: `Đơn hàng phải tối thiểu ${voucher.min_order_value}đ để dùng voucher!`,
        };
    }
    // Nếu là private, kiểm tra user sở hữu và chưa dùng
    if (voucher.type === 'private') {
      const userVoucher = await UserVoucher.findOne({ user_id, voucher_id: voucher._id });
      if (!userVoucher) throw { statusCode: 400, message: 'Bạn không sở hữu voucher này!' };
      if (userVoucher.status === 'used')
        throw { statusCode: 400, message: 'Voucher này đã được sử dụng!' };
      if (userVoucher.status === 'expired')
        throw { statusCode: 400, message: 'Voucher này đã hết hạn!' };
    }
    return true;
  }
}

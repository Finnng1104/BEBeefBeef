import mongoose from 'mongoose';
import Roles from '../models/RoleModel';
import User, { IUser } from '../models/UserModel';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import LoyaltyService from './LoyaltyService';

dayjs.extend(customParseFormat);
interface FilterUserOptions {
  keyword?: string;
  nameSort?: string;
  emailSort?: string;
  gender?: string;
  status?: string;
  role?: string;
  isVerified?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

interface GetAllUserParams {
  page?: number;
  limit?: number;
  keyword?: string;
  sort?: string;
  order?: string;
}
class UserService {
  getAllUser = async ({
    page = 1,
    limit = 10,
    keyword = '',
    sort = '',
    order = 'asc',
  }: GetAllUserParams) => {
    const matchStage: any = {};

    if (keyword) {
      matchStage.$or = [
        { username: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const sortStage: any = {};
    if (sort) {
      sortStage[sort] = order === 'desc' ? -1 : 1;
    }

    const aggregatePipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user_id',
          as: 'orders',
        },
      },
      {
        $addFields: {
          ordersCount: { $size: '$orders' },
        },
      },
      { $unset: 'orders' },
      { $sort: Object.keys(sortStage).length ? sortStage : { _id: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'roles',
          localField: 'roles',
          foreignField: '_id',
          as: 'roles',
        },
      },
      {
        $project: {
          password: 0,
        },
      },
    ];

    const [users, totalDocs] = await Promise.all([
      User.aggregate(aggregatePipeline),
      User.countDocuments(matchStage),
    ]);

    // Lấy loyalty info cho từng user
    const usersWithLoyalty = await Promise.all(
      users.map(async (user: any) => {
        const loyalty = await LoyaltyService.getAccountInfo(user._id.toString());
        return {
          ...user,
          loyalty_tier: loyalty.current_tier,
          loyalty_total_spent: loyalty.total_spent,
          loyalty_total_points: loyalty.total_points,
        };
      }),
    );

    return {
      docs: usersWithLoyalty,
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      page,
      limit,
    };
  };
  async getAllUserByUserRole(page: number = 1, pageSize: number = 10): Promise<any> {
    try {
      // const allUserByUserRole = await User.find();
      const options = {
        page,
        limit: pageSize,
        populate: {
          path: 'roles',
          match: { name: 'user' },
          select: 'name description',
        },
        select: '-password',
      };

      const result = await User.paginate({}, options);

      // Lấy loyalty info cho từng user
      const usersWithLoyalty = await Promise.all(
        (result.docs as any[]).map(async (user) => {
          const loyalty = await LoyaltyService.getAccountInfo(user._id.toString());
          return {
            ...user.toObject(),
            loyalty_tier: loyalty.current_tier,
            loyalty_total_spent: loyalty.total_spent,
            loyalty_total_points: loyalty.total_points,
          };
        }),
      );

      return {
        status: 'OK',
        message: 'getAllUserByUserRole success',
        data: usersWithLoyalty,
        pagination: {
          total: result.totalDocs,
          page: result.page,
          pageSize: result.limit,
          totalPages: result.totalPages,
        },
      };
    } catch (error: any) {
      console.error('Error fetching users with role user:', error);
      throw new Error('Failed to fetch users with role user');
    }
  }

  async getUserById(userId: string): Promise<any> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
          status: 'ERROR',
          message: 'Invalid User ID',
          data: null,
        };
      }

      const user = await User.findById(userId)
        .populate({
          path: 'roles',
          select: 'name description',
        })
        .select('-password');

      if (!user) {
        return {
          status: 'ERROR',
          message: 'User not found',
          data: null,
        };
      }

      // Lấy loyalty info
      const loyalty = await LoyaltyService.getAccountInfo((user._id as any).toString());

      return {
        status: 'OK',
        message: 'User details retrieved successfully',
        data: {
          ...user.toObject(),
          loyalty_tier: loyalty.current_tier,
          loyalty_total_spent: loyalty.total_spent,
          loyalty_total_points: loyalty.total_points,
        },
      };
    } catch (error: any) {
      console.error('Error fetching user details:', error);
      throw new Error('Failed to fetch user details');
    }
  }

  async blockUser(userId: string): Promise<any> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
          status: 'ERROR',
          message: 'Invalid User ID',
          data: null,
        };
      }

      const user = await User.findById(userId);
      if (!user) {
        return {
          status: 'ERROR',
          message: 'User not found',
          data: null,
        };
      }

      if (user.status === 'block') {
        user.status = 'active';
      } else {
        user.status = 'block';
      }
      await user.save();

      return {
        status: 'OK',
        message: `User ${user.status} successfully`,
        data: user,
      };
    } catch (error: any) {
      console.error('Error blocking user:', error);
      return {
        status: 'ERROR',
        message: 'Failed to block user',
        data: null,
      };
    }
  }

  async filterUsers(options: FilterUserOptions) {
    try {
      const query: any = {};
      if (options.keyword) {
        query.$or = [
          { username: { $regex: options.keyword, $options: 'i' } },
          { email: { $regex: options.keyword, $options: 'i' } },
        ];
      }
      if (options.gender) {
        query.gender = options.gender;
      }
      if (options.status) {
        query.status = options.status;
      }
      if (options.isVerified === 'true') query.isEmailVerified = true;
      if (options.isVerified === 'false') query.isEmailVerified = false;
      if (options.startDate || options.endDate) {
        query.birthday = {};
        if (options.startDate) query.birthday.$gte = options.startDate;
        if (options.endDate) query.birthday.$lte = options.endDate;
      }
      if (options.role) {
        const roleDoc = await Roles.findOne({ name: options.role });
        if (roleDoc) {
          query.roles = roleDoc._id;
        }
      }
      const sort: any = {};
      if (options.nameSort) {
        sort.username = options.nameSort === 'A->Z' ? 1 : -1;
      }
      if (options.emailSort) {
        sort.email = options.emailSort === 'A->Z' ? 1 : -1;
      }
      const page = options.page || 1;
      const limit = options.pageSize || 10;
      const skip = (page - 1) * limit;

      const [users, totalDocuments] = await Promise.all([
        User.find(query)
          .populate('roles', 'name')
          .select('-password')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        User.countDocuments(query),
      ]);

      // Lấy loyalty info cho từng user
      const usersWithLoyalty = await Promise.all(
        users.map(async (user: any) => {
          const loyalty = await LoyaltyService.getAccountInfo(user._id.toString());
          return {
            ...user.toObject(),
            loyalty_tier: loyalty.current_tier,
            loyalty_total_spent: loyalty.total_spent,
            loyalty_total_points: loyalty.total_points,
          };
        }),
      );

      return {
        status: 'SUCCESS',
        data: {
          users: usersWithLoyalty,
          metadata: {
            total: totalDocuments,
            page,
            pageSize: limit,
            totalPages: Math.ceil(totalDocuments / limit),
          },
        },
      };
    } catch (error: any) {
      throw new Error(`Error filtering users: ${error.message}`);
    }
  }

  async updateUserInfo(userId: string, updateData: Partial<IUser>): Promise<any> {
    try {
      if (updateData.birthday && typeof updateData.birthday === 'string') {
        const parsed = dayjs(updateData.birthday, ['DD-MM-YYYY', 'YYYY-MM-DD'], true);

        if (!parsed.isValid()) {
          throw new Error(`Invalid birthday format: ${updateData.birthday}`);
        }
        updateData.birthday = parsed.toDate();
      }
      if (updateData.email) {
        const emailExists = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
        if (emailExists) {
          return {
            status: 'ERROR',
            message: 'Email đã tồn tại trên hệ thống',
          };
        }
      }
      const user = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select(
        '-password',
      );

      if (!user) {
        return {
          status: 'ERROR',
          message: 'User not found',
        };
      }

      return {
        status: 'OK',
        message: 'User updated successfully',
        data: user,
      };
    } catch (error: any) {
      throw new Error('Failed to update user info: ' + error.message);
    }
  }

  async changeUserPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.password) {
        return {
          status: 'ERROR',
          message: 'User not found or no password set',
        };
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return {
          status: 'ERROR',
          message: 'Current password is incorrect',
        };
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      return {
        status: 'OK',
        message: 'Password updated successfully',
      };
    } catch (error: any) {
      throw new Error('Failed to change password: ' + error.message);
    }
  }

  async addUser(userData: Partial<IUser>): Promise<any> {
    try {
      const {
        username,
        email,
        password,
        phone,
        birthday,
        gender,
        isEmailVerified = false,
        status = 'inactive',
        roles = [],
      } = userData;

      // Kiểm tra input cơ bản
      if (!username || !email || !password) {
        return {
          status: 'ERROR',
          message: 'Vui lòng nhập đầy đủ username, email và password',
        };
      }

      // Kiểm tra username hoặc email đã tồn tại
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return {
          status: 'ERROR',
          message: 'Email đã tồn tại',
        };
      }

      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return {
          status: 'ERROR',
          message: 'Username đã tồn tại',
        };
      }

      // Băm mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);

      // Resolve roles
      const resolvedRoles = await Roles.find({ _id: { $in: roles } });

      // Tạo người dùng mới
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        phone,
        birthday,
        gender,
        isEmailVerified,
        status,
        roles: resolvedRoles.map((r) => r._id),
      });

      const savedUser = await newUser.save();

      return {
        status: 'OK',
        message: 'Tạo người dùng thành công',
        data: savedUser,
      };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return {
        status: 'ERROR',
        message: 'Không thể tạo người dùng',
      };
    }
  }

  async checkUserPassword(userId: string, passwordToCheck: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.password) {
        return {
          status: 'ERROR',
          message: 'User not found or password not set',
        };
      }

      const isMatch = await bcrypt.compare(passwordToCheck, user.password);
      if (!isMatch) {
        return {
          status: 'ERROR',
          message: 'Password does not match',
          match: false,
        };
      }

      return {
        status: 'OK',
        message: 'Password matches',
        match: true,
      };
    } catch (error: any) {
      console.error('Error checking password:', error);
      return {
        status: 'ERROR',
        message: 'Failed to check password',
        match: false,
      };
    }
  }
}

export default new UserService();

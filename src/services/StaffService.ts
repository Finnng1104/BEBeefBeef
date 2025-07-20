import Roles from '../models/RoleModel';
import User, { IUser } from '../models/UserModel';

interface FilterStaffOptions {
  name?: string;
  email?: string;
  gender?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  nameSort?: string;
  emailSort?: string;
}

class StaffService {
  async getAllStaff(page: number, pageSize: number): Promise<any> {
    try {
      const userRole = await Roles.findOne({ name: 'user' });
      if (!userRole) {
        return {
          status: 'Error',
          message: "Role 'user' not found",
        };
      }

      const query = { roles: { $ne: userRole._id } };

      const options = {
        page,
        limit: pageSize,
        select:
          '-password -otp -otpExpiry -googleId -facebookId -roles -default_address_id -isEmailVerifided -exprireAt -isVerified',
        sort: { username: 1 },
        populate: {
          path: 'roles',
          select: 'name',
        },
      };

      const allStaff = await User.paginate(query, options);
      return {
        status: 'SUCCESS',
        data: allStaff.docs,
        metadata: {
          total: allStaff.totalDocs,
          page: allStaff.page,
          pageSize: allStaff.limit,
          totalPages: allStaff.totalPages,
        },
      };
    } catch (error: any) {
      throw new Error(`Error fetching staff: ${error.message}`);
    }
  }

  async createStaff(data: any): Promise<any> {
    try {
      let roleIds = [];
      if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
        const validRoles = await Roles.find({ name: { $in: data.roles } });
        if (validRoles.length === 0) {
          throw new Error('Invalid roles provided');
        }
        roleIds = validRoles.map((role) => role._id);
      } else {
        const defaultRole = await Roles.findOne({ name: 'staff' });
        if (!defaultRole) {
          throw new Error("Default role 'Staff' not found");
        }
        roleIds = [defaultRole._id];
      }

      const newStaff = new User({
        userName: data.userName || null,
        email: data.email || null,
        password: data.password || null,
        birthday: data.birthday || null,
        avatar: data.avatar || null,
        phone: data.phone || null,
        Active_code: data.Active_code || null,
        googleId: data.googleId || null,
        facebookId: data.facebookId || null,
        otp: data.otp || null,
        otpExpiry: data.otpExpiry || null,
        roles: roleIds,
        gender: data.gender || null,
        status: data.status || null,
        default_address_id: data.default_address_id || null,
        isEmailVerifided: data.isEmailVerifided || false,
        expireAt: data.expireAt || null,
        isVerified: data.isVerified || false,
      });

      await newStaff.save();

      return {
        status: 'SUCCESS',
        message: 'Staff created successfully',
        data: newStaff,
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: `Error creating staff: ${error.message}`,
      };
    }
  }

  async updateStaff(staffId: string, data: Partial<IUser>): Promise<any> {
    try {
      const existingStaff = await User.findById(staffId);
      if (!existingStaff) {
        throw new Error('Staff not found');
      }

      if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
        const validRoles = await Roles.find({ name: { $in: data.roles } });
        if (validRoles.length === 0) {
          throw new Error('Invalid roles provided');
        }
        data.roles = validRoles.map((role) => role._id) as any;
      }

      Object.keys(data).forEach((key) => {
        const field = key as keyof IUser;
        if (data[field] !== undefined && data[field] !== null) {
          (existingStaff as any)[field] = data[field];
        }
      });

      // Lưu thay đổi
      await existingStaff.save();

      return {
        status: 'SUCCESS',
        message: 'Staff updated successfully',
        data: existingStaff,
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: `Error updating staff: ${error.message}`,
      };
    }
  }

  async deleteStaff(staffId: string): Promise<any> {
    try {
      const existingStaff = await User.findById(staffId);
      if (!existingStaff) {
        throw new Error('Staff not found');
      }

      await existingStaff.deleteOne();

      return {
        status: 'SUCCESS',
        message: 'Staff deleted successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: `Error deleting staff: ${error.message}`,
      };
    }
  }

  async filterStaff(options: FilterStaffOptions) {
    try {
      const query: any = {};

      const userRole = await Roles.findOne({ name: 'user' });
      if (!userRole) {
        throw new Error("Role 'user' not found");
      }

      query.roles = { $ne: userRole._id };

      if (options.gender) {
        query.gender = options.gender;
      }

      if (options.status) {
        query.status = options.status;
      }

      if (options.startDate || options.endDate) {
        query.exprireAt = {};
        if (options.startDate) {
          query.exprireAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.exprireAt.$lte = options.endDate;
        }
      }

      const sort: any = {};
      if (options.nameSort) {
        sort.userName = options.nameSort === 'A->Z' ? 1 : -1;
      }

      if (options.emailSort) {
        sort.email = options.emailSort === 'A->Z' ? 1 : -1;
      }

      const page = options.page || 1;
      const limit = options.pageSize || 10;
      const skip = (page - 1) * limit;

      const [staff, totalDocuments] = await Promise.all([
        User.find(query).select('-password').sort(sort).skip(skip).limit(limit),
        User.countDocuments(query),
      ]);

      return {
        status: 'SUCCESS',
        data: {
          staff,
          metadata: {
            total: totalDocuments,
            page: page,
            pageSize: limit,
            totalPages: Math.ceil(totalDocuments / limit),
          },
        },
      };
    } catch (error: any) {
      throw new Error(`Error filtering staff: ${error.message}`);
    }
  }
}

export default new StaffService();

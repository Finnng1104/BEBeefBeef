import UserService from '../services/UserService';
import { Request, Response } from 'express';
import Role from '../models/RoleModel';
import mongoose from 'mongoose';

class UserController {
  async getAllUser(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, keyword = '', sort = '', order = 'asc' } = req.query;

      const result = await UserService.getAllUser({
        page: Number(page),
        limit: Number(limit),
        keyword: String(keyword),
        sort: String(sort),
        order: String(order),
      });

      res.status(200).json({
        status: 'OK',
        message: 'Fetched users successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
      res.status(500).json({
        status: 'ERROR',
        message: 'Failed to fetch users',
        error: error.message || 'Internal Server Error',
      });
    }
  }

  async getAllUserByUserRole(req: Request, res: Response): Promise<void> {
    try {
      const getAllUserByUserRole = await UserService.getAllUserByUserRole();
      res.status(200).json(getAllUserByUserRole);
    } catch (error: any) {
      console.error('Error fetching users by role:', error.message);
      res.status(500).json({
        status: 'ERROR',
        message: 'Failed to fetch users with role user',
        error: error.message || 'Internal Server Error',
      });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const getUserById = await UserService.getUserById(userId);
      res.status(200).json(getUserById);
    } catch (error: any) {
      console.error('Error fetching user by id:', error.message);
      res.status(500).json({
        status: 'ERROR',
        message: 'Failed to fetch user by id',
        error: error.message || 'Internal Server Error',
      });
    }
  }

  async blockUser(req: Request, res: Response) {
    try {
      const userId = req.params.userId;
      const blockUser = await UserService.blockUser(userId);
      res.status(200).json(blockUser);
    } catch (error: any) {
      console.error('Error blocking user:', error.message);
      res.status(500).json({
        status: 'ERROR',
        message: 'Failed to block user',
        error: error.message || 'Internal Server Error',
      });
    }
  }

  async filterUser(req: Request, res: Response) {
    try {
      const filterOptions = {
        keyword: req.query.keyword as string,
        nameSort: req.query.nameSort as string,
        emailSort: req.query.emailSort as string,
        gender: req.query.gender as string,
        status: req.query.status as string,
        role: req.query.role as string,
        isVerified: req.query.isVerified as string,
        startDate: req.query.birthdayFrom ? new Date(req.query.birthdayFrom as string) : undefined,
        endDate: req.query.birthdayTo ? new Date(req.query.birthdayTo as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 12,
      };

      const result = await UserService.filterUsers(filterOptions);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        status: 'ERROR',
        message: error.message || 'Error filtering users',
      });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const requester = req.user as { _id: string; roles?: mongoose.Types.ObjectId[] };
      const updateData = { ...req.body };

      if (!requester) {
        res.status(401).json({
          status: 'ERROR',
          message: 'Unauthorized: requester not found',
        });
        return;
      }

      // ===== Lấy role name của requester =====
      const roleDocs = await Role.find({ _id: { $in: requester.roles } });
      const roleNames = roleDocs.map((r) => r.name);

      // ===== Xác định vai trò cao nhất của requester =====
      type RoleName = 'user' | 'manager' | 'superadmin';
      let highestRole: RoleName = 'user';
      if (roleNames.includes('superadmin')) highestRole = 'superadmin';
      else if (roleNames.includes('manager')) highestRole = 'manager';

      // ===== Nếu là user thì chỉ được chỉnh sửa chính mình =====
      if (highestRole === 'user' && String(requester._id) !== String(userId)) {
        res.status(403).json({
          status: 'ERROR',
          message: 'Bạn không có quyền chỉnh sửa người dùng khác',
        });
        return;
      }

      // ===== Danh sách field được phép chỉnh sửa theo vai trò =====
      const editableFieldsByRole: Record<RoleName, string[]> = {
        user: ['username', 'phone', 'birthday', 'gender'],
        manager: ['username', 'phone', 'birthday', 'gender', 'status', 'roles', 'email'],
        superadmin: [
          'username',
          'phone',
          'birthday',
          'gender',
          'status',
          'roles',
          'email',
          'isEmailVerified',
        ],
      };

      const allowedFields = editableFieldsByRole[highestRole];

      // ===== Lọc bỏ những trường không được phép sửa =====
      Object.keys(updateData).forEach((key) => {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      });

      // ===== Gọi service cập nhật =====
      const result = await UserService.updateUserInfo(userId, updateData);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }

  async changeUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const { currentPassword, newPassword } = req.body;
      const result = await UserService.changeUserPassword(userId, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }
  async addUser(req: Request, res: Response): Promise<void> {
    try {
      const userData = req.body;
      const result = await UserService.addUser(userData);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }

  async checkUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;
      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          status: 'ERROR',
          message: 'Missing password to check',
        });
        return;
      }

      const result = await UserService.checkUserPassword(userId, password);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        status: 'ERROR',
        message: error.message || 'Failed to check user password',
      });
    }
  }
}

export default new UserController();

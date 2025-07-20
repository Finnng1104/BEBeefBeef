import { Request, Response, NextFunction } from 'express';
import Roles from '../models/RoleModel';
import User, { IUser } from '../models/UserModel';

export const canManageUserByRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = req.user as IUser & { id: string; roles: string[] };

    if (!currentUser) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    const currentRoles = await Roles.find({ _id: { $in: currentUser.roles } });
    const currentRoleNames = currentRoles.map((r) => r.name);
    const isSuperadmin = currentRoleNames.includes('superadmin');
    const isManager = currentRoleNames.includes('manager');

    const targetUserId = req.params.id || req.params.userId;
    const targetRoleIds: string[] = Array.isArray(req.body.roles) ? req.body.roles : [];
    const isEditing = !!targetUserId && targetRoleIds.length > 0;
    const isBlocking = !!targetUserId && targetRoleIds.length === 0;
    const isCreating = !targetUserId && targetRoleIds.length > 0;

    if (targetUserId === currentUser.id) {
      return res.status(403).json({ message: 'Không được thao tác với chính mình' });
    }

    // CASE 1: TẠO USER
    if (isCreating) {
      const targetRoles = await Roles.find({ _id: { $in: targetRoleIds } });
      const targetRoleNames = targetRoles.map((r) => r.name);

      if (targetRoleNames.includes('superadmin')) {
        const superadmin = await Roles.findOne({ name: 'superadmin' });
        const existing = await User.find({ roles: superadmin?._id });
        if (existing.length > 0) {
          return res.status(403).json({ message: 'Chỉ cho phép 1 superadmin duy nhất' });
        }
      }

      if (targetRoleNames.includes('user')) {
        return res.status(403).json({ message: 'Không được tạo user thông thường' });
      }

      if (isSuperadmin) return next();

      if (isManager) {
        const allowed = ['staff', 'cashier'];
        const allAllowed = targetRoleNames.every((r) => allowed.includes(r));
        if (!allAllowed) {
          return res.status(403).json({ message: 'Manager không được gán quyền vượt cấp' });
        }
        return next();
      }

      return res.status(403).json({ message: 'Bạn không có quyền tạo người dùng' });
    }

    // CASE 2: CHỈNH SỬA USER
    if (isEditing) {
      const targetUser = await User.findById(targetUserId).populate('roles');
      const targetCurrentRoles = (targetUser?.roles || []).map((r: any) => r.name);

      const newRoles = await Roles.find({ _id: { $in: targetRoleIds } });
      const newRoleNames = newRoles.map((r) => r.name);

      // ❌ Không được chỉnh sửa người có role là 'user' (dù là vai trò hiện tại hay gán mới)
      if (targetCurrentRoles.includes('user') || newRoleNames.includes('user')) {
        return res
          .status(403)
          .json({ message: 'Không được chỉnh sửa người dùng có vai trò là user' });
      }
      if (isSuperadmin && targetCurrentRoles.includes('superadmin')) {
        return res.status(403).json({ message: 'Không được chỉnh sửa người có quyền superadmin' });
      }

      if (isSuperadmin && newRoleNames.includes('superadmin') && targetUserId !== currentUser.id) {
        return res.status(403).json({
          message: 'Superadmin không được gán vai trò superadmin cho người khác',
        });
      }

      if (isSuperadmin) return next();

      if (isManager) {
        const allowed = ['staff', 'cashier'];
        if (targetCurrentRoles.includes('user') || newRoleNames.includes('user')) {
          return res
            .status(403)
            .json({ message: 'Manager không được chỉnh sửa người dùng thông thường' });
        }

        const canEditOld = targetCurrentRoles.every((r) => allowed.includes(r));
        const canEditNew = newRoleNames.every((r) => allowed.includes(r));
        if (!canEditOld || !canEditNew) {
          return res.status(403).json({ message: 'Manager không được chỉnh sửa vượt cấp' });
        }

        return next();
      }

      return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa người dùng' });
    }

    // CASE 3: BLOCK USER
    if (isBlocking) {
      const targetUser = await User.findById(targetUserId).populate('roles');
      const targetRoleNames = (targetUser?.roles || []).map((r: any) => r.name);

      if (targetUserId === currentUser.id) {
        return res.status(403).json({ message: 'Không được thao tác với chính mình' });
      }

      if (isSuperadmin) return next();

      if (isManager) {
        const allowed = ['staff', 'cashier', 'user'];
        const canBlock = targetRoleNames.every((r) => allowed.includes(r));
        if (!canBlock) {
          return res.status(403).json({
            message: 'Manager không được khóa người có quyền cao hơn và ngang cấp',
          });
        }
        return next();
      }

      return res.status(403).json({ message: 'Bạn không có quyền khoá người dùng' });
    }

    return res.status(400).json({ message: 'Không xác định được hành động (add/edit/block)' });
  } catch (err: any) {
    console.error('Lỗi trong canManageUserByRole:', err.message);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

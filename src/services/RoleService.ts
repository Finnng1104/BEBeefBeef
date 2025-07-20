import RoleModel from '../models/RoleModel';
import User from '../models/UserModel';
import Permission from '../models/PermissionModel';
import mongoose from 'mongoose';

class RoleService {
  async GetAllRole(): Promise<any> {
    try {
      const roles = await RoleModel.find().populate('permissions').populate({
        path: 'users',
        model: User,
      });

      return roles.length > 0 ? roles : null;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async AddRole(name: string, description: string, permission: string[]): Promise<any> {
    try {
      const existingRole = await RoleModel.findOne({ name });
      if (existingRole) {
        throw new Error('Role already exists!');
      }

      // Chuyển các permission id từ chuỗi thành ObjectId hợp lệ
      const permissionIds = permission.map((id) => new mongoose.Types.ObjectId(id));
      console.log('permiss', permissionIds);

      // Kiểm tra xem các permission đã tồn tại chưa
      const permissions = await Permission.find({
        _id: { $in: permissionIds },
      });
      if (permissions.length !== permission.length) {
        throw new Error('Invalid permission id');
      }

      // Tạo mới role với mảng permissionIds thay vì chuỗi
      const newRole = new RoleModel({
        name,
        description,
        permissions: permissionIds,
      });
      await newRole.save();

      return newRole;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async GetRoleById(id: string): Promise<any> {
    try {
      const role = await RoleModel.findById(id)
        .populate({ path: 'permissions', model: Permission })
        .populate({
          path: 'users',
          model: User,
        });

      return role;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async UpdateRole(id: string, data: any): Promise<any> {
    try {
      // Nếu có thay đổi quyền, kiểm tra lại
      if (data.permission && Array.isArray(data.permission)) {
        const permissions = await Permission.find({
          _id: { $in: data.permission },
        });
        if (permissions.length !== data.permission.length) {
          throw new Error('Some permissions do not exist!');
        }
      }

      // Cập nhật role với các thay đổi
      const updatedRole = await RoleModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });

      return updatedRole;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async DeleteRole(id: string): Promise<boolean> {
    try {
      const deletedRole = await RoleModel.findByIdAndDelete(id);
      return !!deletedRole;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}

export default new RoleService();

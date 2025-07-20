import PermissionsModel from '../models/PermissionModel';

class PermissionService {
  async GetALlPermission(): Promise<any> {
    try {
      const permissions = await PermissionsModel.find();
      return permissions.length > 0 ? permissions : null;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  async AddPermission(name: string, description: string): Promise<any> {
    try {
      const existingPermission = await PermissionsModel.findOne({ name });
      if (existingPermission) {
        throw new Error('Permission already exists!');
      }
      const newPermission = new PermissionsModel({ name, description });
      await newPermission.save();
      return newPermission;
    } catch (error) {}
  }
  async GetPermissionById(id: string): Promise<any> {
    try {
      const permission = await PermissionsModel.findById(id);
      return permission;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  async UpdatePermission(id: string, data: any): Promise<any> {
    try {
      const permission = await PermissionsModel.findById(id);
      if (!permission) {
        throw new Error('Permission not found!');
      }
      if (data.name) {
        permission.name = data.name;
      }
      if (data.description) {
        permission.description = data.description;
      }
      await permission.save();
      return permission;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  async DeletePermission(id: string): Promise<any> {
    try {
      const permission = await PermissionsModel.findByIdAndDelete(id);
      return permission;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}
export default new PermissionService();

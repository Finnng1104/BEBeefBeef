import mongoose from 'mongoose';

interface IPermission extends mongoose.Document {
  name: string;
  description: string | null;
}

const PermissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Roles' }],
});

const PermissionsModel = mongoose.model<IPermission>('Permissions', PermissionSchema); // Sửa tên mô hình thành 'Permissions'
export default PermissionsModel;

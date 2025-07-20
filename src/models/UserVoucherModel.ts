import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUserVoucher extends Document {
  user_id: Types.ObjectId;
  voucher_id: Types.ObjectId;
  used_at?: Date;
  status: 'saved' | 'used' | 'expired';
  createdAt?: Date;
  updatedAt?: Date;
}
const UserVoucherSchema = new Schema<IUserVoucher>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    used_at: { type: Date, default: null },
    status: { type: String, enum: ['saved', 'used', 'expired'], required: true },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IUserVoucher>('UserVoucher', UserVoucherSchema);

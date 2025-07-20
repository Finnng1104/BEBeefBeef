import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILoyaltyMilestoneDefinition extends Document {
  milestone_amount: number; // Số tiền mốc (ví dụ: 1000000)
  milestone_name: string; // Tên mốc (ví dụ: "Mốc 1 triệu")
  description?: string; // Mô tả (ví dụ: "Quà tặng chi tiêu 1 triệu")
  voucher_id: Types.ObjectId; // Reference đến voucher đã tạo (type: 'gift')
  is_active: boolean; // Có đang hoạt động không
  created_at?: Date;
  updated_at?: Date;
}

const LoyaltyMilestoneDefinitionSchema = new Schema<ILoyaltyMilestoneDefinition>(
  {
    milestone_amount: { type: Number, required: true, unique: true },
    milestone_name: { type: String, required: true },
    description: { type: String, required: false },
    voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export default mongoose.model<ILoyaltyMilestoneDefinition>(
  'LoyaltyMilestoneDefinition',
  LoyaltyMilestoneDefinitionSchema,
);

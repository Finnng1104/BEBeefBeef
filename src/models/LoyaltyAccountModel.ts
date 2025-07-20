import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILoyaltyAccount extends Document {
  user_id: Types.ObjectId;
  total_points: number;
  total_spent: number; // Tổng tiền đã chi để nâng hạng
  current_tier: Types.ObjectId; // Tham chiếu tới LoyaltyTier
  yearly_spending: { [year: string]: number };
  updated_at?: Date;
}

const LoyaltyAccountSchema = new Schema<ILoyaltyAccount>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    total_points: { type: Number, required: true, default: 0 },
    total_spent: { type: Number, required: true, default: 0 },
    current_tier: { type: Schema.Types.ObjectId, ref: 'LoyaltyTier', required: true },
    yearly_spending: { type: Object, required: true, default: {} },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
  },
);

export default mongoose.model<ILoyaltyAccount>('LoyaltyAccount', LoyaltyAccountSchema);

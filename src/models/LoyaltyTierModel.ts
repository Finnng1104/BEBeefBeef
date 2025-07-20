import mongoose, { Document, Schema } from 'mongoose';

export interface ILoyaltyTier extends Document {
  tier_name: 'new' | 'bronze' | 'silver' | 'gold' | 'diamond';
  min_spent: number; // Tổng tiền đã chi tối thiểu để đạt tier này
  discount: number;
  benefits: string;
  is_active: boolean;
}

const LoyaltyTierSchema = new Schema<ILoyaltyTier>({
  tier_name: {
    type: String,
    enum: ['new', 'bronze', 'silver', 'gold', 'diamond'],
    required: true,
    unique: true,
  },
  min_spent: { type: Number, required: true },
  discount: { type: Number, required: true, default: 0 },
  benefits: { type: String, required: false },
  is_active: { type: Boolean, required: true, default: true },
});

export default mongoose.model<ILoyaltyTier>('LoyaltyTier', LoyaltyTierSchema);

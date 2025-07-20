import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILoyaltyMilestone extends Document {
  user_id: Types.ObjectId;
  year: string;
  milestone_amount: number;
  achieved_at: Date;
  voucher_created: boolean;
  voucher_id?: Types.ObjectId;
}

const LoyaltyMilestoneSchema = new Schema<ILoyaltyMilestone>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: String, required: true },
  milestone_amount: { type: Number, required: true },
  achieved_at: { type: Date, required: true },
  voucher_created: { type: Boolean, default: false },
  voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', required: false },
});

export default mongoose.model<ILoyaltyMilestone>('LoyaltyMilestone', LoyaltyMilestoneSchema);

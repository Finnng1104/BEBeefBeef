import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILoyaltyTransaction extends Document {
  account_id: Types.ObjectId;
  order_id: Types.ObjectId;
  points: number;
  amount: number; // Tổng tiền chi tiêu của giao dịch này
  type: 'earn' | 'redeem' | 'adjust';
  note?: string;
  created_at?: Date;
}

const LoyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    account_id: { type: Schema.Types.ObjectId, ref: 'LoyaltyAccount', required: true },
    order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    points: { type: Number, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['earn', 'redeem', 'adjust'], required: true },
    note: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

export default mongoose.model<ILoyaltyTransaction>('LoyaltyTransaction', LoyaltyTransactionSchema);

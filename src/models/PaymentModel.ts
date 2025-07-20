import { Schema, model, Types } from 'mongoose';

export interface IPayment extends Document {
  orderId: Types.ObjectId;
  reservationId: Types.ObjectId;
  payment_method: 'CASH' | 'BANKING' | 'VNPAY' | 'MOMO' | 'MOMO_ATM' | 'CREDIT_CARD';
  payment_status: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number;
  transaction_code?: string;
  payment_date?: Date;
  created_at: Date;
  updated_at: Date;
  failure_reason?: string;
  bankingInfo?: {
    bank_name: string;
    account_name: string;
    account_number: string;
    qr_code?: string;
    transfer_note?: string;
  };
  notes?: string;
  confirmed_by?: Types.ObjectId;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
      index: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: false,
    },
    payment_method: {
      type: String,
      enum: ['CASH', 'BANKING', 'VNPAY', 'MOMO', 'MOMO_ATM', 'CREDIT_CARD'],
      required: true,
    },
    payment_status: {
      type: String,
      enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'UNPAID',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transaction_code: {
      type: String,
      default: null,
    },
    payment_date: {
      type: Date,
      default: null,
    },
    bankingInfo: {
      bank_name: { type: String, required: false },
      account_name: { type: String, required: false },
      account_number: { type: String, required: false },
      qr_code: { type: String, required: false },
      transfer_note: { type: String, required: false },
    },
    notes: {
      type: String,
      default: null,
    },
    confirmed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    failure_reason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export default model<IPayment>('Payment', PaymentSchema);

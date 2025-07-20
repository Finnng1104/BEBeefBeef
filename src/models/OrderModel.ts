import { Schema, model, Document, Types, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IAddress } from './AddressModel';
import { IOrderDetail } from './OrderDetailModel';

export interface IOrderPopulated extends Omit<IOrder, 'address_id'> {
  address_id: IAddress | null | undefined;
  order_items: IOrderDetail[];
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  user_id: {
    _id: Types.ObjectId;
    email: string;
    name?: string;
  };
  cashier_order_id?: Types.ObjectId | null;
  address_id: Types.ObjectId | null | undefined;
  payment_method: 'CASH' | 'BANKING' | 'VNPAY' | 'MOMO' | 'MOMO_ATM' | 'CREDIT_CARD';
  delivery_type: 'DELIVERY' | 'PICKUP';

  status:
    | 'ORDER_PLACED'
    | 'ORDER_CONFIRMED'
    | 'PENDING_PICKUP'
    | 'PICKED_UP'
    | 'IN_TRANSIT'
    | 'DELIVERED'
    | 'DELIVERY_FAILED'
    | 'RETURN_REQUESTED'
    | 'RETURN_APPROVED'
    | 'RETURN_REJECTED'
    | 'RETURNED'
    | 'CANCELLED';
  shipping_fee: number;
  vat_amount: number;
  items_price: number;
  total_price?: number;
  total_quantity: number;
  discount_amount?: number;
  payment_status: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';
  paid_at?: Date | null;
  note?: string;
  receiver?: string | null;
  receiver_phone?: string | null;
  cancelled_reason?: string | null;
  cancelled_at?: Date | null;
  returned_at?: Date | null;
  delivered_at?: Date | null;
  order_type: 'DINE_IN' | 'ONLINE';
  delivery_time_type: 'ASAP' | 'SCHEDULED';
  scheduled_time?: Date | null;
  voucher_id?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashier_order_id: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    address_id: { type: Schema.Types.ObjectId, ref: 'Address', required: false },
    payment_method: {
      type: String,
      enum: ['CASH', 'BANKING', 'VNPAY', 'MOMO', 'MOMO_ATM', 'CREDIT_CARD'],
      required: true,
    },
    delivery_type: {
      type: String,
      enum: ['DELIVERY', 'PICKUP'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'PENDING_PICKUP',
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'DELIVERY_FAILED',
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_REJECTED',
        'RETURNED',
        'CANCELLED',
      ],
      default: 'ORDER_PLACED',
    },
    shipping_fee: { type: Number, required: true, default: 0 },
    vat_amount: { type: Number, required: true, default: 0 },
    items_price: { type: Number, required: true, default: 0 },
    total_price: { type: Number, default: 0 },
    total_quantity: { type: Number, required: true, default: 0 },
    discount_amount: { type: Number, default: 0 },
    payment_status: {
      type: String,
      enum: ['UNPAID', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'UNPAID',
    },
    paid_at: { type: Date, default: null },
    note: { type: String, default: null },
    receiver: { type: String, default: null },
    receiver_phone: { type: String, default: null },
    cancelled_reason: { type: String, default: null },
    cancelled_at: { type: Date, default: null },
    returned_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
    order_type: { type: String, enum: ['DINE_IN', 'ONLINE'], required: true },
    delivery_time_type: {
      type: String,
      enum: ['ASAP', 'SCHEDULED'],
      required: true,
    },
    scheduled_time: {
      type: Date,
      default: null,
    },
    voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', default: null },
  },
  { timestamps: true },
);

OrderSchema.plugin(mongoosePaginate);
export type OrderDocument = PaginateModel<IOrder>;
export const Order = model<IOrder, OrderDocument>('Order', OrderSchema);

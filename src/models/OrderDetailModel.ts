import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderDetail extends Document {
  order_id: Types.ObjectId;
  dish_id: Types.ObjectId;
  dish_name: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  note?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderDetailSchema = new Schema<IOrderDetail>(
  {
    order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    dish_id: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
    dish_name: { type: String, required: true },
    unit_price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    total_amount: { type: Number, required: true },
    note: { type: String, default: null },
  },
  { timestamps: true },
);

export const OrderDetail = model<IOrderDetail>('OrderDetail', OrderDetailSchema);

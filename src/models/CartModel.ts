import mongoose, { Document, Types } from 'mongoose';
export interface ICart extends Document {
  userId: Types.ObjectId;
  items: {
    dishId: Types.ObjectId;
    quantity: number;
    price: number;
    note: null;
  }[];
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
const cartSchema = new mongoose.Schema<ICart>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        dishId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Dish',
          required: true,
        },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

const Cart: mongoose.Model<ICart> = mongoose.model<ICart>('Cart', cartSchema);
export default Cart;

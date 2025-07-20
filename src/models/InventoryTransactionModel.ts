import mongoose from 'mongoose';

export interface IInventoryTransaction extends Document {
  transaction_type: 'import' | 'export' | 'adjustment';
  quantity: number;
  transaction_date: Date;
  notes?: string;
  ingredient_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  adjustment_batch_id?: mongoose.Types.ObjectId;
}

const inventoryTransactionSchema = new mongoose.Schema(
  {
    transaction_type: {
      type: String,
      enum: ['import', 'export', 'adjustment'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    transaction_date: { type: Date, required: true },
    notes: { type: String },
    ingredient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    adjustment_batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryAdjustmentBatch',
      default: null,
    },
  },
  { timestamps: true },
);

inventoryTransactionSchema.index({ ingredient_id: 1, transaction_date: 1 });

export const InventoryTransaction = mongoose.model<IInventoryTransaction>(
  'InventoryTransaction',
  inventoryTransactionSchema,
);

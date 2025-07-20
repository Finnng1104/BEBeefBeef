import mongoose from 'mongoose';

export interface IInventoryDailyBatch extends mongoose.Document {
  batch_date: Date;
  type: 'import' | 'audit';
  user_id: mongoose.Types.ObjectId;

  items: {
    ingredient_id: mongoose.Types.ObjectId;
    initial_quantity?: number; // chỉ dùng khi audit
    quantity: number; // nhập nếu import, thực tế nếu audit
    notes?: string;
  }[];
}

const inventoryDailyBatchSchema = new mongoose.Schema(
  {
    batch_date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['import', 'export', 'audit', 'adjustment'],
      required: true,
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    items: [
      {
        ingredient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
        initial_quantity: { type: Number, default: 0 }, // chỉ dùng khi audit
        quantity: { type: Number, required: true }, // đại diện cho imported_quantity hoặc audited_quantity tuỳ vào type
        notes: { type: String },
      },
    ],
  },
  { timestamps: true },
);

inventoryDailyBatchSchema.index({ batch_date: 1, type: 1 });

export const InventoryDailyBatch = mongoose.model<IInventoryDailyBatch>(
  'InventoryDailyBatch',
  inventoryDailyBatchSchema,
);

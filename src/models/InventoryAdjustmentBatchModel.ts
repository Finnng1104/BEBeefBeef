import mongoose from 'mongoose';

export interface IInventoryAdjustmentBatch extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  adjustment_date: Date;
  user_id: mongoose.Types.ObjectId;
  daily_batch_id: mongoose.Types.ObjectId;

  items: {
    ingredient_id: mongoose.Types.ObjectId;
    estimated_quantity: number;
    actual_quantity: number;
    difference: number;
    reason: string;
    notes?: string;
  }[];
}

const inventoryAdjustmentBatchSchema = new mongoose.Schema(
  {
    adjustment_date: { type: Date, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    daily_batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryDailyBatch',
      required: true,
    },

    items: [
      {
        ingredient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
        estimated_quantity: { type: Number, required: true }, // hệ thống tính ra
        actual_quantity: { type: Number, required: true }, // thực tế kiểm kê
        difference: { type: Number, required: true }, // computed
        reason: { type: String, required: true },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true },
);

inventoryAdjustmentBatchSchema.pre('save', function (next) {
  this.items.forEach((item) => {
    item.difference = item.actual_quantity - item.estimated_quantity;
  });
  next();
});

inventoryAdjustmentBatchSchema.index({ adjustment_date: 1, user_id: 1 });

export const InventoryAdjustmentBatch = mongoose.model<IInventoryAdjustmentBatch>(
  'InventoryAdjustmentBatch',
  inventoryAdjustmentBatchSchema,
);

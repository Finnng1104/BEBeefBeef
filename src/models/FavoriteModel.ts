import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

favoriteSchema.index({ userId: 1, dishId: 1 }, { unique: true });

export const Favorite = mongoose.model('Favorite', favoriteSchema);

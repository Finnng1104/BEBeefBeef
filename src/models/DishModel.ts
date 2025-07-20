import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IDish extends mongoose.Document {
  name: string;
  slug: string;
  price: number;
  discount_price?: number;
  description: string;
  shortDescription?: string;
  ingredients?: string;
  status: 'hidden' | 'available' | 'soldout';
  views: number;
  ordered_count: number;
  average_rating: number;
  rating_count: number;
  favorites_count: number;
  rating: number;
  categories: mongoose.Schema.Types.ObjectId[];
  countInStock: number;
  isDishNew: boolean;
  newUntil?: Date;
  isRecommend?: boolean;
  recommendUntil?: Date;
  totalSoldQuantity?: number;
  discountUntil?: Date;
  alcohol_type?: string;
  origin?: string;
  alcohol_content?: number;
  volume?: number;
  images: string[];
  isDeleted: boolean;
  deletedAt: Date;
}

const dishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    discount_price: { type: Number, min: 0 },
    description: { type: String, required: true },
    shortDescription: { type: String },
    ingredients: { type: String },
    status: {
      type: String,
      enum: ['hidden', 'available', 'soldout'],
      default: 'available',
    },
    views: { type: Number, default: 0 },
    ordered_count: { type: Number, default: 0 },
    rating_count: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },
    favorites_count: { type: Number, default: 0 },

    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'categories',
        required: true,
      },
    ],
    countInStock: { type: Number, default: 0, min: 0 },
    isDishNew: { type: Boolean, default: false },
    newUntil: { type: Date },
    isRecommend: { type: Boolean, default: false },
    recommendUntil: { type: Date },
    totalSoldQuantity: { type: Number, default: 0 },
    discountUntil: { type: Date },
    alcohol_type: { type: String },
    origin: { type: String },
    alcohol_content: { type: Number, min: 0 },
    volume: { type: Number, min: 0 }, // Thể tích (ml)
    images: [{ type: String, required: true }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

dishSchema.index({ name: 'text' });

dishSchema.plugin(mongoosePaginate);
export type DishDocument = mongoose.PaginateModel<IDish>;

export const Dish = mongoose.model<IDish, DishDocument>('Dish', dishSchema);

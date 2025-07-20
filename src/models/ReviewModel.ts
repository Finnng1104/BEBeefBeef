import mongoose, { Schema, Document, PaginateModel, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IReview extends Document {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  isHidden: boolean;
  date: Date;
}

const ReviewSchema: Schema<IReview> = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

ReviewSchema.plugin(mongoosePaginate);

ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model<IReview, PaginateModel<IReview>>('Review', ReviewSchema);

export default Review;

import { Schema, Types } from 'mongoose';

interface IImage {
  name: string;
  width?: number;
  height?: number;
  url: string;
  default_image: boolean;
  image_type: 'Dish' | 'Post';
  dish_id?: Types.ObjectId;
  post_id?: Types.ObjectId;
}

const imageSchema = new Schema<IImage>({
  name: { type: String, required: true },
  width: Number,
  height: Number,
  url: { type: String, required: true },
  default_image: { type: Boolean, default: false },
  image_type: { type: String, enum: ['Dish', 'Post'], required: true },
  dish_id: { type: Schema.Types.ObjectId, ref: 'Dish' },
  post_id: { type: Schema.Types.ObjectId, ref: 'Post' },
});

imageSchema.index({ dish: 1 });

// const Image = model<IImage>('Image', imageSchema);

import mongoose from 'mongoose';

export interface IPost extends mongoose.Document {
  title: string;
  slug: string;
  desc: string;
  content: string;
  images: string[];
  status: 'draft' | 'published';
  categories_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  views: number;
  likes: number;
  likedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  scheduledAt?: Date | null;
}

const postSchema = new mongoose.Schema<IPost>({
  title: { type: String, required: true },
  slug: { type: String, required: true },
  desc: { type: String, required: true },
  content: { type: String, required: true },
  images: [{ type: String }],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  categories_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'categories',
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  likedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  tags: [{ type: String }],
});

export const Post = mongoose.model<IPost>('Post', postSchema);

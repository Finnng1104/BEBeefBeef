import mongoose, { Document, Schema, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ICommentPost extends Document {
  content: string;
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentPostSchema = new Schema<ICommentPost>(
  {
    content: { type: String, required: true },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

// Thêm index để tối ưu truy vấn
commentPostSchema.index({ postId: 1, createdAt: -1 });

// Thêm plugin pagination
commentPostSchema.plugin(mongoosePaginate);

const CommentPost = mongoose.model<ICommentPost, PaginateModel<ICommentPost>>(
  'CommentPost',
  commentPostSchema,
);

export default CommentPost;

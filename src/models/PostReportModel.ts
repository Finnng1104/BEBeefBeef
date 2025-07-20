import mongoose from 'mongoose';

export interface IPostReport extends mongoose.Document {
  post_id: mongoose.Types.ObjectId;
  reporter_id: mongoose.Types.ObjectId;
  reason: string;
  createdAt: Date;
}

const postReportSchema = new mongoose.Schema<IPostReport>({
  post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  reporter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const PostReport = mongoose.model<IPostReport>('PostReport', postReportSchema);

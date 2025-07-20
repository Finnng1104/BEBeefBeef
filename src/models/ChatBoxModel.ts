import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  user_id: mongoose.Types.ObjectId;
  cashier_user_id?: mongoose.Types.ObjectId;
  status: 'open' | 'pending' | 'closed';
  created_at: Date;
  updated_at: Date;
  initiated_by: 'user' | 'cashier' | 'bot';
  closed_at?: Date;
  first_message_at?: Date;
  last_message_at?: Date;
}

const ChatSchema: Schema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cashier_user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['open', 'pending', 'closed'], default: 'pending' },
    initiated_by: { type: String, enum: ['user', 'cashier', 'bot'], default: 'user' },
    closed_at: { type: Date },
    first_message_at: { type: Date },
    last_message_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

// Index status for filter
ChatSchema.index({ status: 1 });
ChatSchema.index({ user_id: 1, status: 1 });

export default mongoose.model<IChat>('Chat', ChatSchema);

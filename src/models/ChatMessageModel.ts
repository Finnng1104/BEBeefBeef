import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  chat_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  receiver_id: mongoose.Types.ObjectId;
  content: string;
  sent_at: Date;
  is_bot_reply: boolean;
  message_type: 'text' | 'image' | 'file';
  read_at?: Date;
  reply_to?: mongoose.Types.ObjectId | null;
  sender_role: 'user' | 'cashier' | 'bot' | 'admin';
  is_deleted?: boolean;
  edited?: boolean;
  edited_at?: Date;
  attachments: string[];
  status: 'sending' | 'sent' | 'failed';
  reactions: {
    user_id: mongoose.Types.ObjectId;
    emoji: string;
  }[];
  is_system?: boolean;
}

const ChatMessageSchema: Schema = new Schema({
  chat_id: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  sent_at: { type: Date, default: Date.now },
  is_bot_reply: { type: Boolean, default: false },
  message_type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  read_at: { type: Date },
  reply_to: { type: Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  sender_role: { type: String, enum: ['user', 'cashier', 'bot', 'admin'], required: true },
  is_deleted: { type: Boolean, default: false },
  edited: { type: Boolean, default: false },
  edited_at: { type: Date },
  is_system: { type: Boolean, default: false },
  attachments: { type: [String], default: [] },
  status: { type: String, enum: ['sending', 'sent', 'failed'], default: 'sent' },
  reactions: [
    {
      user_id: { type: Schema.Types.ObjectId, ref: 'User' },
      emoji: String,
    },
  ],
});

// Support full text search if needed
ChatMessageSchema.index({ content: 'text' });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

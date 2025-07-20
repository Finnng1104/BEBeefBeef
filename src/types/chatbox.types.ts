import { Types } from 'mongoose';

// Thông tin phiên chat (dành cho user)
export interface ChatSession {
  _id: Types.ObjectId | string;
  user_id: Types.ObjectId | string;
  cashier_user_id?: Types.ObjectId | string;
  status: 'open' | 'pending' | 'closed';
  created_at: Date;
  updated_at: Date;
}

// Gửi tin nhắn từ user hoặc cashier
export interface SendMessageDto {
  chatId: string;
  senderId: string;
  content: string;
  is_bot_reply?: boolean;
  message_type?: 'text' | 'image' | 'file';
  role: string[] | string;
  replyTo?: string;
  receiverId?: string;
  sender_role?: 'user' | 'cashier';
}

// Tin nhắn trả về
export interface ChatMessage {
  _id: Types.ObjectId | string;
  chat_id: Types.ObjectId | string;
  sender_id: Types.ObjectId | string;
  content: string;
  sent_at: Date;
  is_bot_reply: boolean;
  message_type: 'text' | 'image' | 'file';
  read_at?: Date;
  replyTo?: string;
  receiver_id: Types.ObjectId | string;
  sender_role: 'user' | 'cashier';
  reactions?: { emoji: string; userId?: string }[];
}

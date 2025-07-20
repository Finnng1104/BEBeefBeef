import { Server, Socket } from 'socket.io';
import ChatService from '../services/ChatService';
import ChatSessionManager from './ChatSessionManager';
import UserModel from '../models/UserModel';
import mongoose from 'mongoose'; // cần để dùng `isValidObjectId`
import ChatMessageModel from '../models/ChatMessageModel';

declare global {
  // eslint-disable-next-line no-var
  var io: Server | undefined;
}

interface JoinPayload {
  userId: string;
  chatId: string;
  roles: 'user' | 'cashier';
}

const userSocketMap = new Map<string, string[]>();

export const initSocket = (io: Server) => {
  globalThis.io = io;
  io.on('connection', (socket: Socket) => {
    console.log('Socket connected:', socket.id);

    // JOIN ROOM
    socket.on('join', async ({ userId, chatId, roles }: JoinPayload) => {
      socket.join(chatId);

      const existing = userSocketMap.get(userId) || [];
      userSocketMap.set(userId, [...new Set([...existing, socket.id])]);

      // set trạng thái online cho user
      if (existing.length === 0 && mongoose.Types.ObjectId.isValid(userId)) {
        await UserModel.findByIdAndUpdate(userId, { isOnline: true }).exec();
      }
      if (roles === 'user') {
        const session = ChatSessionManager.getSessionByUser(userId);
        if (!session) {
          const chat = await ChatService.getOrCreateChat(userId);
          const cashierId = chat.cashier_user_id?.toString() || 'system-bot';
          ChatSessionManager.setSession(userId, cashierId, chat._id.toString());
        }
      }

      socket.emit('joinComplete', { chatId });
      console.log(`${roles} joined: user ${userId}, chat ${chatId}`);
    });

    // SEND MESSAGE
    socket.on('sendMessage', async ({ chatId, senderId, content, role, replyTo }) => {
      try {
        const senderRole = typeof role === 'string' ? role : 'user';

        const message = await ChatService.sendMessage({
          chatId,
          senderId,
          content,
          role: senderRole,
          replyTo,
        });

        const receiverId = message.receiver_id.toString();
        const unreadCount = await ChatService.getUnreadMessageCount(
          receiverId,
          message.sender_role === 'user' ? 'cashier' : 'user',
        );

        io.to(chatId).emit('unreadCount', { chatId, count: unreadCount });
        io.to(chatId).emit('newMessageAlert', { chatId, message });
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    });

    // MARK AS READ
    socket.on('markAsRead', async ({ chatId, userId, messageId }) => {
      try {
        await ChatService.markMessageAsRead(chatId, messageId);

        io.to(chatId).emit('messageRead', {
          messageId,
          userId,
          readAt: new Date(),
        });

        console.log(`Message ${messageId} marked as read by ${userId}`);
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    });

    // LEAVE ROOM
    socket.on('leave', ({ chatId }) => {
      socket.leave(chatId);
      console.log(`🚪 Socket ${socket.id} left room ${chatId}`);
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
      console.log('Socket disconnected:', socket.id);

      for (const [userId, sockets] of userSocketMap.entries()) {
        const filtered = sockets.filter((id) => id !== socket.id);
        if (filtered.length > 0) {
          userSocketMap.set(userId, filtered);
        } else {
          userSocketMap.delete(userId);
          ChatSessionManager.removeSession(userId);

          if (mongoose.Types.ObjectId.isValid(userId)) {
            await UserModel.findByIdAndUpdate(userId, { isOnline: false }).exec();
          }
        }
      }
    });
    // MANUAL DISCONNECT
    // Dùng khi cần ngắt kết nối thủ công từ phía client
    // Ví dụ: khi người dùng đăng xuất hoặc đóng ứng dụng
    socket.on('manualDisconnect', async ({ userId }) => {
      userSocketMap.delete(userId);
      ChatSessionManager.removeSession(userId);
      if (mongoose.Types.ObjectId.isValid(userId)) {
        await UserModel.findByIdAndUpdate(userId, { isOnline: false });
      }
      socket.disconnect(); // Đảm bảo socket tự đóng luôn
    });

    // show emoji picker
    socket.on('reactMessage', async ({ messageId, emoji, userId, chatId }) => {
      try {
        const msg = await ChatMessageModel.findById(messageId);
        if (!msg) return;

        await ChatMessageModel.updateOne(
          { _id: messageId },
          { $pull: { reactions: { user_id: userId } } },
        );
        await ChatMessageModel.updateOne(
          { _id: messageId },
          { $push: { reactions: { user_id: userId, emoji } } },
        );

        const updatedMsg = await ChatMessageModel.findById(messageId).lean();
        if (updatedMsg) {
          updatedMsg._id = String(updatedMsg._id);
        }

        io.to(chatId).emit('messageReactionUpdated', {
          messageId,
          reactions: updatedMsg?.reactions || [],
        });
      } catch (err) {
        console.error('❌ Error reacting to message:', err);
      }
    });
  });
};
export const getUserSocketIds = (userId: string): string[] => {
  return userSocketMap.get(userId) || [];
};

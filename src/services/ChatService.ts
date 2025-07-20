import ChatMessageModel from '../models/ChatMessageModel';
import mongoose from 'mongoose';
import { ChatSession, SendMessageDto, ChatMessage } from '../types/chatbox.types';
import ChatBoxModel from '../models/ChatBoxModel';
import UserModel from '../models/UserModel';
import { logger } from '../utils/logger';
import { sendPushNotification } from '../utils/fcmUtils';
import FCMTokenModel from '../models/FCMTokenModel';
import { getUserSocketIds } from '../socket/socket';
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
class ChatService {
  async getOrCreateChat(userId: string): Promise<ChatSession> {
    let chat = await ChatBoxModel.findOne({
      user_id: userId,
      status: { $in: ['pending', 'open'] },
    });

    if (!chat) {
      const users = await UserModel.find().populate({
        path: 'roles',
        select: 'name',
      });
      const defaultCashier = users.find(
        (user) =>
          user.roles?.some((role: any) => role.name === 'cashier') &&
          user.id.toString() !== userId.toString(),
      );

      if (!defaultCashier) {
        console.warn('[⚠️ Không tìm thấy cashier]');
        throw new Error('NO_CASHIER_AVAILABLE');
      }
      console.log('[✅ Tạo phiên mới + gán cashier]:', defaultCashier.username);
      chat = await ChatBoxModel.create({
        user_id: userId,
        cashier_user_id: defaultCashier._id,
        status: 'pending',
      });
    }

    return {
      ...chat.toObject(),
      _id: (chat._id as mongoose.Types.ObjectId | string).toString(),
    };
  }

  async getMessagesWithPagination(
    chatId: string,
    before?: string,
    limit: number = 20,
  ): Promise<ChatMessage[]> {
    const filter: any = { chat_id: chatId };

    if (before && mongoose.Types.ObjectId.isValid(before)) {
      filter._id = { $lt: new mongoose.Types.ObjectId(before) }; // load tin cũ hơn
    }

    const messages = await ChatMessageModel.find(filter)
      .populate('reply_to', 'content sender_id')
      .sort({ _id: -1 }) // mới nhất trước
      .limit(limit)
      .lean();

    // Trả về theo thứ tự đúng thời gian (cũ → mới)
    return messages.reverse().map((msg: any) => ({
      ...msg,
      _id: msg._id.toString(),
      chat_id: msg.chat_id?.toString(),
      sender_id: msg.sender_id?.toString(),
      receiver_id: msg.receiver_id?.toString(),
      reply_to: msg.reply_to
        ? {
            ...msg.reply_to,
            _id: msg.reply_to._id?.toString(),
            sender_id: msg.reply_to.sender_id?.toString(),
          }
        : null,
    })) as ChatMessage[];
  }

  async getAvailableCashier(): Promise<string | null> {
    const cashier = await UserModel.findOne({ roles: 'cashier' });
    return cashier?._id?.toString() || null;
  }

  async listChatsOfCashierAdvanced({
    cashierId,
    page = 1,
    limit = 10,
    status,
  }: {
    cashierId: string;
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const query: any = { cashier_user_id: cashierId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const chats = await ChatBoxModel.find(query)
      .populate('user_id', 'username avatar phone gender isOnline')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const enrichedChats = await Promise.all(
      chats.map(async (chat) => {
        const lastMsg = await ChatMessageModel.findOne({ chat_id: chat._id })
          .sort({ sent_at: -1 })
          .lean();

        return {
          ...chat,
          lastMessage: lastMsg?.content || '',
          lastMessageTime: lastMsg?.sent_at || chat.updated_at,
        };
      }),
    );

    return enrichedChats;
  }

  async markMessageAsRead(chatId: string, messageId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      throw new Error('INVALID_CHAT_ID');
    }
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new Error('INVALID_MESSAGE_ID');
    }
    await ChatMessageModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(messageId), // ép kiểu rõ ràng ✅
        chat_id: new mongoose.Types.ObjectId(chatId),
        read_at: null,
      },
      {
        $set: { read_at: new Date() },
      },
    );
  }

  async assignCashierToChat(chatId: string, cashierId: string) {
    const chat = await ChatBoxModel.findById(chatId);

    if (!chat) {
      throw new Error('CHAT_NOT_FOUND');
    }

    if (chat.cashier_user_id) {
      throw new Error('ALREADY_ASSIGNED');
    }

    chat.cashier_user_id = new mongoose.Types.ObjectId(cashierId);
    await chat.save();

    return {
      ...chat.toObject(),
      _id: (chat._id as mongoose.Types.ObjectId | string).toString(),
    };
  }

  async getOrCreateChatWithUser(userId: string, cashierId: string) {
    let chat = await ChatBoxModel.findOne({
      user_id: userId,
      status: { $in: ['pending', 'open'] },
    });

    if (!chat) {
      chat = await ChatBoxModel.create({
        user_id: userId,
        cashier_user_id: cashierId,
        status: 'pending',
      });
    } else if (!chat.cashier_user_id) {
      await ChatBoxModel.updateOne({ _id: chat._id }, { cashier_user_id: cashierId });
      // Lấy lại bản ghi sau khi cập nhật
      chat = await ChatBoxModel.findById(chat._id);
    }

    if (!chat) {
      throw new Error('CHAT_NOT_FOUND');
    }

    await chat.populate('user_id', 'username');
    return {
      ...chat.toObject(),
      _id: (chat._id as mongoose.Types.ObjectId | string).toString(),
    };
  }

  async getUnreadMessageCount(userId: string, role: 'user' | 'cashier'): Promise<number> {
    if (role === 'user') {
      return await ChatMessageModel.countDocuments({
        receiver_id: userId,
        read_at: null,
      });
    } else if (role === 'cashier') {
      const chats = await ChatBoxModel.find({ cashier_user_id: userId }, '_id').lean();
      const chatIds = chats.map((c) => c._id);
      return await ChatMessageModel.countDocuments({
        chat_id: { $in: chatIds },
        sender_role: 'user',
        read_at: null,
      });
    }
    return 0;
  }

  async softDeleteMessage(chatId: string, messageId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      throw new Error('INVALID_ID');
    }

    const message = await ChatMessageModel.findOne({ _id: messageId, chat_id: chatId });

    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    const senderId = message.sender_id?.toString();
    const currentUserId = userId?.toString();

    console.log('[🟡 DEBUG]', { senderId, currentUserId });

    if (senderId !== currentUserId) {
      throw new Error('FORBIDDEN');
    }

    message.is_deleted = true;
    await message.save();
  }

  async editMessage(
    chatId: string,
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<void> {
    const message = await ChatMessageModel.findOne({ _id: messageId, chat_id: chatId });

    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    if (message.sender_id.toString() !== userId.toString()) {
      throw new Error('FORBIDDEN');
    }

    const allowEditAfterSeconds = Infinity;

    const timeDiff = (Date.now() - new Date(message.sent_at).getTime()) / 1000;
    if (timeDiff > allowEditAfterSeconds) {
      throw new Error('EDIT_TIME_EXPIRED');
    }

    message.content = newContent;
    message.edited = true;
    message.edited_at = new Date();

    await message.save();
  }

  async sendMessage(data: SendMessageDto): Promise<ChatMessage> {
    const chat = await ChatBoxModel.findById(data.chatId);
    if (!chat) throw new Error('CHAT_NOT_FOUND');

    let senderRole: 'user' | 'cashier';
    let receiverId: mongoose.Types.ObjectId;

    if (chat.user_id.toString() === data.senderId.toString()) {
      senderRole = 'user';
      if (!chat.cashier_user_id) {
        throw new Error('CASHIER_NOT_ASSIGNED');
      }
      receiverId = chat.cashier_user_id;
    } else if (chat.cashier_user_id?.toString() === data.senderId.toString()) {
      senderRole = 'cashier';
      receiverId = chat.user_id;
    } else {
      throw new Error('SENDER_NOT_PART_OF_CHAT');
    }

    if (!receiverId) throw new Error('RECEIVER_NOT_FOUND');
    if (receiverId.toString() === data.senderId.toString()) {
      throw new Error('Không thể gửi tin nhắn cho chính mình');
    }
    const isFirstMessage = !(await ChatMessageModel.exists({ chat_id: chat._id }));

    const userMessage = await ChatMessageModel.create({
      chat_id: chat._id,
      sender_id: new mongoose.Types.ObjectId(data.senderId),
      receiver_id: new mongoose.Types.ObjectId(receiverId),
      sender_role: senderRole,
      content: data.content,
      is_bot_reply: false,
      message_type: 'text',
      sent_at: new Date(),
      read_at: null,
      reply_to: data.replyTo ? new mongoose.Types.ObjectId(data.replyTo) : null,
    });

    if (isFirstMessage) {
      chat.first_message_at = new Date();
    }
    chat.updated_at = new Date();
    await chat.save();

    globalThis.io?.to(data.chatId).emit('message', {
      ...userMessage.toObject(),
      _id: String(userMessage._id),
      sender_id: String(userMessage.sender_id),
      receiver_id: String(userMessage.receiver_id),
      sender_role: senderRole,
    });

    try {
      const fcmTokens = await FCMTokenModel.find({ userId: receiverId }).lean();
      const tokens = fcmTokens.map((t) => t.token);
      if (tokens.length > 0) {
        await sendPushNotification(tokens, 'Tin nhắn mới', data.content, {
          chatId: data.chatId,
          senderId: data.senderId,
        });
      }
    } catch (err) {
      logger.error?.('FCM Notification Error', err);
    }

    // Bot reply logic - xử lý 2 trường hợp:
    // 1. Không có cashier: Bot reply ngay sau 2s
    // 2. Có cashier: Đợi 12s, nếu cashier không reply thì bot reply
    if (senderRole === 'user') {
      // Trường hợp 1: Không có cashier được gán -> Bot reply ngay
      if (!chat.cashier_user_id) {
        console.log('[🤖 BOT] Không có cashier, bot reply ngay');
        await delay(2000);

        const { getBotReply } = require('../utils/openaiBot');
        const botReply = await getBotReply(data.content);

        // Kiểm tra xem bot reply có chứa link hình ảnh không
        const imageUrls = this.extractImageUrls(botReply.content);
        const messageType =
          imageUrls.length > 0 || botReply.attachments.length > 0 ? 'image' : 'text';
        const allAttachments = [...botReply.attachments, ...imageUrls];

        const botMessage = await ChatMessageModel.create({
          chat_id: chat._id,
          sender_id: new mongoose.Types.ObjectId(process.env.BOT_ID || '000000000000000000000001'),
          receiver_id: new mongoose.Types.ObjectId(data.senderId),
          sender_role: 'bot',
          content: botReply.content,
          is_bot_reply: true,
          message_type: messageType,
          attachments: allAttachments,
          sent_at: new Date(),
        });

        const userSockets = getUserSocketIds(data.senderId);
        userSockets.forEach((socketId) => {
          globalThis.io?.to(socketId).emit('message', {
            ...botMessage.toObject(),
            _id: String(botMessage._id),
          });
        });

        chat.initiated_by = 'bot';
        chat.status = 'open';
        await chat.save();
      }
      // Trường hợp 2: Có cashier được gán -> Đợi cashier reply, nếu không có thì bot reply
      else {
        console.log('[🤖 BOT] Có cashier, đợi 12s cho cashier reply');
        // Sử dụng setTimeout để không block request
        setTimeout(async () => {
          try {
            // Kiểm tra xem cashier có reply trong 1 giây vừa rồi không
            const twelveSecondsAgo = new Date(Date.now() - 120000);
            const hasCashierReply = await ChatMessageModel.exists({
              chat_id: chat._id,
              sender_role: 'cashier',
              sent_at: { $gte: twelveSecondsAgo },
            });

            // Nếu cashier không reply trong 12s -> Bot reply
            if (!hasCashierReply) {
              console.log('[🤖 BOT] Cashier không reply trong 12s, bot reply');
              const { getBotReply } = require('../utils/openaiBot');
              const botReply = await getBotReply(data.content);

              // Kiểm tra xem bot reply có chứa link hình ảnh không
              const imageUrls = this.extractImageUrls(botReply.content);
              const messageType =
                imageUrls.length > 0 || botReply.attachments.length > 0 ? 'image' : 'text';
              const allAttachments = [...botReply.attachments, ...imageUrls];

              const botMessage = await ChatMessageModel.create({
                chat_id: chat._id,
                sender_id: new mongoose.Types.ObjectId(
                  process.env.BOT_ID || '000000000000000000000001',
                ),
                receiver_id: new mongoose.Types.ObjectId(data.senderId),
                sender_role: 'bot',
                content: botReply.content,
                is_bot_reply: true,
                message_type: messageType,
                attachments: allAttachments,
                sent_at: new Date(),
              });

              const userSockets = getUserSocketIds(data.senderId);
              userSockets.forEach((socketId) => {
                globalThis.io?.to(socketId).emit('message', {
                  ...botMessage.toObject(),
                  _id: String(botMessage._id),
                });
              });

              // Cập nhật trạng thái chat
              await ChatBoxModel.findByIdAndUpdate(chat._id, { status: 'open' });
            } else {
              console.log('[🤖 BOT] Cashier đã reply, không cần bot reply');
            }
          } catch (error) {
            console.error('❌ Bot reply error:', error);
          }
        }, 12000); // Đợi 12 giây
      }
    }

    return {
      ...userMessage.toObject(),
      _id: String(userMessage._id),
    } as ChatMessage;
  }

  // Trích xuất URL hình ảnh từ text
  private extractImageUrls(text: string): string[] {
    const imageUrls: string[] = [];
    const urlRegex = /(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|bmp|webp))/gi;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      imageUrls.push(match[0]);
    }
    return imageUrls;
  }
}

export default new ChatService();

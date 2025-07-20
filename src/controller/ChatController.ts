import { Request, Response } from 'express';
import { SendMessageDto } from '../types/chatbox.types';
import ChatService from '../services/ChatService';
import { Server as SocketIOServer } from 'socket.io';

const ChatController = {
  async getMyChat(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any;
      const userId = user._id || user.id || user.userId;

      if (!userId) {
        res.status(400).json({ message: 'Không tìm thấy userId trong token' });
        return;
      }

      const chat = await ChatService.getOrCreateChat(userId);

      res.json({ chat });
    } catch (error) {
      console.error('getMyChat error:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy session chat' });
    }
  },

  async getChatMessages(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const { before, limit = '20' } = req.query;

      const messages = await ChatService.getMessagesWithPagination(
        chatId,
        before as string,
        parseInt(limit as string, 10),
      );

      res.status(200).json({ messages });
    } catch (error) {
      console.error('getChatMessages error:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy tin nhắn' });
    }
  },

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const user = req.user as any;

      if (!user || !user.id) {
        res.status(403).json({ message: 'Unauthorized' });
        return;
      }

      const userId = user.id;
      const { content, replyTo } = req.body;

      if (!content?.trim()) {
        res.status(400).json({ message: 'Nội dung không được để trống' });
        return;
      }

      const role: 'user' | 'cashier' = user.roles?.some?.(
        (r: any) => r === 'cashier' || r?.name === 'cashier',
      )
        ? 'cashier'
        : 'user';

      console.log('[✅ ROLE DETECTED]', role);

      const message: SendMessageDto = {
        chatId,
        senderId: userId,
        content,
        replyTo,
        role,
      };

      const savedMessage = await ChatService.sendMessage(message);

      const io = req.app.get('io') as SocketIOServer;
      io.to(chatId).emit('message', savedMessage);

      res.status(201).json({ message: savedMessage });
    } catch (error) {
      console.error('sendMessage error:', error);
      res.status(500).json({ message: 'Lỗi server khi gửi tin nhắn' });
    }
  },

  async listChats(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any;
      const userId = user.id;
      const { page = 1, limit = 10, status } = req.query;

      const chats = await ChatService.listChatsOfCashierAdvanced({
        cashierId: userId,
        page: Number(page),
        limit: Number(limit),
        status: typeof status === 'string' ? status : undefined,
      });

      res.json({ chats });
    } catch (error) {
      console.error('listChats error:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy danh sách chat nâng cao' });
    }
  },

  async markMessageAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const { messageId } = req.body;

      if (!messageId) {
        res.status(400).json({ message: 'Thiếu messageId cần đánh dấu đã đọc' });
        return;
      }

      await ChatService.markMessageAsRead(chatId, messageId);

      res.status(200).json({ message: 'Đã đánh dấu là đã đọc' });
    } catch (error) {
      if (error instanceof Error) {
        console.error('markMessageAsRead error:', error.message, error.stack);
        res.status(500).json({ message: 'Lỗi server khi đánh dấu đã đọc', error: error.message });
      } else {
        console.error('markMessageAsRead error:', error);
        res.status(500).json({ message: 'Lỗi server khi đánh dấu đã đọc', error: String(error) });
      }
    }
  },

  async assignCashier(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const cashierId = (req.user as any).id;

      const chat = await ChatService.assignCashierToChat(chatId, cashierId);

      res.status(200).json({
        message: 'Đã gán bạn làm người xử lý phiên chat',
        chat,
      });
    } catch (error: any) {
      if (error.message === 'CHAT_NOT_FOUND') {
        res.status(404).json({ message: 'Không tìm thấy phiên chat' });
      } else if (error.message === 'ALREADY_ASSIGNED') {
        res.status(400).json({ message: 'Phiên chat đã được gán người xử lý' });
      } else {
        console.error('assignCashier error:', error);
        res.status(500).json({ message: 'Lỗi server khi gán phiên chat' });
      }
    }
  },

  async getOrCreateUserChat(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const cashierId = (req.user as any).id;

      console.log('getOrCreateUserChat called with userId:', userId, 'cashierId:', cashierId);

      if (userId === cashierId) {
        console.warn('[❌] Không thể tạo phiên chat với chính mình');
        res.status(400).json({ message: 'Không thể tạo phiên chat với chính mình' });
        return;
      }

      const chat = await ChatService.getOrCreateChatWithUser(userId, cashierId);

      res.status(200).json({ chat });
    } catch (error) {
      console.error('getOrCreateUserChat error:', error);
      res.status(500).json({ message: 'Lỗi server khi tạo hoặc lấy phiên chat với user' });
    }
  },

  async getUnreadMessageCount(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any;
      const userId = user._id?.toString() || user.id?.toString();
      const roles: string[] = Array.isArray(user.roles)
        ? user.roles.map((r: any) => r.name || r).map(String)
        : [String(user.roles)];

      const role = roles.includes('cashier') ? 'cashier' : 'user';

      const unreadCount = await ChatService.getUnreadMessageCount(userId, role);

      res.status(200).json({ unreadCount });
    } catch (error) {
      console.error('getUnreadMessageCount error:', error);
      res.status(500).json({ message: 'Lỗi server khi đếm tin chưa đọc' });
    }
  },

  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, messageId } = req.params;
      const userId = (req.user as any).id || (req.user as any).id;

      await ChatService.softDeleteMessage(chatId, messageId, userId);

      res.status(200).json({ message: 'Đã xoá mềm tin nhắn thành công' });
    } catch (error: any) {
      console.error('deleteMessage error:', error);

      if (error.message === 'MESSAGE_NOT_FOUND') {
        res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
      } else if (error.message === 'FORBIDDEN') {
        res.status(403).json({ message: 'Bạn không có quyền xoá tin nhắn này' });
      } else {
        res.status(500).json({ message: 'Lỗi server khi xoá tin nhắn' });
      }
    }
  },

  async editMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, messageId } = req.params;
      const { content } = req.body;
      const userId = (req.user as any).id;

      if (!content?.trim()) {
        res.status(400).json({ message: 'Nội dung mới không được để trống' });
        return;
      }

      await ChatService.editMessage(chatId, messageId, userId, content);

      res.status(200).json({ message: 'Tin nhắn đã được cập nhật thành công' });
    } catch (error: any) {
      if (error.message === 'MESSAGE_NOT_FOUND') {
        res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
      } else if (error.message === 'FORBIDDEN') {
        res.status(403).json({ message: 'Bạn không có quyền sửa tin nhắn này' });
      } else if (error.message === 'EDIT_TIME_EXPIRED') {
        res.status(400).json({ message: 'Đã quá thời gian cho phép chỉnh sửa (5 phút)' });
      } else {
        console.error('editMessage error:', error);
        res.status(500).json({ message: 'Lỗi server khi chỉnh sửa tin nhắn' });
      }
    }
  },

  async typingIndicator(req: Request, res: Response) {
    try {
      const { chatId } = req.params;
      const userId = (req.user as any).id;
      const { typing } = req.body; // true/false

      const io = req.app.get('io') as SocketIOServer;

      io.to(chatId).emit('typing', {
        chatId,
        userId,
        typing: Boolean(typing),
      });

      res.status(200).json({ message: 'Typing status sent' });
    } catch (error) {
      console.error('typingIndicator error:', error);
      res.status(500).json({ message: 'Lỗi khi gửi trạng thái đang gõ' });
    }
  },
};

export default ChatController;

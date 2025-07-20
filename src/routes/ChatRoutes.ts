import { Router } from 'express';
const router = Router();
import ChatController from '../controller/ChatController';
import { verifyChatPermission } from '../middleware/ChatPermission';

router.get('/me', ChatController.getMyChat); // user dùng (Lấy hoặc tạo phiên chat)
router.get('/me/cashier', ChatController.listChats); //(Cashier) Xem danh sách chat
router.get('/user/:userId', ChatController.getOrCreateUserChat); // Cashier lấy hoặc tạo phiên chat với user
router.get('/:chatId/messages', verifyChatPermission, ChatController.getChatMessages); // (user) (cashier) lấy tin nhắn trong phiên chat
router.post('/:chatId/message', verifyChatPermission, ChatController.sendMessage); // gửi tin nhắn từ user hoặc cashier
router.patch('/:chatId/read', verifyChatPermission, ChatController.markMessageAsRead); // đánh dấu tin nhắn đã đọc
router.post('/:chatId/assign', ChatController.assignCashier); //Gán mình xử lý phiên chat
router.get('/unread-count', ChatController.getUnreadMessageCount); // Lấy số lượng tin nhắn chưa đọc của user
router.delete(
  '/:chatId/message/:messageId',
  verifyChatPermission, // đảm bảo user có quyền với chat này
  ChatController.deleteMessage,
);
router.patch(
  '/:chatId/message/:messageId',
  verifyChatPermission, // Middleware kiểm tra quyền truy cập chat
  ChatController.editMessage,
);
router.post('/:chatId/typing', verifyChatPermission, ChatController.typingIndicator);

export default router;
/*
https://platform.openai.com/api-keys
*/

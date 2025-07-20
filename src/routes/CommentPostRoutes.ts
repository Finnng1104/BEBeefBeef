import express from 'express';
import CommentPostController from '../controller/CommentPostController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';
import { Request, Response, NextFunction } from 'express';

// Helper function to wrap async controllers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = express.Router();

// Lấy danh sách bình luận theo bài viết (không cần xác thực)
router.get('/:postId/comments', asyncHandler(CommentPostController.getCommentsByPostId));

// Thêm bình luận mới (cần xác thực)
router.post(
  '/:postId/comments',
  AuthMiddleWare.verifyToken,
  asyncHandler(CommentPostController.createComment),
);

// Cập nhật bình luận (cần xác thực)
router.put(
  '/comments/:commentId',
  AuthMiddleWare.verifyToken,
  asyncHandler(CommentPostController.updateComment),
);

// Xóa bình luận (cần xác thực)
router.delete(
  '/comments/:commentId',
  AuthMiddleWare.verifyToken,
  asyncHandler(CommentPostController.deleteComment),
);

export default router;

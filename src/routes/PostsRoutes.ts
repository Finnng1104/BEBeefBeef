import express from 'express';
import PostsController from '../controller/PostsController';
import upload from '../middleware/UploadMiddleWare';
import AuthMiddleWare from '../middleware/AuthMiddleWare';
import { Request, Response, NextFunction } from 'express';

// Helper function to wrap async controllers
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = express.Router();

router.get('/getAllPosts', asyncHandler(PostsController.getAllPosts));
router.get('/:id', asyncHandler(PostsController.getPostById)); // Lấy bài viết theo ID
router.post(
  '/create',
  upload.array('images', 5),
  AuthMiddleWare.verifyToken,
  asyncHandler(PostsController.createPost),
); // Tạo bài viết mới
router.put(
  '/:id',
  upload.array('images', 5),
  AuthMiddleWare.verifyToken,
  asyncHandler(PostsController.updatePost),
); // Cập nhật bài viết
router.delete('/:id', AuthMiddleWare.verifyToken, asyncHandler(PostsController.deletePost)); // Xóa bài viết theo ID
router.put('/:id/increment-views', asyncHandler(PostsController.incrementViews)); // Tăng lượt xem bài viết
router.post(
  '/:id/toggle-like',
  AuthMiddleWare.verifyToken,
  asyncHandler(PostsController.toggleLike),
); // Toggle like bài viết
router.get(
  '/:id/check-liked',
  AuthMiddleWare.verifyToken,
  asyncHandler(PostsController.checkUserLiked),
); // Kiểm tra người dùng đã like bài viết chưa
router.get('/by-tag/:tag', asyncHandler(PostsController.getPostsByTag));

export default router;

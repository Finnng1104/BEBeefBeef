import express from 'express';
import PostReportController from '../controller/PostReportController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';
import { Request, Response, NextFunction } from 'express';

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const router = express.Router();

// Tạo báo cáo bài viết
router.post('/', AuthMiddleWare.verifyToken, asyncHandler(PostReportController.createReport));
// Lấy tất cả báo cáo bài viết
router.get('/', AuthMiddleWare.verifyToken, asyncHandler(PostReportController.getAllReports));
// Xóa báo cáo bài viết
router.delete('/:id', AuthMiddleWare.verifyToken, asyncHandler(PostReportController.deleteReport));

export default router;

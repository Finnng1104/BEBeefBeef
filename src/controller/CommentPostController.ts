import { Request, Response } from 'express';
import CommentPostService from '../services/CommentPostService';
import { IUser } from '../models/UserModel';

class CommentPostController {
  /**
   * Tạo bình luận mới
   */
  async createComment(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      const user = req.user as IUser;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung bình luận không được để trống',
        });
      }

      const comment = await CommentPostService.createComment(postId, user.id as string, content);

      return res.status(201).json({
        success: true,
        message: 'Thêm bình luận thành công',
        data: comment,
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi thêm bình luận',
      });
    }
  }

  /**
   * Lấy danh sách bình luận theo bài viết
   */
  async getCommentsByPostId(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const comments = await CommentPostService.getCommentsByPostId(postId, page, limit, sortOrder);

      return res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi lấy danh sách bình luận',
      });
    }
  }

  /**
   * Cập nhật bình luận
   */
  async updateComment(req: Request, res: Response) {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const user = req.user as IUser;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung bình luận không được để trống',
        });
      }

      const comment = await CommentPostService.updateComment(commentId, user.id as string, content);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật bình luận thành công',
        data: comment,
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      const statusCode = error instanceof Error && error.message.includes('quyền') ? 403 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi cập nhật bình luận',
      });
    }
  }

  /**
   * Xóa bình luận
   */
  async deleteComment(req: Request, res: Response) {
    try {
      const { commentId } = req.params;
      const user = req.user as IUser;

      await CommentPostService.deleteComment(commentId, user.id as string);

      return res.status(200).json({
        success: true,
        message: 'Xóa bình luận thành công',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      const statusCode = error instanceof Error && error.message.includes('quyền') ? 403 : 500;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi xóa bình luận',
      });
    }
  }
}

export default new CommentPostController();

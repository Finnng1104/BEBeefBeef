import { Request, Response } from 'express';
import PostsService from '../services/PostsServices';

class PostsController {
  async getAllPosts(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const search = (req.query.search as string) || '';
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
      const posts = await PostsService.getAllPosts(page, limit, search, sortBy, sortOrder);
      res.status(200).json({
        success: true,
        ...posts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi server',
      });
    }
  }

  async getPostById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const post = await PostsService.getPostById(id);
      res.status(200).json({
        success: true,
        data: post,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Không tìm thấy bài viết',
      });
    }
  }
  async createPost(req: Request, res: Response) {
    try {
      // Validate required fields
      const { title, desc, content, categories_id } = req.body;
      if (!title || !desc || !content || !categories_id) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc: title, desc, content, categories_id',
        });
      }
      const userId = (req.user as any).id?.toString();

      const post = await PostsService.createPost(req, userId);
      res.status(201).json({
        success: true,
        message: 'Tạo bài viết thành công',
        data: post,
      });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi tạo bài viết',
      });
    }
  }

  async updatePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req.user as any).id?.toString();

      // Validate required fields
      const { title, desc, content, categories_id } = req.body;
      if (!title && !desc && !content && !categories_id) {
        return res.status(400).json({
          success: false,
          message: 'Cần ít nhất một trường để cập nhật',
        });
      }

      const post = await PostsService.updatePost(id, req, userId);
      res.status(200).json({
        success: true,
        message: 'Cập nhật bài viết thành công',
        data: post,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi cập nhật bài viết',
      });
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req.user as any).id?.toString();

      await PostsService.deletePost(id, userId);
      res.status(200).json({
        success: true,
        message: 'Xóa bài viết thành công',
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('quyền') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi xóa bài viết',
      });
    }
  }

  async incrementViews(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const post = await PostsService.incrementPostViews(id);

      res.status(200).json({
        success: true,
        data: post,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi cập nhật lượt xem',
      });
    }
  }

  async toggleLike(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req.user as any).id?.toString();

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Bạn cần đăng nhập để thích bài viết',
        });
      }

      const result = await PostsService.toggleLike(id, userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi thích/bỏ thích bài viết',
      });
    }
  }

  async checkUserLiked(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req.user as any).id?.toString();

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Bạn cần đăng nhập để kiểm tra trạng thái thích',
        });
      }

      const result = await PostsService.checkUserLiked(id, userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi kiểm tra trạng thái thích',
      });
    }
  }

  async getPostsByTag(req: Request, res: Response) {
    try {
      const { tag } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const posts = await PostsService.getPostsByTag(tag, page, limit);
      res.status(200).json({
        success: true,
        ...posts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi server',
      });
    }
  }
}

export default new PostsController();

import mongoose, { Types } from 'mongoose';
import CommentPost, { ICommentPost } from '../models/CommentPostModel';
import { Post } from '../models/PostsModel';

class CommentPostService {
  /**
   * Tạo bình luận mới
   */
  async createComment(postId: string, userId: string, content: string) {
    // Kiểm tra bài viết có tồn tại không
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Bài viết không tồn tại');
    }

    const comment = await CommentPost.create({
      content,
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
    });

    return comment;
  }

  /**
   * Lấy danh sách bình luận theo bài viết (có phân trang)
   */
  async getCommentsByPostId(
    postId: string,
    page = 1,
    limit = 10,
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const options = {
      page,
      limit,
      sort: { createdAt: sortOrder === 'asc' ? 1 : -1 },
      populate: {
        path: 'userId',
        select: 'username avatar',
      },
    };

    const comments = await CommentPost.paginate({ postId }, options);
    return comments;
  }

  /**
   * Cập nhật bình luận
   */
  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await CommentPost.findById(commentId);
    if (!comment) {
      throw new Error('Bình luận không tồn tại');
    }

    // Kiểm tra người dùng có quyền sửa bình luận không
    if (comment.userId.toString() !== userId) {
      throw new Error('Bạn không có quyền sửa bình luận này');
    }

    comment.content = content;
    comment.updatedAt = new Date();
    await comment.save();

    return comment;
  }

  /**
   * Xóa bình luận
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await CommentPost.findById(commentId);
    if (!comment) {
      throw new Error('Bình luận không tồn tại');
    }

    // Kiểm tra người dùng có quyền xóa bình luận không
    if (comment.userId.toString() !== userId) {
      throw new Error('Bạn không có quyền xóa bình luận này');
    }

    await comment.deleteOne();
    return true;
  }
}

export default new CommentPostService();

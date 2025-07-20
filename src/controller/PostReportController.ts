import { Request, Response } from 'express';
import { PostReport } from '../models/PostReportModel';
import { Post } from '../models/PostsModel';

class PostReportController {
  async createReport(req: Request, res: Response) {
    try {
      const { post_id, reason } = req.body;
      const reporter_id = (req.user as any)?.id;
      if (!post_id || !reason || !reporter_id) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin báo cáo' });
      }
      // Kiểm tra bài viết tồn tại
      const post = await Post.findById(post_id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
      }
      const report = await PostReport.create({ post_id, reporter_id, reason });
      res.status(201).json({ success: true, message: 'Báo cáo thành công', data: report });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: error instanceof Error ? error.message : 'Lỗi server' });
    }
  }

  async getAllReports(req: Request, res: Response) {
    try {
      const reports = await PostReport.find()
        .populate('post_id', 'title desc')
        .populate('reporter_id', 'username email');
      res.status(200).json({ success: true, data: reports });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: error instanceof Error ? error.message : 'Lỗi server' });
    }
  }
  async deleteReport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const report = await PostReport.findByIdAndDelete(id);
      if (!report) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo' });
      }
      res.status(200).json({ success: true, message: 'Xóa báo cáo thành công' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: error instanceof Error ? error.message : 'Lỗi server' });
    }
  }
}

export default new PostReportController();

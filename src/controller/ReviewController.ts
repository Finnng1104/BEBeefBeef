import { Request, Response } from 'express';
import { ReviewService } from '../services/ReviewService';
import { IUser } from '../models/UserModel';
import { Types } from 'mongoose';
export const ReviewController = {
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.user as IUser).id as Types.ObjectId;
      const { productId, rating, comment } = req.body;

      if (!productId || !rating || !comment) {
        res.status(400).json({ message: 'Missing productId, rating or comment' });
        return;
      }

      const review = await ReviewService.createReview({
        productId,
        userId,
        rating,
        comment,
      });

      res.status(201).json({ success: true, data: review });
    } catch (error: any) {
      if (error.message === 'Bạn đã đánh giá sản phẩm này rồi.') {
        res.status(409).json({ message: error.message });
      } else {
        console.error('Create review error:', error);
        res.status(500).json({ message: 'Lỗi máy chủ' });
      }
    }
  },

  list: async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId, page = 1, limit = 10, filter } = req.query;

      if (!productId) {
        res.status(400).json({ message: 'Missing productId' });
        return;
      }

      const reviews = await ReviewService.getReviewsByProduct(
        productId.toString(),
        Number(page),
        Number(limit),
        filter ? Number(filter) : undefined,
      );
      res.json({ success: true, data: reviews });
    } catch (error) {
      console.error('List review error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = new Types.ObjectId((req.user as IUser).id);
      const { id } = req.params;
      const { comment, rating } = req.body;

      const updated = await ReviewService.updateReview(id, userId, { comment, rating });

      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(403).json({ message: error.message || 'Server error' });
    }
  },

  toggleVisibility: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updated = await ReviewService.toggleVisibility(id);

      res.json({
        success: true,
        message: `Review is now ${updated.isHidden ? 'hidden' : 'visible'}`,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Server error' });
    }
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.user as IUser).id as Types.ObjectId;
      const { id: reviewId } = req.params;

      if (!reviewId) {
        res.status(400).json({ message: 'Missing reviewId' });
        return;
      }

      await ReviewService.deleteReview(reviewId, userId);
      res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Server error' });
    }
  },
};

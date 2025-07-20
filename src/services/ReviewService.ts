// review.service.ts
import ReviewModel, { IReview } from '../models/ReviewModel';
import { Order } from '../models/OrderModel';
import { Types } from 'mongoose';
import { OrderDetail } from '../models/OrderDetailModel';

export const ReviewService = {
  async createReview({
    productId,
    userId,
    rating,
    comment,
  }: {
    productId: Types.ObjectId;
    userId: Types.ObjectId;
    rating: number;
    comment: string;
  }): Promise<IReview> {
    const existingReview = await ReviewModel.findOne({ productId, userId });
    if (existingReview) {
      throw new Error('Bạn đã đánh giá sản phẩm này rồi.');
    }

    const completedOrders = await Order.find({ user_id: userId, status: 'COMPLETED' }).select(
      '_id',
    );
    const orderIds = completedOrders.map((order) => order._id);

    const hasPurchased = await OrderDetail.findOne({
      order_id: { $in: orderIds },
      dish_id: productId, // chú ý nếu productId là dish_id
    });

    const review = new ReviewModel({
      productId,
      userId,
      rating,
      comment,
      isVerifiedPurchase: !!hasPurchased,
    });

    return review.save();
  },

  async getReviewsByProduct(productId: string, page = 1, limit = 5, ratingFilter?: number) {
    const query: any = { productId };
    if (ratingFilter) query.rating = ratingFilter;

    const options = {
      page,
      limit,
      sort: { date: -1 },
      populate: {
        path: 'userId',
        select: 'username',
      },
    };

    return ReviewModel.paginate(query, options);
  },

  async updateReview(
    reviewId: string,
    userId: Types.ObjectId,
    updateData: Partial<Pick<IReview, 'comment' | 'rating'>>,
  ): Promise<IReview> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) throw new Error('Không tìm thấy đánh giá');

    if (!review.userId.equals(userId)) {
      throw new Error('Bạn không có quyền chỉnh sửa đánh giá này');
    }

    if (updateData.comment) review.comment = updateData.comment;
    if (updateData.rating) review.rating = updateData.rating;

    return review.save();
  },

  async toggleVisibility(reviewId: string): Promise<IReview> {
    const review = await ReviewModel.findById(reviewId);
    if (!review) throw new Error('Không tìm thấy đánh giá');
    review.isHidden = !review.isHidden;
    return review.save();
  },

  async deleteReview(reviewId: string, userId: Types.ObjectId) {
    const review = await ReviewModel.findOne({ _id: reviewId, userId });
    if (!review) throw new Error('Không tìm thấy đánh giá hoặc không có quyền.');
    return review.deleteOne();
  },

  async getRatingDistribution(productId: string) {
    const allReviews = await ReviewModel.find({ productId });
    const distribution = [0, 0, 0, 0, 0];

    allReviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[5 - r.rating]++;
      }
    });

    return distribution;
  },
};

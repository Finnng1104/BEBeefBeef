import { Model } from 'mongoose';
import { Request, Response } from 'express';

class PaginationService {
  async paginate(model: Model<any>, req: Request, res: Response): Promise<any> {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const skip = (pageNumber - 1) * limitNumber;

    try {
      const total = await model.countDocuments();

      const data = await model.find().skip(skip).limit(limitNumber);

      return res.status(200).json({
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        data,
      });
    } catch (error) {
      return res.status(500).json({
        message: 'An error occurred during pagination.',
        error,
      });
    }
  }
}

export default new PaginationService();

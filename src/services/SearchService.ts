import { Model, Document } from 'mongoose';

interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 1 | -1;
  searchFields?: string[];
  searchTerm?: string;
  filters?: Record<string, any>;
  populate?: string[];
  dateRange?: {
    field: string;
    start?: Date;
    end?: Date;
  };
  numberRange?: {
    field: string;
    min?: number;
    max?: number;
  }[];
}

class SearchService {
  async search<T extends Document>(model: Model<T>, options: SearchOptions) {
    try {
      const {
        page = 1,
        limit = 12,
        sortBy = 'createdAt',
        sortOrder = -1,
        searchTerm = '',
        filters = {},
        dateRange,
        numberRange = [],
      } = options;

      // Nếu có searchTerm, sử dụng aggregation pipeline
      if (searchTerm) {
        return await this.searchWithAggregation(model, options);
      }

      // Nếu không có searchTerm, sử dụng find thông thường
      const skip = (page - 1) * limit;
      const query: any = {};

      // Xử lý các filter thông thường
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined && filters[key] !== '') {
          query[key] = filters[key];
        }
      });

      // Xử lý filter theo khoảng thời gian
      if (dateRange && (dateRange.start || dateRange.end)) {
        query[dateRange.field] = {};
        if (dateRange.start) {
          query[dateRange.field].$gte = dateRange.start;
        }
        if (dateRange.end) {
          query[dateRange.field].$lte = new Date(dateRange.end.setHours(23, 59, 59, 999));
        }
      }

      // Xử lý filter theo khoảng số
      numberRange.forEach((range) => {
        if (range.min !== undefined || range.max !== undefined) {
          query[range.field] = {};
          if (range.min !== undefined) {
            query[range.field].$gte = range.min;
          }
          if (range.max !== undefined) {
            query[range.field].$lte = range.max;
          }
        }
      });

      // Thực hiện query với pagination
      const [items, total] = await Promise.all([
        model
          .find(query)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .populate(['user_id', 'address_id']),
        model.countDocuments(query),
      ]);

      return {
        items,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Search error: ${error.message}`);
    }
  }

  private async searchWithAggregation<T extends Document>(model: Model<T>, options: SearchOptions) {
    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = -1,
      searchTerm = '',
      filters = {},
      dateRange,
      numberRange = [],
    } = options;

    // Xây dựng pipeline cho aggregation
    const pipeline: any[] = [
      // Lookup để join với bảng users
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },

      // Lookup để join với bảng addresses, nhưng không bắt buộc phải có địa chỉ
      {
        $lookup: {
          from: 'addresses',
          localField: 'address_id',
          foreignField: '_id',
          as: 'address',
        },
      },
      {
        $addFields: {
          address: { $arrayElemAt: ['$address', 0] },
        },
      },
    ];

    // Xây dựng match conditions
    const matchConditions: any = {};

    // Search conditions
    if (searchTerm) {
      matchConditions.$or = [
        // { 'user.username': { $regex: searchTerm, $options: 'i' } },
        // { 'user.phone': { $regex: searchTerm, $options: 'i' } },
        { 'address.full_name': { $regex: searchTerm, $options: 'i' } },
        { 'address.phone': { $regex: searchTerm, $options: 'i' } },
        { receiver: { $regex: searchTerm, $options: 'i' } },
        { receiver_phone: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Filter conditions
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== '') {
        matchConditions[key] = filters[key];
      }
    });

    // Date range filter
    if (dateRange && (dateRange.start || dateRange.end)) {
      matchConditions[dateRange.field] = {};
      if (dateRange.start) {
        matchConditions[dateRange.field].$gte = dateRange.start;
      }
      if (dateRange.end) {
        matchConditions[dateRange.field].$lte = new Date(dateRange.end.setHours(23, 59, 59, 999));
      }
    }

    // Number range filters
    numberRange.forEach((range) => {
      if (range.min !== undefined || range.max !== undefined) {
        matchConditions[range.field] = {};
        if (range.min !== undefined) {
          matchConditions[range.field].$gte = range.min;
        }
        if (range.max !== undefined) {
          matchConditions[range.field].$lte = range.max;
        }
      }
    });

    // Thêm match stage nếu có conditions
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Sort
    pipeline.push({ $sort: { [sortBy]: sortOrder } });

    // Project để format kết quả trả về
    pipeline.push({
      $project: {
        _id: 1,
        user_id: {
          _id: '$user._id',
          username: '$user.username',
          email: '$user.email',
          phone: '$user.phone',
          avatar: '$user.avatar',
        },
        address_id: {
          _id: '$address._id',
          full_name: '$address.full_name',
          phone: '$address.phone',
          address: '$address.address',
          ward: '$address.ward',
          district: '$address.district',
          province: '$address.city',
        },
        payment_method: 1,
        delivery_type: 1,
        items_price: 1,
        vat_amount: 1,
        shipping_fee: 1,
        total_price: 1,
        total_quantity: 1,
        status: 1,
        delivery_status: 1,
        order_type: 1,
        delivery_time_type: 1,
        note: 1,
        receiver: 1,
        receiver_phone: 1,
        scheduled_time: 1,
        createdAt: 1,
        updatedAt: 1,
        cancelled_at: 1,
        cancelled_reason: 1,
        delivered_at: 1,
        returned_at: 1,
        payment_status: 1,
        paid_at: 1,
      },
    });

    // Thực hiện count tổng số kết quả
    const countPipeline = [...pipeline];
    const [countResult] = await model.aggregate([...countPipeline, { $count: 'total' }]);
    const total = countResult?.total || 0;

    // Thêm pagination
    pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });

    // Thực hiện query
    const items = await model.aggregate(pipeline);

    return {
      items,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }
}

export default new SearchService();

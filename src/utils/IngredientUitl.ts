import Ingredient from '../models/IngredientModel';

export function buildMatchQuery(filters: {
  search?: string;
  isDeleted: boolean;
  unit?: string;
  group?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  const { search, isDeleted, unit, group, minPrice, maxPrice } = filters;

  const match: any = { isDeleted };

  if (search) {
    match.name = { $regex: search, $options: 'i' };
  }
  if (unit) {
    match.unit = unit;
  }
  if (group) {
    match.group = group;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    match.price_per_unit = {};
    if (minPrice !== undefined) match.price_per_unit.$gte = minPrice;
    if (maxPrice !== undefined) match.price_per_unit.$lte = maxPrice;
  }

  return match;
}

export function buildSortStage(sort: string): Record<string, number> {
  const sortMap: Record<string, any> = {
    nameAZ: { name: 1 },
    nameZA: { name: -1 },
    groupAZ: { group: 1 },
    groupZA: { group: -1 },
    unitAZ: { unit: 1 },
    unitZA: { unit: -1 },
    priceLow: { price_per_unit: 1 },
    priceHigh: { price_per_unit: -1 },
    currentLow: { currentStock: 1 },
    currentHigh: { currentStock: -1 },
    stockStatusIn: { stockStatus: 1 },
    stockStatusOut: { stockStatus: -1 },
  };

  return sortMap[sort] || { createdAt: -1 };
}

export function getTodayUTC(): Date {
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
}

// Mở rộng build aggregate theo ngày, tuần, tháng để làm báo cáo
export function buildIngredientAggregate({
  match,
  sortStage,
  stockStatusFilter,
  page,
  limit,
  todayUtc,
}: {
  match: any;
  sortStage: any;
  stockStatusFilter?: 'in_stock' | 'low_stock' | 'out_of_stock';
  page: number;
  limit: number;
  todayUtc: Date;
}) {
  return Ingredient.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'inventorytransactions',
        let: { ingredientId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $lte: ['$transaction_date', todayUtc] },
                  { $eq: ['$ingredient_id', '$$ingredientId'] },
                ],
              },
            },
          },
          {
            $group: {
              _id: '$transaction_type',
              total: { $sum: '$quantity' },
            },
          },
        ],
        as: 'transactions',
      },
    },
    {
      $addFields: {
        currentStock: {
          $let: {
            vars: {
              importQty: {
                $ifNull: [
                  {
                    $first: {
                      $filter: {
                        input: '$transactions',
                        as: 't',
                        cond: { $eq: ['$$t._id', 'import'] },
                      },
                    },
                  },
                  { total: 0 },
                ],
              },
              exportQty: {
                $ifNull: [
                  {
                    $first: {
                      $filter: {
                        input: '$transactions',
                        as: 't',
                        cond: { $eq: ['$$t._id', 'export'] },
                      },
                    },
                  },
                  { total: 0 },
                ],
              },
              adjustmentQty: {
                $ifNull: [
                  {
                    $first: {
                      $filter: {
                        input: '$transactions',
                        as: 't',
                        cond: { $eq: ['$$t._id', 'adjustment'] },
                      },
                    },
                  },
                  { total: 0 },
                ],
              },
            },
            in: {
              $add: [
                '$$importQty.total',
                '$$adjustmentQty.total',
                { $multiply: ['$$exportQty.total', -1] },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        stockStatus: {
          $switch: {
            branches: [
              { case: { $lte: ['$currentStock', 0] }, then: 'out_of_stock' },
              {
                case: {
                  $lte: [
                    '$currentStock',
                    {
                      $ifNull: [
                        '$lowStockThreshold',
                        {
                          $switch: {
                            branches: [
                              { case: { $eq: ['$unit', 'mg'] }, then: 100000 },
                              { case: { $eq: ['$unit', 'gram'] }, then: 1000 },
                              { case: { $eq: ['$unit', 'kg'] }, then: 5 },
                              { case: { $eq: ['$unit', 'ml'] }, then: 1000 },
                              { case: { $eq: ['$unit', 'litre'] }, then: 3 },
                              { case: { $eq: ['$unit', 'pcs'] }, then: 10 },
                              { case: { $eq: ['$unit', 'unit'] }, then: 10 },
                              { case: { $eq: ['$unit', 'bottle'] }, then: 5 },
                              { case: { $eq: ['$unit', 'can'] }, then: 5 },
                              { case: { $eq: ['$unit', 'pack'] }, then: 3 },
                              { case: { $eq: ['$unit', 'box'] }, then: 2 },
                            ],
                            default: 10,
                          },
                        },
                      ],
                    },
                  ],
                },
                then: 'low_stock',
              },
            ],
            default: 'in_stock',
          },
        },
      },
    },
    ...(stockStatusFilter ? [{ $match: { stockStatus: stockStatusFilter } }] : []),
    { $sort: sortStage },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);
}

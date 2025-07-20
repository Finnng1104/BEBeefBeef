import { FoodFilter } from '../types/foodFilter';
import Category from '../models/CategoryModel';

async function buildQuery(filters: FoodFilter): Promise<any> {
  const query: any = {};
  query.isDeleted = false;

  if (filters.search) {
    query.$or = [{ name: { $regex: filters.search, $options: 'i' } }];
  }

  if (filters.category) {
    const categoryDoc = await Category.findOne({ Cate_slug: filters.category }).lean();
    if (categoryDoc) {
      query.categories = { $in: [categoryDoc._id] };
    } else {
      query.categories = { $in: [] };
    }
  }

  const priceRange = parseNumberRange(filters.priceMin, filters.priceMax);
  if (priceRange !== undefined) query.price = priceRange;

  const discountRange = parseNumberRange(filters.discountMin, filters.discountMax);
  if (discountRange !== undefined) query.discount_price = discountRange;

  const stockRange = parseNumberRange(filters.stockMin, filters.stockMax);
  if (stockRange !== undefined) query.countInStock = stockRange;

  const viewsRange = parseNumberRange(filters.viewsMin, filters.viewsMax);
  if (viewsRange !== undefined) query.views = viewsRange;

  const orderedRange = parseNumberRange(filters.orderedMin, filters.orderedMax);
  if (orderedRange !== undefined) query.ordered_count = orderedRange;

  const ratingRange = parseNumberRange(filters.ratingMin, filters.ratingMax);
  if (ratingRange !== undefined) query.average_rating = ratingRange;

  if (filters.status !== undefined) {
    query.status = filters.status;
  }

  return query;
}

function parseNumberRange(min?: any, max?: any): { $gte?: number; $lte?: number } | undefined {
  const range: { $gte?: number; $lte?: number } = {};
  if (min !== undefined && !isNaN(Number(min))) range.$gte = Number(min);
  if (max !== undefined && !isNaN(Number(max))) range.$lte = Number(max);
  return Object.keys(range).length > 0 ? range : undefined;
}

export { buildQuery };

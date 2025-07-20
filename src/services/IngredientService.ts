import { Dish } from '../models/DishModel';
import Ingredient, { IIngredient } from '../models/IngredientModel';
import { ingredientSchema } from '../validators/ingredientValidator';
import { IngredientInput } from '../validators/ingredientValidator';
import { PaginateResult } from 'mongoose';

import {
  buildMatchQuery,
  buildSortStage,
  getTodayUTC,
  buildIngredientAggregate,
} from '../utils/IngredientUitl';

interface IngredientFilterParams {
  maxPrice?: number;
  minPrice?: number;
  unit?: string;
  group?: string;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'low_stock';
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  isDeleted?: boolean;
}

class IngredientService {
  async getAllIngredients(params: IngredientFilterParams): Promise<PaginateResult<any>> {
    const {
      page = 1,
      limit = 12,
      search = '',
      sort = '',
      isDeleted = false,
      unit,
      group,
      stockStatus,
      minPrice,
      maxPrice,
    } = params;

    const match = buildMatchQuery({ search, isDeleted, unit, group, minPrice, maxPrice });
    const sortStage = buildSortStage(sort);
    const todayUtc = getTodayUTC();

    const aggregate = buildIngredientAggregate({
      match,
      sortStage,
      stockStatusFilter: stockStatus || undefined,
      page,
      limit,
      todayUtc,
    });

    const [results, totalCount] = await Promise.all([
      aggregate.exec(),
      Ingredient.countDocuments(match),
    ]);

    const offset = (page - 1) * limit;

    return {
      docs: results,
      totalDocs: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
      offset,
      pagingCounter: offset + 1,
    };
  }

  async createIngredient(ingredientData: IngredientInput): Promise<IIngredient> {
    const { success, error } = ingredientSchema.safeParse(ingredientData);
    if (!success) {
      throw new Error(`Validation error: ${error.message}`);
    }

    try {
      const allowedFields = {
        name: ingredientData.name,
        slug: ingredientData.slug,
        unit: ingredientData.unit,
        group: ingredientData.group,
        subGroup: ingredientData.subGroup,
        price_per_unit: ingredientData.price_per_unit,
        lowStockThreshold: ingredientData.lowStockThreshold || 0,
      };

      console.log('Creating ingredient with data:', allowedFields);
      const newIngredient = new Ingredient(allowedFields);

      return await newIngredient.save();
    } catch (error) {
      console.error('Error creating ingredient:', error);
      throw new Error('Failed to create ingredient');
    }
  }

  async getIngredientBySlug(slug: string): Promise<IIngredient | null> {
    try {
      const ingredient = await Ingredient.findOne({ slug });
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }
      return ingredient;
    } catch (error) {
      console.error('Error fetching ingredient by slug:', error);
      throw new Error('Failed to fetch ingredient by slug');
    }
  }

  async updateIngredient(id: string, ingredientData: IIngredient): Promise<IIngredient | null> {
    const { success, error } = ingredientSchema.safeParse(ingredientData);
    if (!success) {
      throw new Error(`Validation error: ${error.message}`);
    }

    try {
      const allowedFields = {
        name: ingredientData.name,
        slug: ingredientData.slug,
        unit: ingredientData.unit,
        price_per_unit: ingredientData.price_per_unit,
        group: ingredientData.group,
        subGroup: ingredientData.subGroup,
        lowStockThreshold: ingredientData.lowStockThreshold || 0,
      };

      const updatedIngredient = await Ingredient.findByIdAndUpdate(id, allowedFields, {
        new: true,
      });

      return updatedIngredient;
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw new Error('Failed to update ingredient');
    }
  }

  async softDeleteIngredient(id: string): Promise<IIngredient | null> {
    try {
      const ingredient = await Ingredient.findById(id);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }
      ingredient.isDeleted = true;
      ingredient.deletedAt = new Date();

      return await ingredient.save();
    } catch (error) {
      console.error('Error soft deleting ingredient:', error);
      throw new Error('Failed to soft delete ingredient');
    }
  }

  async getAllTrashIngredients(params: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
  }): Promise<PaginateResult<IIngredient>> {
    try {
      const { page = 1, limit = 12, search = '', sort = '' } = params;

      const query: any = {};
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      query.isDeleted = true;

      const sortMapping: Record<string, Record<string, 1 | -1>> = {
        nameAZ: { name: 1 },
        nameZA: { name: -1 },
        groupAZ: { group: 1 },
        groupZA: { group: -1 },
        unitAZ: { unit: 1 },
        unitZA: { unit: -1 },
        priceLow: { price_per_unit: 1 },
        priceHigh: { price_per_unit: -1 },
        deletedAtNew: { deletedAt: -1 },
        deletedAtOld: { deletedAt: 1 },
      };

      const sortOption = sortMapping[sort] || { createdAt: -1 };

      const result = await Ingredient.paginate(query, {
        page,
        limit,
        sort: sortOption,
      });

      return result;
    } catch (error) {
      console.error('Error fetching ingredients with filters:', error);
      throw new Error('Failed to fetch ingredients');
    }
  }

  async restoreIngredient(id: string): Promise<IIngredient | null> {
    try {
      const ingredient = await Ingredient.findById(id);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }
      ingredient.isDeleted = false;
      ingredient.deletedAt = null;
      return await ingredient.save();
    } catch (error) {
      console.error('Error restoring ingredient:', error);
      throw new Error('Failed to restore ingredient');
    }
  }

  async permanentlyDeleteIngredient(id: string): Promise<IIngredient | null> {
    try {
      const ingredient = await Ingredient.findById(id);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      const usedInFood = await Dish.exists({ 'ingredients.ingredient': id });
      if (usedInFood) {
        throw new Error('Không thể xoá: Nguyên liệu đang được sử dụng trong món ăn.');
      }

      // Kiểm tra báo cáo (tuỳ mô hình bạn)
      // const usedInReports = await Report.exists({ "ingredients.ingredient": id });
      // if (usedInReports) {
      //     throw new Error("Không thể xoá: Nguyên liệu có trong báo cáo thống kê.");
      // }

      // Kiểm tra tồn tại trong quản lý kho
      // const usedInInventory = await Inventory.exists({ ingredient: id });
      // if (usedInInventory) {
      //     throw new Error("Không thể xoá: Nguyên liệu tồn tại trong quản lý kho.");
      // }

      // Nếu không bị ràng buộc, cho phép xoá
      const deleted = await Ingredient.findByIdAndDelete(id);
      return deleted;
    } catch (error) {
      console.error('Error permanently deleting ingredient:', error);
      throw new Error((error as Error).message || 'Failed to permanently delete ingredient');
    }
  }
}

export default new IngredientService();

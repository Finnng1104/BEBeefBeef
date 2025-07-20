import { Dish } from '../models/DishModel';
import Category from '../models/CategoryModel';
import { Favorite } from '../models/FavoriteModel';
import mongoose, { Types } from 'mongoose';
import { FoodFilter } from '../types/foodFilter';
import { buildQuery } from '../utils/queryBuilder';
import { getSortQuery } from '../utils/sorting';
import UploadService from './UploadImageService';
import { OrderDetail } from '../models/OrderDetailModel';
import DishIngredient from '../models/DishIngredientModel';

class FoodService {
  async createFoodWithImages(foodData: any, files: Express.Multer.File[]) {
    const categoryId = foodData.category?.toString();
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error('Category không tồn tại');
    }

    const categorySlug = category.Cate_slug;

    const uploadedImages = await Promise.all(
      files.map((file) => UploadService.UploadImage(file, `dishes/${categorySlug}`)),
    );

    const formattedImages = uploadedImages.map((img) => img.url);

    const food = {
      ...foodData,
      categories: new mongoose.Types.ObjectId(categoryId),
      images: formattedImages,
      newUntil: foodData.isDishNew ? foodData.newUntil : null,
      discountUntil: foodData.discount_price > 0 ? foodData.discountUntil : null,
      recommendUntil: foodData.isRecommend ? foodData.recommendUntil : null,
    };

    try {
      const newFood = new Dish(food);
      return await newFood.save();
    } catch (dbError) {
      console.error('Failed to save food:', dbError);
      throw dbError;
    }
  }

  async updateFoodWithImages(id: string, foodData: any, files?: Express.Multer.File[]) {
    const category = await this.getCategory(foodData.category);
    const categorySlug = category.Cate_slug;

    const existingImages = this.parseExistingImages(foodData.existingImages);
    const uploadedImages = await this.uploadNewImages(files, categorySlug);
    const formattedImages = [...existingImages, ...uploadedImages];

    const originalDish = await Dish.findById(id);
    if (!originalDish) throw new Error('Không tìm thấy món ăn gốc');

    await this.deleteRemovedImages(originalDish.images || [], formattedImages);

    const updateFields = this.buildUpdateFields(foodData, category.id, formattedImages);

    const updated = await Dish.findByIdAndUpdate(id, updateFields, { new: true });
    if (!updated) throw new Error('Không tìm thấy món ăn để cập nhật');

    return updated;
  }

  async getTopFavoriteFood() {
    try {
      const food = await Dish.find({
        status: { $in: ['available', 'soldout'] },
        isDeleted: false,
      })
        .sort({ favorites_count: -1 })
        .limit(5);

      if (!food || food.length === 0) {
        return { message: 'No food found' };
      }

      return food;
    } catch {
      throw new Error('Error getting top favorite food');
    }
  }

  async getAllFood(filters: FoodFilter, userId?: string | null, roleNames: string[] = []) {
    const { page = 1, limit = 10, sort = '' } = filters;

    const query = await buildQuery(filters);

    const isUserOrGuest = !userId || roleNames.length === 0 || roleNames.includes('user');

    if (isUserOrGuest) {
      query.status = { $in: ['available', 'soldout'] };
      query.isDeleted = false;
    }

    const sortQuery = getSortQuery(sort);

    const options = {
      page,
      limit,
      sort: sortQuery,
      lean: true,
      populate: {
        path: 'categories',
        select: 'Cate_name',
      },
    };

    try {
      return await Dish.paginate(query, options);
    } catch (error) {
      console.error('Error in getAllFood:', error);
      throw new Error('Error fetching food items');
    }
  }

  async getFoodBySlug(slug: string) {
    const food = await Dish.findOne({ slug }).populate('categories');
    if (!food) {
      return null;
    }
    return food;
  }

  async getFoodByNewest() {
    try {
      const foodNewest = await Dish.find({
        status: { $in: ['available', 'soldout'] },
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('categories');

      return foodNewest;
    } catch (error) {
      console.error('Error in getFoodByNewest:', error);
      throw new Error('Error fetching newest food');
    }
  }

  async getFoodById(id: string) {
    try {
      const food = await Dish.findById(id).populate('categories');
      return food;
    } catch {
      throw new Error('Error getting food by id');
    }
  }

  async getFoodByCategoryType(cateType: string) {
    try {
      const categories = await Category.find({ Cate_type: cateType });
      const categoryIds = categories.map((cat) => cat._id);

      const food = await Dish.find({
        categories: { $in: categoryIds },
        status: { $in: ['available', 'soldout'] },
        isDeleted: false,
      });

      return food;
    } catch {
      throw new Error('Error getting food by category type');
    }
  }

  async getFoodByPrice(pricemin: number, pricemax: number) {
    try {
      return await Dish.find({
        price: { $gte: pricemin, $lte: pricemax },
        status: { $in: ['available', 'soldout'] },
        isDeleted: false,
      });
    } catch {
      throw new Error('Error getting food by price');
    }
  }

  async getFoodByRating(rating: number) {
    try {
      return await Dish.find({
        rating,
        status: { $in: ['available', 'soldout'] },
        isDeleted: false,
      });
    } catch {
      throw new Error('Error getting food by rating');
    }
  }

  async getFoodBest4(categoryId: string) {
    try {
      const objectId = new mongoose.Types.ObjectId(categoryId);

      const foodNewest = await Dish.aggregate([
        {
          $match: {
            categories: { $in: [objectId] },
            status: { $in: ['available', 'soldout'] },
            isDeleted: false,
          },
        },
        { $sort: { favorites_count: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'categories',
            localField: 'categories',
            foreignField: '_id',
            as: 'categories',
          },
        },
      ]);

      return foodNewest;
    } catch (error) {
      console.error('Error in getFoodBest4:', error);
      throw new Error('Error fetching food by category');
    }
  }

  async getFoodByFavorites(favorites: number, type: string) {
    try {
      const dishes = await Dish.aggregate([
        {
          $match: {
            favorites_count: favorites,
            status: { $in: ['available', 'soldout'] },
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categories',
            foreignField: '_id',
            as: 'categories',
          },
        },
        { $unwind: '$categories' },
        {
          $match: { 'categories.Cate_type': type },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            price: 1,
            description: 1,
            images: 1,
            favorites_count: 1,
            rating: 1,
            rating_count: 1,
            average_rating: 1,
            categories: 1,
            slug: 1,
          },
        },
      ]);
      return dishes;
    } catch (error) {
      console.error('Error in getFoodByFavorites:', error);
      throw new Error('Error fetching food by favorites');
    }
  }

  async getTopFavoriteFoods(type: string) {
    try {
      const dishes = await Dish.aggregate([
        {
          $match: {
            status: { $in: ['available', 'soldout'] },
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categories',
            foreignField: '_id',
            as: 'categories',
          },
        },
        { $unwind: '$categories' },
        {
          $match: { 'categories.Cate_type': type },
        },
        {
          $sort: { favorites_count: -1 },
        },
        {
          $limit: 6,
        },
        {
          $project: {
            _id: 1,
            name: 1,
            price: 1,
            description: 1,
            images: 1,
            favorites_count: 1,
            rating: 1,
            categories: 1,
            slug: 1,
          },
        },
      ]);
      return dishes;
    } catch (error) {
      console.error('Error in getTopFavoriteFoods:', error);
      throw new Error('Error fetching top favorite foods');
    }
  }

  async toggleFavorite(dishId: string, userId: Types.ObjectId) {
    try {
      const food = await Dish.findById(dishId);
      if (!food) {
        throw new Error('Food not found');
      }
      const existingFavorite = await Favorite.findOne({ userId, dishId });

      if (existingFavorite) {
        await Favorite.deleteOne({ userId, dishId });
        return {
          message: 'Favorite removed successfully',
          isFavortite: false,
        };
      } else {
        const newFavorite = new Favorite({
          userId,
          dishId,
        });

        if (!newFavorite.dishId) {
          throw new Error('dishId is required');
        }

        await newFavorite.save();
        return {
          message: 'Favorite added successfully',
          isFavortite: true,
        };
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error('Error toggling favorite');
    }
  }

  async getFavoriteFoods(userId: Types.ObjectId) {
    try {
      const favorites = await Favorite.find({ userId }).populate('dishId').lean();

      if (!favorites || favorites.length === 0) {
        return {
          message: 'No favorite foods found',
          data: [],
        };
      }

      const filteredFavorites = favorites
        .map((fav) => fav.dishId)
        .filter((dish: any) => dish && dish.status !== 'hidden' && dish.isDeleted !== true);

      return filteredFavorites;
    } catch (error) {
      console.error('Error getting favorite foods:', error);
      throw new Error('Error getting favorite foods');
    }
  }

  async countFoodView(foodId: string) {
    try {
      const food = await Dish.findById(foodId);
      if (!food) {
        throw new Error('Food not found');
      }
      food.views = (food.views || 0) + 1;
      await food.save();
      return food;
    } catch (error) {
      console.error('Error counting food view:', error);
      throw new Error('Error counting food view');
    }
  }

  async softDeleteDish(id: string) {
    try {
      const food = await Dish.findById(id);
      if (!food) {
        throw new Error('Food not found');
      }
      food.isDeleted = true;
      food.deletedAt = new Date();
      await food.save();
      return food;
    } catch (error) {
      console.error('Error soft deleting dish:', error);
      throw new Error('Error soft deleting dish');
    }
  }

  async getTrashFood(filters: FoodFilter) {
    const { page = 1, limit = 12, sort = 'newest' } = filters;

    const query = await buildQuery(filters);
    query.isDeleted = true;
    const sortQuery = getSortQuery(sort);

    const options = {
      page,
      limit,
      sort: sortQuery,
      lean: true,
      populate: {
        path: 'categories',
        select: 'Cate_name',
      },
    };

    try {
      return await Dish.paginate(query, options);
    } catch (error) {
      console.error('Error in getTrashFood:', error);
      throw new Error('Error fetching trash food items');
    }
  }

  async restoreDish(id: string) {
    try {
      const food = await Dish.findById(id);
      if (!food) {
        throw new Error('Food not found');
      }
      food.isDeleted = false;
      await food.save();
      return food;
    } catch (error) {
      console.error('Error restoring dish:', error);
      throw new Error('Error restoring dish');
    }
  }

  /*
    Xoá món ăn vĩnh viễn:
    - Kiểm tra món ăn có tồn tại không
    - Kiểm tra món ăn có đang được sử dụng trong đơn hàng không
    - Đơn hàng (orders)
    - Đánh giá (reviews)
    - Yêu thích (favorites)
    - Menu đang active
    - Các báo cáo liên quan
  */
  async permanentlyDeleteDish(id: string) {
    try {
      const dish = await Dish.findById(id);
      if (!dish) {
        throw new Error('Món ăn không tồn tại');
      }

      const usedInOrderDetails = await OrderDetail.exists({ dish_id: id });
      if (usedInOrderDetails) {
        throw new Error('Không thể xoá món ăn vì đã được sử dụng trong chi tiết đơn hàng');
      }

      if (dish.images && dish.images.length > 0) {
        await UploadService.deleteImages(dish.images);
      }

      await dish.deleteOne();

      return { message: 'Xoá món ăn vĩnh viễn thành công' };
    } catch (error: any) {
      console.error('Lỗi xoá món ăn vĩnh viễn:', error);
      throw new Error(error.message || 'Lỗi khi xoá món ăn vĩnh viễn');
    }
  }

  async getDishIngredients(dishId: string) {
    try {
      const dishInfo = await Dish.findById(dishId).select('name images ingredients').lean();

      if (!dishInfo) {
        return { message: 'Dish not found' };
      }

      const ingredientsRaw = await DishIngredient.find({
        dishId: new mongoose.Types.ObjectId(dishId),
      })
        .populate({
          path: 'ingredientId',
          select: 'name',
        })
        .lean();

      const ingredients = ingredientsRaw
        .map((item) => ({
          _id: item._id,
          ingredientId: item.ingredientId._id,
          ingredientName: (item.ingredientId as any).name,
          quantity: item.quantity,
          unit: item.unit,
        }))
        .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

      return {
        dish: {
          id: dishInfo._id,
          name: dishInfo.name,
          image: dishInfo.images?.[0] || null,
          ingredients: dishInfo.ingredients || '',
        },
        ingredients: ingredients || [],
      };
    } catch (error) {
      console.error('Error getting dish ingredients:', error);
      throw new Error('Error getting dish ingredients');
    }
  }

  async addManyDishIngredients(
    dishId: string,
    ingredients: { ingredientId: string; quantity: number; unit: string }[],
  ) {
    try {
      const addedIngredients = [];

      for (const ing of ingredients) {
        const { ingredientId, quantity, unit } = ing;

        const exists = await DishIngredient.findOne({
          dish: new mongoose.Types.ObjectId(dishId),
          ingredient: new mongoose.Types.ObjectId(ingredientId),
        });

        if (exists) {
          console.log(`Ingredient ${ingredientId} already exists for dish ${dishId}`);
          continue;
        }

        const newItem = await DishIngredient.create({
          dishId: new mongoose.Types.ObjectId(dishId),
          ingredientId: new mongoose.Types.ObjectId(ingredientId),
          quantity,
          unit,
        });

        addedIngredients.push(newItem);
      }

      return addedIngredients;
    } catch (error) {
      console.error('Error adding dish ingredients:', error);
      throw new Error('Error adding dish ingredients');
    }
  }

  async updateManyDishIngredients(
    dishId: string,
    updates: { _id: string; ingredientId: string; quantity: number; unit: string }[],
  ) {
    const results = [];

    for (const item of updates) {
      const { _id, ingredientId, quantity, unit } = item;

      if (!mongoose.Types.ObjectId.isValid(_id) || !mongoose.Types.ObjectId.isValid(ingredientId))
        continue;

      const exists = await DishIngredient.findOne({
        _id: { $ne: _id },
        dishId: new mongoose.Types.ObjectId(dishId),
        ingredientId: new mongoose.Types.ObjectId(ingredientId),
      });

      if (exists) {
        console.log(`Nguyên liệu ${ingredientId} đã tồn tại trong món ăn ${dishId}, bỏ qua.`);
        continue;
      }

      const updated = await DishIngredient.findOneAndUpdate(
        { _id, dishId: new mongoose.Types.ObjectId(dishId) },
        {
          ingredientId: new mongoose.Types.ObjectId(ingredientId),
          quantity,
          unit,
        },
        { new: true },
      );

      if (updated) results.push(updated);
    }

    return results;
  }

  async deleteManyDishIngredients(ids: string[], dishId: string) {
    const results = [];
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) continue;

      const deleted = await DishIngredient.findOneAndDelete({
        _id: id,
        dishId: new mongoose.Types.ObjectId(dishId),
      });

      if (deleted) results.push(deleted);
    }

    return results;
  }

  // updateFoodWithImages's private methods
  private async getCategory(categoryId: string) {
    const category = await Category.findById(categoryId);
    if (!category) throw new Error('Category không tồn tại');
    return category;
  }

  private parseExistingImages(imagesJson: string): string[] {
    try {
      const images = JSON.parse(imagesJson || '[]');
      return Array.isArray(images) ? images : [];
    } catch {
      return [];
    }
  }

  private async uploadNewImages(
    files: Express.Multer.File[] | undefined,
    folder: string,
  ): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const uploaded = await Promise.all(
      files.map((file) => UploadService.UploadImage(file, `dishes/${folder}`)),
    );
    return uploaded.map((img) => img.url);
  }

  private async deleteRemovedImages(original: string[], updated: string[]) {
    const toRemove = original.filter((img) => !updated.includes(img));
    if (toRemove.length > 0) {
      await UploadService.deleteImages(toRemove);
    }
  }

  private buildUpdateFields(foodData: any, categoryId: string, images: string[]) {
    return {
      ...foodData,
      categories: new mongoose.Types.ObjectId(categoryId),
      newUntil: foodData.isDishNew ? foodData.newUntil : null,
      discountUntil: foodData.discount_price > 0 ? foodData.discountUntil : null,
      images,
    };
  }
}

export default new FoodService();

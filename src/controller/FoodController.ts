import FoodService from '../services/FoodService';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { IUser } from '../models/UserModel';
import { parseFoodQueryParams } from '../utils/queryParser';
import jwt from 'jsonwebtoken';
class FoodController {
  async createFood(req: Request, res: Response): Promise<any> {
    try {
      const { name, slug, price, description, category } = req.body;

      if (!name || !price || !slug || !description || !category) {
        return res
          .status(400)
          .json({ message: 'Thiếu thông tin bắt buộc: name, price, slug, description, category' });
      }
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: 'Category không hợp lệ' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'Phải có ít nhất một hình ảnh' });
      }

      const newFood = await FoodService.createFoodWithImages(req.body, files);
      return res.status(201).json({ message: 'Tạo món ăn thành công', data: newFood });
    } catch (error: any) {
      console.error('Error creating food:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  }

  async updateFood(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { name, slug, price, description, category } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID món ăn không hợp lệ' });
      }

      if (!name || !price || !slug || !description || !category) {
        return res
          .status(400)
          .json({ message: 'Thiếu thông tin bắt buộc: name, price, slug, description, category' });
      }

      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: 'Category không hợp lệ' });
      }

      const files = req.files as Express.Multer.File[];

      const updatedFood = await FoodService.updateFoodWithImages(id, req.body, files);
      return res.status(200).json({ message: 'Cập nhật món ăn thành công', data: updatedFood });
    } catch (error: any) {
      console.error('Error updating food:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  }

  async getTopFavoriteFood(req: Request, res: Response): Promise<void> {
    try {
      const foodFavoriteTop = await FoodService.getTopFavoriteFood();
      res.status(200).json({
        success: true,
        data: foodFavoriteTop,
      });
      return;
    } catch (error) {
      console.error('Error fetching top favorite foods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve top favorite foods',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }
  }

  async getAllFood(req: Request, res: Response): Promise<any> {
    try {
      const params = parseFoodQueryParams(req.query);

      let userId: string | undefined = undefined;
      let roleNames: string[] = [];

      const authHeader = req.headers['authorization'];
      const token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.ACCESS_TOKEN as string) as IUser & {
            roles: string[];
            id: string;
          };
          userId = decoded.id;
          roleNames = decoded.roles || [];
        } catch (err: any) {
          console.warn('⚠️ Token decode failed:', err.message);
          // Không throw để vẫn trả data được cho user chưa login
        }
      }

      const foods = await FoodService.getAllFood(params, userId, roleNames);

      return res.status(200).json({
        success: true,
        message: 'All food retrieved successfully',
        data: foods,
      });
    } catch (error: any) {
      console.error('Error in getAllFood:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting all food',
        error: error.message,
      });
    }
  }

  async getFoodBySlug(req: Request, res: Response): Promise<any> {
    try {
      const { slug } = req.params;
      const food = await FoodService.getFoodBySlug(slug);

      if (!food) {
        return res.status(404).json({
          success: false,
          message: 'Món ăn không tồn tại!',
        });
      }

      return res.status(200).json({
        success: true,
        data: food,
      });
    } catch (error) {
      console.error('Error getting food by slug:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy món ăn',
      });
    }
  }

  async getFoodById(req: Request, res: Response): Promise<any> {
    try {
      const foodId = String(req.params.id);
      const food = await FoodService.getFoodById(foodId);
      res.status(200).json(food);
    } catch {
      throw new Error('Error getting food by id');
    }
  }

  async getFoodByNewest(_: Request, res: Response): Promise<any> {
    try {
      const food = await FoodService.getFoodByNewest();
      return res.status(200).json({
        success: true,
        message: 'Food retrieved successfully',
        data: food,
      });
    } catch (error) {
      console.error('Error getting food by newest:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting food by newest',
      });
    }
  }

  async getFoodByCategory(req: Request, res: Response): Promise<any> {
    try {
      const { Cate_type } = req.query;
      const food = await FoodService.getFoodByCategoryType(String(Cate_type));
      res.status(200).json(food);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error getting food by category type' });
    }
  }

  async getFoodByPrice(req: Request, res: Response): Promise<any> {
    try {
      const { min, max } = req.query;
      const food = await FoodService.getFoodByPrice(Number(min), Number(max));
      res.status(200).json(food);
    } catch {
      throw new Error('Error getting food by price');
    }
  }

  async getFoodByRating(req: Request, res: Response): Promise<any> {
    try {
      const { rating } = req.query;
      const food = await FoodService.getFoodByRating(Number(rating));
      res.status(200).json(food);
    } catch {
      throw new Error('Error getting food by rating');
    }
  }

  async getFoodByFavorites(req: Request, res: Response): Promise<any> {
    try {
      const { favorites, type } = req.query;
      if (!type || typeof type !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid type parameter',
        });
      }
      let dishes;
      if (favorites) {
        const favoritesNumber = Number(favorites);
        if (isNaN(favoritesNumber)) {
          return res.status(400).json({ success: false, message: 'Favorites must be a number' });
        }
        dishes = await FoodService.getFoodByFavorites(favoritesNumber, type);
      } else {
        dishes = await FoodService.getTopFavoriteFoods(type);
      }

      if (!dishes || dishes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No food found matching the criteria',
          data: [],
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Food retrieved successfully',
        data: dishes,
      });
    } catch (error) {
      console.error('Error in getFoodByFavorites:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getFoodBest4(req: Request, res: Response): Promise<any> {
    try {
      const { category } = req.query;
      if (!category || typeof category !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid category parameter',
        });
      }

      const dishes = await FoodService.getFoodBest4(category);

      return res.status(200).json({
        success: true,
        message: 'Food retrieved successfully',
        data: dishes,
      });
    } catch (error) {
      console.error('Error in getFoodBest4:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async toggleFavorite(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = (req.user as IUser).id as Types.ObjectId;
      const { dishId } = req.body;

      console.log('User ID:', userId);
      console.log('Dish ID:', dishId);

      if (!dishId) {
        return res.status(400).json({ message: 'Dish ID is required' });
      }

      const updatedFood = await FoodService.toggleFavorite(dishId, userId);
      return res.status(200).json({ data: updatedFood });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getFavoriteFoods(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = (req.user as IUser).id as Types.ObjectId;
      const favoriteFoods = await FoodService.getFavoriteFoods(userId);
      if (!favoriteFoods || (Array.isArray(favoriteFoods) && favoriteFoods.length === 0)) {
        return res.status(200).json({
          message: 'Favorite foods retrieved successfully',
          data: favoriteFoods ?? [],
        });
      }
      return res
        .status(200)
        .json({ message: 'Favorite foods retrieved successfully', data: favoriteFoods });
    } catch (error) {
      console.error('Error getting favorite foods:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async countFoodView(req: Request, res: Response): Promise<any> {
    try {
      const foodId = req.params.foodId;
      const updatedFood = await FoodService.countFoodView(foodId);
      return res.status(200).json({ data: updatedFood });
    } catch (error) {
      console.error('Error counting food view:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async softDeleteDish(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.foodId;
      const deletedDish = await FoodService.softDeleteDish(id);
      return res.status(200).json({ message: 'Dish deleted successfully', data: deletedDish });
    } catch (error) {
      console.error('Error soft deleting dish:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getTrashFood(req: Request, res: Response): Promise<any> {
    try {
      const params = parseFoodQueryParams(req.query);

      const foods = await FoodService.getTrashFood(params);

      return res.status(200).json({
        success: true,
        message: 'All deleted food retrieved successfully',
        data: foods,
      });
    } catch (error: any) {
      console.error('Error in getTrashFood:', error);
      return res.status(500).json({
        success: false,
        message: 'Error getting deleted food',
        error: error.message,
      });
    }
  }

  async restoreFood(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.foodId;
      console.log('RestoreFood ID:', id);
      const restoredDish = await FoodService.restoreDish(id);
      return res.status(200).json({ message: 'Dish restored successfully', data: restoredDish });
    } catch (error) {
      console.error('Error restoring dish:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async permanentlyDeleteFood(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.foodId;
      const deletedDish = await FoodService.permanentlyDeleteDish(id);
      return res
        .status(200)
        .json({ message: 'Dish permanently deleted successfully', data: deletedDish });
    } catch (error: any) {
      console.error('Error permanently deleting dish:', error);
      return res.status(500).json({ message: error.message || 'Lỗi khi xoá món ăn vĩnh viễn' });
    }
  }

  async getDishIngredients(req: Request, res: Response): Promise<any> {
    try {
      const dishId = req.params.dishId;
      if (!mongoose.Types.ObjectId.isValid(dishId)) {
        return res.status(400).json({ message: 'Invalid dish ID' });
      }
      const ingredients = await FoodService.getDishIngredients(dishId);

      return res.status(200).json({
        success: true,
        message: 'Ingredient restored successfully',
        data: ingredients,
      });
    } catch (error) {
      console.error('Error getting dish ingredients:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async addDishIngredient(req: Request, res: Response): Promise<any> {
    try {
      const dishId = req.params.dishId;

      if (!mongoose.Types.ObjectId.isValid(dishId)) {
        return res.status(400).json({ message: 'Invalid dish ID' });
      }

      const ingredients = req.body;
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({ message: 'Body must be an array of ingredients.' });
      }

      for (const ing of ingredients) {
        const { ingredientId, quantity, unit } = ing;
        if (!ingredientId || quantity == null || !unit) {
          return res.status(400).json({ message: 'Missing fields in one or more ingredients.' });
        }
      }

      const addedIngredients = await FoodService.addManyDishIngredients(dishId, ingredients);

      return res.status(201).json({ data: addedIngredients });
    } catch (error) {
      console.error('Error adding dish ingredients:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateDishIngredient(req: Request, res: Response): Promise<any> {
    try {
      const dishId = req.params.dishId;
      const updates = req.body;

      if (!mongoose.Types.ObjectId.isValid(dishId)) {
        return res.status(400).json({ message: 'Invalid dish ID' });
      }

      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: 'Body must be an array of updates.' });
      }

      const results = await FoodService.updateManyDishIngredients(dishId, updates);

      return res.status(200).json({ data: results });
    } catch (error) {
      console.error('Error updating dish ingredients:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async deleteDishIngredient(req: Request, res: Response): Promise<any> {
    try {
      const dishId = req.params.dishId;
      const { ids } = req.body;

      if (!mongoose.Types.ObjectId.isValid(dishId)) {
        return res.status(400).json({ message: 'Invalid dish ID' });
      }

      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: 'ids must be an array.' });
      }

      const deleted = await FoodService.deleteManyDishIngredients(ids, dishId);

      return res.status(200).json({ data: deleted });
    } catch (error) {
      console.error('Error deleting dish ingredients:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
export default new FoodController();

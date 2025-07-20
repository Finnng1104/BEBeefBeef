import IngredientService from '../services/IngredientService';
import { Request, Response } from 'express';

class IngredientController {
  async getAllIngredients(req: Request, res: Response): Promise<any> {
    try {
      const params = {
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        unit: typeof req.query.unit === 'string' ? req.query.unit : undefined,
        group: typeof req.query.group === 'string' ? req.query.group : undefined,
        stockStatus:
          req.query.stockStatus === 'in_stock' ||
          req.query.stockStatus === 'out_of_stock' ||
          req.query.stockStatus === 'low_stock'
            ? (req.query.stockStatus as 'in_stock' | 'out_of_stock' | 'low_stock')
            : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 12,
        search: req.query.search?.toString() || '',
        sort: req.query.sort?.toString() || 'createdAt',
        isDeleted: req.query.isDeleted === 'true',
      };

      const ingredients = await IngredientService.getAllIngredients(params);
      return res.status(200).json({
        success: true,
        message: 'All ingredients retrieved successfully',
        data: ingredients,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async createIngredient(req: Request, res: Response): Promise<any> {
    try {
      const ingredient = await IngredientService.createIngredient(req.body);
      return res.status(201).json({
        success: true,
        message: 'Ingredient created successfully',
        data: ingredient,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getIngredientBySlug(req: Request, res: Response): Promise<any> {
    try {
      const slug = req.params.slug;
      const ingredient = await IngredientService.getIngredientBySlug(slug);
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }
      return res.status(200).json({
        success: true,
        message: 'All ingredients retrieved successfully',
        data: ingredient,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateIngredient(req: Request, res: Response): Promise<any> {
    try {
      const ingredientId = req.params.id;
      const ingredient = await IngredientService.updateIngredient(ingredientId, req.body);
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }
      return res.status(200).json({
        success: true,
        message: 'Ingredient updated successfully',
        data: ingredient,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async softDeleteIngredient(req: Request, res: Response): Promise<any> {
    try {
      const ingredientId = req.params.id;
      await IngredientService.softDeleteIngredient(ingredientId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getTrashIngredients(req: Request, res: Response): Promise<any> {
    try {
      const params = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        search: req.query.search?.toString() || '',
        sort: req.query.sort?.toString() || 'createdAt',
      };

      const ingredients = await IngredientService.getAllTrashIngredients(params);
      res.status(200).json({
        success: true,
        message: 'Trash ingredients retrieved successfully',
        data: ingredients,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async restoreIngredient(req: Request, res: Response): Promise<any> {
    try {
      const ingredientId = req.params.id;
      const ingredient = await IngredientService.restoreIngredient(ingredientId);
      if (!ingredient) {
        return res.status(404).json({ message: 'Ingredient not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Ingredient restored successfully',
        data: ingredient,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async permanentlyDeleteIngredient(req: Request, res: Response): Promise<any> {
    try {
      const ingredientId = req.params.id;
      await IngredientService.permanentlyDeleteIngredient(ingredientId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new IngredientController();

import { Request, Response } from 'express';
import CategoryService from '../services/CategoryService';
import Category from '../models/CategoryModel';
import PaginateService from '../services/PaginateService';
import { createCategorySchema } from '../validators/categoriesValidator';

class CategoryController {
  async GetAllCategory(req: Request, res: Response): Promise<void> {
    await CategoryService.GetAllCategory(req, res);
  }

  async AddCategory(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createCategorySchema.safeParse({
        Cate_name: req.body.Cate_name?.trim(),
        Cate_slug: req.body.Cate_slug?.trim(),
        Cate_type: req.body.Cate_type?.trim().toLowerCase(),
        parentCate: req.body.parentCate,
      });

      if (!parsed.success) {
        res.status(400).json({ message: parsed.error.errors[0].message });
        return;
      }

      const result = await CategoryService.AddCategory(req);
      res.status(201).json(result); // Chỉ gọi 1 lần
    } catch (error: any) {
      console.error('❌ Controller AddCategory Error:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  async GetCategoryById(req: Request, res: Response): Promise<void> {
    await CategoryService.GetCategoryById(req, res);
  }

  async UpdateCategory(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createCategorySchema.partial().safeParse({
        Cate_name: req.body.Cate_name?.trim(),
        Cate_slug: req.body.Cate_slug?.trim(),
        Cate_type: req.body.Cate_type?.trim().toLowerCase(),
        parentCate: req.body.parentCate,
      });

      if (!parsed.success) {
        res.status(400).json({ message: parsed.error.errors[0].message });
        return;
      }

      const result = await CategoryService.UpdateCategory(req);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ Controller UpdateCategory Error:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  }

  async DeleteCategory(req: Request, res: Response): Promise<void> {
    await CategoryService.DeleteCategory(req, res);
  }

  async PaginateCate(req: Request, res: Response): Promise<void> {
    await PaginateService.paginate(Category, req, res);
  }
}

export default new CategoryController();

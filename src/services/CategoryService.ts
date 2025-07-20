import Category from '../models/CategoryModel';
import { Request, Response } from 'express';
import { Model } from 'mongoose';
import { Dish } from '../models/DishModel';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
class CategoryService {
  async GetAllCategory(req: Request, res: Response): Promise<any> {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);

      const skip = (pageNumber - 1) * limitNumber;

      const totalCategories = await Category.countDocuments();

      const categories = await Category.find().skip(skip).limit(limitNumber);

      if (categories.length === 0) {
        return res.status(404).json({ message: 'No categories found!' });
      }

      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const foodCount = await Dish.countDocuments({
            categories: category._id,
            status: { $ne: 'hidden' },
            isDeleted: false,
          });
          return {
            ...category.toObject(),
            foodCount,
          };
        }),
      );

      return res.status(200).json({
        total: totalCategories,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCategories / limitNumber),
        data: categoriesWithCount, // dùng data mới
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'An error occurred', error });
    }
  }

  async AddCategory(req: Request): Promise<{ message: string }> {
    const { Cate_name, Cate_slug, Cate_type, parentCate } = req.body;
    const type = Cate_type?.trim().toLowerCase();

    if (!['dish', 'drink'].includes(type)) {
      throw new Error('Cate_type không hợp lệ!');
    }
    const existingCategory = await Category.findOne({ Cate_name });
    if (existingCategory) {
      throw new Error('Tên danh mục đã tồn tại!');
    }

    let imageUrl = '';
    if (req.file) {
      const streamUpload = () => {
        return new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'categories',
              resource_type: 'image',
            },
            (error, result) => {
              if (result) resolve(result.secure_url);
              else reject(error);
            },
          );
          if (req.file) {
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          } else {
            reject(new Error('Tệp không xác định'));
          }
        });
      };

      imageUrl = await streamUpload();
    }

    const newCategory = new Category({
      Cate_name,
      Cate_slug,
      Cate_type: type,
      Cate_img: imageUrl,
      parentCate,
    });

    await newCategory.save();
    return { message: 'Tạo thành công!' };
  }

  async GetCategoryById(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found!' });
      }

      return res.status(200).json(category);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error });
    }
  }
  async UpdateCategory(req: Request): Promise<{ message: string }> {
    const { id } = req.params;
    const { Cate_name, Cate_slug, Cate_type, parentCate } = req.body;

    const type = Cate_type?.trim().toLowerCase();
    if (!['dish', 'drink'].includes(type)) {
      throw new Error('Cate_type không hợp lệ!');
    }

    let imageUrl = '';
    if (req.file) {
      const streamUpload = () => {
        return new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'categories',
              resource_type: 'image',
            },
            (error, result) => {
              if (result) resolve(result.secure_url);
              else reject(error);
            },
          );
          if (req.file) {
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          } else {
            reject(new Error('File is undefined'));
          }
        });
      };
      imageUrl = await streamUpload();
    }

    const updatedData: any = {
      Cate_name,
      Cate_slug,
      Cate_type: type,
      parentCate,
    };

    if (imageUrl) {
      updatedData.Cate_img = imageUrl;
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory) {
      throw new Error('Không tìm thấy danh mục để cập nhật');
    }

    return { message: 'Cập nhật danh mục thành công!' };
  }

  async DeleteCategory(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      const hasSub = await Category.findOne({ parentCate: id });
      if (hasSub) {
        return res.status(400).json({ message: 'Không thể xoá danh mục đang có danh mục con!' });
      }

      const hasFood = await Dish.findOne({ categories: id });
      if (hasFood) {
        return res.status(400).json({ message: 'Không thể xoá danh mục đang có món ăn!' });
      }

      const deleted = await Category.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Danh mục không tồn tại!' });
      }

      return res.status(200).json({ message: 'Đã xoá danh mục thành công!' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi xoá danh mục', error });
    }
  }

  async sortData(
    model: Model<any>,
    fieldName: string,
    order: 'asc' | 'desc' = 'asc',
  ): Promise<any> {
    const sortOrder = order === 'asc' ? 1 : -1;
    const data = await model.find().sort({ [fieldName]: sortOrder });

    return data;
  }
}

export default new CategoryService();

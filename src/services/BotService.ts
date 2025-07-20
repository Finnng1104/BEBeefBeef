import { Dish } from '../models/DishModel';
import Category from '../models/CategoryModel';
import mongoose from 'mongoose';

interface DishInfo {
  _id: string;
  name: string;
  price: number;
  discount_price?: number;
  description: string;
  images: string[];
  slug: string;
  categories: any[];
  isDishNew?: boolean;
  isRecommend?: boolean;
}

class BotService {
  // Tìm món ăn theo tên hoặc từ khóa
  async findDishesByKeyword(keyword: string): Promise<DishInfo[]> {
    try {
      const searchRegex = new RegExp(keyword, 'i');

      const dishes = await Dish.find({
        $or: [{ name: searchRegex }, { description: searchRegex }, { ingredients: searchRegex }],
        status: 'available',
        isDeleted: false,
      })
        .populate('categories', 'Cate_name Cate_slug')
        .limit(5)
        .lean();

      return dishes.map((dish) => ({
        _id: dish._id.toString(),
        name: dish.name,
        price: dish.price,
        discount_price: dish.discount_price,
        description: dish.description,
        images: dish.images || [],
        slug: dish.slug,
        categories: dish.categories,
        isDishNew: dish.isDishNew,
        isRecommend: dish.isRecommend,
      }));
    } catch (error) {
      console.error('Error finding dishes:', error);
      return [];
    }
  }

  // Lấy món ăn theo danh mục
  async getDishesByCategory(categoryName: string): Promise<DishInfo[]> {
    try {
      const category = await Category.findOne({
        Cate_name: { $regex: categoryName, $options: 'i' },
      });

      if (!category) return [];

      const dishes = await Dish.find({
        categories: category._id,
        status: 'available',
        isDeleted: false,
      })
        .populate('categories', 'Cate_name Cate_slug')
        .limit(5)
        .lean();

      return dishes.map((dish) => ({
        _id: dish._id.toString(),
        name: dish.name,
        price: dish.price,
        discount_price: dish.discount_price,
        description: dish.description,
        images: dish.images || [],
        slug: dish.slug,
        categories: dish.categories,
        isDishNew: dish.isDishNew,
        isRecommend: dish.isRecommend,
      }));
    } catch (error) {
      console.error('Error getting dishes by category:', error);
      return [];
    }
  }

  // Lấy món ăn nổi bật
  async getFeaturedDishes(): Promise<DishInfo[]> {
    try {
      const dishes = await Dish.find({
        $or: [{ isRecommend: true }, { isDishNew: true }],
        status: 'available',
        isDeleted: false,
      })
        .populate('categories', 'Cate_name Cate_slug')
        .limit(6)
        .lean();

      return dishes.map((dish) => ({
        _id: dish._id.toString(),
        name: dish.name,
        price: dish.price,
        discount_price: dish.discount_price,
        description: dish.description,
        images: dish.images || [],
        slug: dish.slug,
        categories: dish.categories,
        isDishNew: dish.isDishNew,
        isRecommend: dish.isRecommend,
      }));
    } catch (error) {
      console.error('Error getting featured dishes:', error);
      return [];
    }
  }

  // Lấy món ăn theo giá
  async getDishesByPriceRange(minPrice: number, maxPrice: number): Promise<DishInfo[]> {
    try {
      const dishes = await Dish.find({
        price: { $gte: minPrice, $lte: maxPrice },
        status: 'available',
        isDeleted: false,
      })
        .populate('categories', 'Cate_name Cate_slug')
        .limit(5)
        .lean();

      return dishes.map((dish) => ({
        _id: dish._id.toString(),
        name: dish.name,
        price: dish.price,
        discount_price: dish.discount_price,
        description: dish.description,
        images: dish.images || [],
        slug: dish.slug,
        categories: dish.categories,
        isDishNew: dish.isDishNew,
        isRecommend: dish.isRecommend,
      }));
    } catch (error) {
      console.error('Error getting dishes by price range:', error);
      return [];
    }
  }

  // Tạo link đến trang chi tiết món ăn
  createDishLink(slug: string): string {
    return `https://beefbeef.vn/menu/${slug}`;
  }

  // Format giá tiền
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  // Tạo message với hình ảnh món ăn
  createDishMessage(dish: DishInfo): { content: string; attachments: string[] } {
    const priceText = dish.discount_price
      ? `~~${this.formatPrice(dish.price)}~~ **${this.formatPrice(dish.discount_price)}**`
      : this.formatPrice(dish.price);

    const badges = [];
    if (dish.isDishNew) badges.push('🆕 Món mới');
    if (dish.isRecommend) badges.push('⭐ Khuyến nghị');

    const badgeText = badges.length > 0 ? `\n${badges.join(' | ')}` : '';

    const content = `🍽️ **${dish.name}**${badgeText}
💰 Giá: ${priceText}
📝 ${dish.description}
🔗 Xem chi tiết: ${this.createDishLink(dish.slug)}`;

    return {
      content,
      attachments: dish.images || [],
    };
  }

  // Tạo message giới thiệu nhiều món ăn
  createDishesListMessage(
    dishes: DishInfo[],
    title: string,
  ): { content: string; attachments: string[] } {
    if (dishes.length === 0) {
      return {
        content: 'Xin lỗi, hiện tại chưa có món ăn nào phù hợp với yêu cầu của bạn.',
        attachments: [],
      };
    }

    let content = `🍽️ **${title}**\n\n`;
    const allImages: string[] = [];

    dishes.forEach((dish, index) => {
      const priceText = dish.discount_price
        ? `~~${this.formatPrice(dish.price)}~~ **${this.formatPrice(dish.discount_price)}**`
        : this.formatPrice(dish.price);

      const badges = [];
      if (dish.isDishNew) badges.push('🆕');
      if (dish.isRecommend) badges.push('⭐');

      const badgeText = badges.length > 0 ? ` ${badges.join('')}` : '';

      content += `${index + 1}. **${dish.name}**${badgeText}
   💰 ${priceText}
   🔗 ${this.createDishLink(dish.slug)}\n\n`;

      // Thêm hình ảnh đầu tiên của mỗi món
      if (dish.images && dish.images.length > 0) {
        allImages.push(dish.images[0]);
      }
    });

    content += '💡 *Bạn có thể click vào link để xem chi tiết và đặt món!*';

    return {
      content,
      attachments: allImages,
    };
  }
}

export default new BotService();

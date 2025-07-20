import { Request } from 'express';
import Banner, { IBanner } from '../models/BannerModel';
import UploadImageService from './UploadImageService';

class BannerService {
  async getActiveBanners(): Promise<IBanner[]> {
    const now = new Date();
    return await Banner.find({
      status: 'active',
      $and: [
        { $or: [{ start_date: { $exists: false } }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: { $exists: false } }, { end_date: { $gt: now } }] },
      ],
    }).sort({ order: 1 });
  }

  // Hàm kiểm tra và cập nhật trạng thái banner dựa trên end_date
  private async checkAndUpdateBannerStatus(): Promise<void> {
    const now = new Date();

    // Cập nhật banner thành active nếu đến ngày bắt đầu
    await Banner.updateMany(
      {
        status: 'inactive',
        start_date: { $lte: now },
        $or: [{ end_date: { $exists: false } }, { end_date: { $gt: now } }],
      },
      {
        $set: { status: 'active' },
      },
    );

    // Cập nhật banner thành inactive nếu đến ngày kết thúc
    await Banner.updateMany(
      {
        status: 'active',
        end_date: { $lte: now },
      },
      {
        $set: { status: 'inactive' },
      },
    );
  }

  // Hàm điều chỉnh thứ tự banner khi tạo mới
  private async adjustBannerOrderForCreate(order: number): Promise<void> {
    // Tìm banner có order hiện tại hoặc lớn hơn
    const existingBanners = await Banner.find({ order: { $gte: order } }).sort({ order: 1 });

    if (existingBanners.length > 0) {
      // Nếu có banner có thứ tự >= order mới,
      // tăng order của tất cả các banner này lên 1
      await Banner.updateMany({ order: { $gte: order } }, { $inc: { order: 1 } });
    }
  }

  // Hàm điều chỉnh thứ tự banner khi cập nhật
  private async adjustBannerOrderForUpdate(
    oldOrder: number,
    newOrder: number,
    bannerId: string,
  ): Promise<void> {
    if (oldOrder === newOrder) return;

    // Nếu tăng order (ví dụ: 2 -> 4)
    if (newOrder > oldOrder) {
      // Giảm order của các banner ở giữa và banner ở newOrder
      await Banner.updateMany(
        { order: { $gt: oldOrder, $lte: newOrder }, _id: { $ne: bannerId } },
        { $inc: { order: -1 } },
      );
    }
    // Nếu giảm order (ví dụ: 4 -> 1)
    else {
      // Tăng order của tất cả banner có order >= newOrder và < oldOrder
      await Banner.updateMany(
        { order: { $gte: newOrder, $lt: oldOrder }, _id: { $ne: bannerId } },
        { $inc: { order: 1 } },
      );
    }
  }

  async createBanner(req: Request): Promise<IBanner> {
    try {
      if (!req.file) {
        throw new Error('Vui lòng tải lên hình ảnh');
      }

      if (!req.body.title) {
        throw new Error('Vui lòng nhập tiêu đề banner');
      }

      const order = parseInt(req.body.order) || 1;

      // Điều chỉnh thứ tự các banner khác
      await this.adjustBannerOrderForCreate(order);

      const { url } = await UploadImageService.UploadImage(req.file, 'banners');

      const bannerData: Partial<IBanner> = {
        title: req.body.title,
        description: req.body.description || '',
        image: url,
        order,
        status: req.body.status || 'active',
      };

      // Xử lý start_date
      if (req.body.start_date === 'null') {
        bannerData.start_date = undefined;
      } else if (req.body.start_date) {
        bannerData.start_date = new Date(req.body.start_date);
      }

      // Xử lý end_date
      if (req.body.end_date === 'null') {
        bannerData.end_date = undefined;
      } else if (req.body.end_date) {
        bannerData.end_date = new Date(req.body.end_date);
      }

      const banner = new Banner(bannerData as IBanner);
      const savedBanner = await banner.save();
      return savedBanner;
    } catch (error) {
      console.error('Error creating banner:', error);
      throw error;
    }
  }

  async getAllBanners(): Promise<IBanner[]> {
    // Kiểm tra và cập nhật trạng thái trước khi lấy danh sách
    await this.checkAndUpdateBannerStatus();
    return await Banner.find().sort({ order: 1 });
  }

  async getBannerById(id: string): Promise<IBanner | null> {
    return await Banner.findById(id);
  }

  async updateBanner(id: string, req: Request): Promise<IBanner | null> {
    try {
      if (!req.body.title) {
        throw new Error('Vui lòng nhập tiêu đề banner');
      }

      const order = parseInt(req.body.order) || 1;
      const oldBanner = await Banner.findById(id);

      if (!oldBanner) {
        throw new Error('Không tìm thấy banner');
      }

      // Điều chỉnh thứ tự các banner khác
      await this.adjustBannerOrderForUpdate(oldBanner.order, order, id);

      const updateData: any = {
        title: req.body.title,
        description: req.body.description || '',
        order,
        status: req.body.status || oldBanner.status,
      };

      // Xử lý start_date và status
      if (req.body.status === 'inactive' && oldBanner.status === 'active') {
        // Nếu chuyển từ active sang inactive, xóa start_date
        if (updateData.$unset) {
          updateData.$unset.start_date = 1;
        } else {
          updateData.$unset = { start_date: 1 };
        }
      } else {
        // Xử lý start_date bình thường nếu không phải chuyển từ active sang inactive
        if (req.body.start_date === 'null') {
          if (updateData.$unset) {
            updateData.$unset.start_date = 1;
          } else {
            updateData.$unset = { start_date: 1 };
          }
        } else if (req.body.start_date) {
          updateData.start_date = new Date(req.body.start_date);
        }
      }

      // Xử lý end_date và status
      if (req.body.status === 'active' && oldBanner.status === 'inactive') {
        // Nếu chuyển từ inactive sang active, xóa end_date
        if (updateData.$unset) {
          updateData.$unset.end_date = 1;
        } else {
          updateData.$unset = { end_date: 1 };
        }
      } else {
        // Xử lý end_date bình thường nếu không phải chuyển từ inactive sang active
        if (req.body.end_date === 'null') {
          if (updateData.$unset) {
            updateData.$unset.end_date = 1;
          } else {
            updateData.$unset = { end_date: 1 };
          }
        } else if (req.body.end_date) {
          updateData.end_date = new Date(req.body.end_date);
        }
      }

      if (req.file) {
        if (oldBanner.image) {
          const publicId = UploadImageService.extractPublicIdFromUrl(oldBanner.image);
          if (publicId) {
            await UploadImageService.DeleteImage(publicId);
          }
        }

        const { url } = await UploadImageService.UploadImage(req.file, 'banners');
        updateData.image = url;
      }

      const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedBanner) {
        throw new Error('Không tìm thấy banner');
      }
      return updatedBanner;
    } catch (error) {
      console.error('Error updating banner:', error);
      throw error;
    }
  }

  async deleteBanner(id: string): Promise<IBanner | null> {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new Error('Không tìm thấy banner');
      }

      if (banner.image) {
        const publicId = UploadImageService.extractPublicIdFromUrl(banner.image);
        if (publicId) {
          await UploadImageService.DeleteImage(publicId);
        }
      }

      // Điều chỉnh thứ tự các banner sau khi xóa
      await Banner.updateMany({ order: { $gt: banner.order } }, { $inc: { order: -1 } });

      return await Banner.findByIdAndDelete(id);
    } catch (error) {
      console.error('Error deleting banner:', error);
      throw error;
    }
  }
}

export default new BannerService();

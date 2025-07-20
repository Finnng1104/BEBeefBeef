import { Request, Response } from 'express';
import BannerService from '../services/BannerService';

class BannerController {
  async getActiveBanners(req: Request, res: Response): Promise<void> {
    try {
      const banners = await BannerService.getActiveBanners();
      res.status(200).json({
        success: true,
        data: banners,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching active banners',
      });
    }
  }

  async createBanner(req: Request, res: Response): Promise<void> {
    try {
      const banner = await BannerService.createBanner(req);
      res.status(201).json({
        success: true,
        message: 'Banner created successfully',
        data: banner,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating banner',
      });
    }
  }

  async getAllBanners(req: Request, res: Response): Promise<void> {
    try {
      const banners = await BannerService.getAllBanners();
      res.status(200).json({
        success: true,
        data: banners,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching banners',
      });
    }
  }

  async getBannerById(req: Request, res: Response): Promise<void> {
    try {
      const banner = await BannerService.getBannerById(req.params.id);
      if (!banner) {
        res.status(404).json({
          success: false,
          message: 'Banner not found',
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: banner,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching banner',
      });
    }
  }

  async updateBanner(req: Request, res: Response): Promise<void> {
    try {
      const banner = await BannerService.updateBanner(req.params.id, req);
      if (!banner) {
        res.status(404).json({
          success: false,
          message: 'Banner not found',
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'Banner updated successfully',
        data: banner,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating banner',
      });
    }
  }

  async deleteBanner(req: Request, res: Response): Promise<void> {
    try {
      const banner = await BannerService.deleteBanner(req.params.id);
      if (!banner) {
        res.status(404).json({
          success: false,
          message: 'Banner not found',
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'Banner deleted successfully',
        data: banner,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting banner',
      });
    }
  }
}

export default new BannerController();

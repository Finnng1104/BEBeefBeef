import express from 'express';
import upload from '../middleware/UploadMiddleWare';
import BannerController from '../controller/BannerController';

const router = express.Router();

// Get active banners
router.get('/getActiveBanners', BannerController.getActiveBanners);

// Create a new banner
router.post('/createBanner', upload.single('image'), BannerController.createBanner);

// Get all banners
router.get('/getAllBanners', BannerController.getAllBanners);

// Get banner by ID
router.get('/getBannerById/:id', BannerController.getBannerById);

// Update banner
router.put('/updateBanner/:id', upload.single('image'), BannerController.updateBanner);

// Delete banner
router.delete('/deleteBanner/:id', BannerController.deleteBanner);

export default router;

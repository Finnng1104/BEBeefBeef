import { Router } from 'express';
import ProfileController from '../controller/ProfileController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';
const router = Router();
router.get('/getProfile/:_id', AuthMiddleWare.verifyToken, ProfileController.getUserProfile);
router.put('/updateProfile/:_id', AuthMiddleWare.verifyToken, ProfileController.updateUserProfile);
router.put(
  '/changePasswordProfile/:_id',
  AuthMiddleWare.verifyToken,
  ProfileController.changePasswordProfile,
);
export default router;

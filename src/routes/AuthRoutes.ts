import { Router } from 'express';
import AuthController from '../controller/AuthController';
import GoogleAuthMiddleWare from '../middleware/GoogleAuthMiddleWare';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { validateRequest } from '../middleware/ValidateRequest';
import AuthMiddleWare from '../middleware/AuthMiddleWare';
import { changePasswordSchema } from '../validators/changePwProfileValidator';
const router = Router();
router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/refresh-token', AuthMiddleWare.verifyRefreshToken, AuthController.refreshAccessToken);
router.get('/google/callback', AuthController.googleCallback);
router.post('/google-login', GoogleAuthMiddleWare.verifyGoogleToken, AuthController.googleLogin);
router.post('/logout', AuthController.Logout);
router.post('/verify-otpEmail', AuthController.verifyOtpEmail); //2
router.post('/forgot-password', AuthController.forgotPasswordHandler); //1
router.post('/change-password', AuthController.changePassword);
router.post('/resend-verification', AuthController.resendVerificationEmail);
router.post('/verify-resend-otpEmail', AuthController.verifyResendOtpEmail);
router.put(
  '/change-password-profile',
  validateRequest(changePasswordSchema),
  AuthMiddleWare.verifyToken,
  AuthController.changePasswordProfile,
);
export default router;

import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService';
import { IUser } from '../models/UserModel';
import { Types } from 'mongoose';

class AuthController {
  async register(req: Request, res: Response): Promise<any> {
    try {
      const { username, email, password } = req.body;
      const user = await AuthService.register({
        username,
        email,
        password,
      });
      return res.status(201).json({
        message: 'User created successfully! Please check your email to verify your account.',
        user,
      });
    } catch (error: any) {
      console.error('Error during user registration:', error);
      res.status(400).json({ message: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<any> {
    try {
      const { email, password, rememberMe } = req.body;

      const { token, refresh_token, user, isBirthday, refreshTokenExpiresIn } =
        await AuthService.login({ email, password, rememberMe }, req);

      res.cookie('refreshToken', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        ...(rememberMe ? { maxAge: refreshTokenExpiresIn * 1000 } : {}),
      });

      console.log('Login refreshTokenExpiresIn:', refreshTokenExpiresIn);

      res.status(200).json({
        message: 'User logged in successfully',
        user,
        isBirthday,
        accessToken: token,
        refreshToken: refresh_token, // for testing
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async refreshAccessToken(req: Request, res: Response): Promise<any> {
    try {
      const { refreshToken } = req.cookies;
      const { newAccessToken, newRefreshToken } = await AuthService.refreshAccessToken(
        refreshToken,
        req,
      );

      res.cookie('accessToken', newAccessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 60 * 60 * 1000,
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 21 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ accessToken: newAccessToken });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async googleLogin(req: Request, res: Response): Promise<any> {
    try {
      const googleUser = req.body.googleUser;
      const rememberMe = req.body.rememberMe;

      if (!googleUser) {
        return res.status(400).json({ message: 'Google user data is missing' });
      }

      const { email, name, avatar, sub } = googleUser;

      const { user, accessToken, refreshToken, refreshTokenExpiresIn } =
        await AuthService.googleLogin(
          {
            id: sub,
            email,
            googleId: sub,
            username: name,
            avatar,
            rememberMe,
          },
          req,
        );

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: refreshTokenExpiresIn * 1000,
      });

      console.log('Google login refreshTokenExpiresIn:', refreshTokenExpiresIn);

      return res.status(200).json({
        message: 'Google login successful',
        user,
        accessToken,
        refreshToken, // for testing
      });
    } catch (error: any) {
      return res.status(400).json({
        message: 'Error during Google login',
        error: error.message,
      });
    }
  }

  async googleCallback(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { code } = req.query;
      if (!code) {
        return res.status(400).json({ message: 'No code provided' });
      }
      const result = await AuthService.handleGoogleCallBack(code as string);
      res.status(200).json({
        message: 'Google login successful',
        token: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }

  async Logout(req: Request, res: Response): Promise<any> {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return res.status(400).json({ message: 'No refresh token provided' });
      }

      await AuthService.logout(refreshToken);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      });

      res.status(200).json({ message: 'Logout successful' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async forgotPasswordHandler(req: Request, res: Response): Promise<any> {
    const { phone, email } = req.body;

    if (!phone && !email) {
      return res.status(400).json({ message: 'Vui lòng nhập số điện thoại hoặc email' });
    }

    let identifier = '';

    if (phone && email) {
      return res.status(400).json({
        message: 'Vui lòng chỉ nhập số điện thoại HOẶC email, không nhập cả hai',
      });
    }
    if (phone) {
      const phoneRegex = /^(?:\+84|0)(3|5|7|8|9)\d{8}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: 'Định dạng số điện thoại không hợp lệ' });
      }
      identifier = phone;
    }
    if (email) {
      const emailRegex =
        /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-])*[a-zA-Z0-9]@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Định dạng email không hợp lệ' });
      }
      identifier = email;
    }

    try {
      await AuthService.sendOtpFlexible(identifier);
      return res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
      throw new Error('Gửi OTP qua SMS thất bại, vui lòng thử lại');
    }
  }

  async changePassword(req: Request, res: Response): Promise<any> {
    try {
      const { email, newPassword, confirmPassword } = req.body;

      if (!email || !newPassword || !confirmPassword) {
        return res.status(400).json({
          message: 'Email, new password, and confirm password are required',
        });
      }

      const emailRegex =
        /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-])*[a-zA-Z0-9]@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      const result = await AuthService.changePasswordByEmail(email, newPassword);
      return res.status(200).json(result); // { message: "..."}
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async verifyOtpEmail(req: Request, res: Response): Promise<any> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
      }

      const emailRegex =
        /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-])*[a-zA-Z0-9]@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: 'OTP must be a 6-digit number' });
      }

      const message = await AuthService.verifyForgotPasswordOtp(email, otp);
      return res.status(200).json({ message });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async resendVerificationEmail(req: Request, res: Response): Promise<any> {
    try {
      const { email } = req.body;
      if (email) {
        const emailRegex =
          /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-])*[a-zA-Z0-9]@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: 'Định dạng email không hợp lệ' });
        }
      }

      const response = await AuthService.resendVerificationEmail(email);
      return res.status(200).json({ message: response });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async verifyResendOtpEmail(req: Request, res: Response): Promise<any> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: 'Email và mã OTP là bắt buộc' });
      }

      const emailRegex =
        /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-])*[a-zA-Z0-9]@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Định dạng email không hợp lệ' });
      }

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: 'OTP phải gồm 6 chữ số' });
      }

      const message = await AuthService.verifyEmailVerificationOtp(email, otp);
      return res.status(200).json({ message });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
  changePasswordProfile = async (req: Request, res: Response): Promise<any> => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = (req.user as IUser).id as Types.ObjectId;

      const result = await AuthService.changePasswordProfile(
        userId.toString(),
        oldPassword,
        newPassword,
      );
      console.log('🔐 req.user:', req.user);
      return res.status(200).json({ message: result });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  };
}

export default new AuthController();

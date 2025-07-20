import bcrypt from 'bcrypt';
import { accessToken, refreshToken } from './GenerateToken';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import sendOtpToPhoneNumber from '../utils/smsService';
import User from '../models/UserModel';
import Roles from '../models/RoleModel';
import RefreshToken from '../models/RefreshToken';
import { GoogleUser } from '../types/auth.types';
import Role from '../models/RoleModel';
import { ObjectId } from 'mongoose';

dotenv.config();

class AuthService {
  async handleGoogleCallBack(code: string): Promise<any> {
    try {
      const clientId = process.env.GG_CLIENT_ID || '';
      const clientSecret = process.env.GG_CLIENT_SECRET || '';
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
      const { access_token, id_token } = tokenResponse.data as {
        access_token: string;
        id_token: string;
      };
      console.log('id_token:', id_token);

      const userProfileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      const user = userProfileResponse.data as {
        id: string;
        email: string;
        name: string;
        picture: string;
      };
      let existingUser = await User.findOne({ email: user.email });
      if (!existingUser) {
        existingUser = new User({
          email: user.email,
          username: user.name,
          avatar: user.picture,
          googleId: user.id,
        });
        await existingUser.save();
      }
      return {
        user: existingUser,
        accessToken: access_token,
      };
    } catch (error) {
      console.error('Error during Google OAuth callback:', error);
      throw error;
    }
  }

  async register(userData: { username: string; email: string; password: string }) {
    const { username, email, password } = userData;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email đã tồn tại trong hệ thống');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultRole = await Roles.findOne({ name: 'user' });
    if (!defaultRole) {
      throw new Error('Default role not found');
    }
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      roles: [defaultRole._id],
      isEmailVerified: false,
      emailVerificationToken: crypto.randomBytes(32).toString('hex'),
      emailVerificationExpires: new Date(Date.now() + 3600000), // 1h
    });

    await newUser.save();

    await this.resendVerificationEmail(email);

    const populatedUser = await User.findById(newUser._id).populate('roles', 'name');

    return populatedUser;
  }

  async login(loginUser: { email: string; password: string; rememberMe: boolean }, req: any) {
    const { email, password, rememberMe } = loginUser;

    const user = await User.findOne({ email }).populate('roles', 'name');
    if (!user) {
      throw new Error('Email not registered');
    }
    if (user.status === 'block') {
      throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      throw new Error('Mật khẩu không đúng');
    }

    let isBirthday = false;
    if (user.birthday) {
      const today = new Date();
      const birthday = new Date(user.birthday);
      isBirthday =
        today.getDate() === birthday.getDate() && today.getMonth() === birthday.getMonth();
    }

    const accessTokenExpiresIn = rememberMe ? 60 * 60 * 2 : 60 * 60;
    const refreshTokenExpiresIn = rememberMe ? 21 * 24 * 60 * 60 : 2 * 24 * 60 * 60;

    const token = accessToken(
      { id: user._id, roles: user.roles },
      process.env.ACCESS_TOKEN ?? '',
      accessTokenExpiresIn,
    );

    const refresh_token = refreshToken(
      { id: user._id, roles: user.roles },
      process.env.REFRESH_TOKEN || '',
      refreshTokenExpiresIn,
    );

    await RefreshToken.create({
      token: refresh_token,
      userId: user._id,
      expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
    });

    return { token, refresh_token, user, isBirthday, refreshTokenExpiresIn };
  }

  async refreshAccessToken(refreshTokenFromClient: string, req: any) {
    try {
      if (!refreshTokenFromClient) {
        throw new Error('No refresh token provided');
      }

      const oldToken = await RefreshToken.findOne({ token: refreshTokenFromClient });
      if (!oldToken || oldToken.isRevoked) {
        throw new Error('Refresh token is invalid or revoked');
      }

      const decode: any = jwt.verify(refreshTokenFromClient, process.env.REFRESH_TOKEN || '');
      const user = await User.findById(decode.id);
      if (!user) throw new Error('User not found');

      oldToken.isRevoked = true;

      const now = new Date();
      const remainingMs = Math.max(oldToken.expiresAt.getTime() - now.getTime(), 0);
      const remainingSeconds = Math.floor(remainingMs / 1000);

      // Nếu thời gian còn lại quá ít (< 1h), cấp lại full thời hạn (có thể tùy chỉnh logic)
      const newRefreshTokenExpiresIn = remainingSeconds > 3600 ? remainingSeconds : 48 * 60 * 60;

      const newAccessToken = accessToken(
        { id: user._id, roles: user.roles },
        process.env.ACCESS_TOKEN || '',
        60 * 60,
      );

      const newRefreshToken = refreshToken(
        { id: user._id, roles: user.roles },
        process.env.REFRESH_TOKEN || '',
        newRefreshTokenExpiresIn,
      );

      oldToken.replacedByToken = newRefreshToken;
      await oldToken.save();

      await RefreshToken.create({
        token: newRefreshToken,
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        expiresAt: new Date(Date.now() + newRefreshTokenExpiresIn * 1000),
      });

      return { newAccessToken, newRefreshToken };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async googleLogin(googleUser: GoogleUser & { rememberMe: boolean }, req: any) {
    try {
      const { email, googleId, username, avatar, rememberMe } = googleUser;

      let user = await User.findOne({ email });

      const userRole = await Role.findOne({ name: 'user' });
      if (!userRole) {
        throw new Error('Role "user" không tồn tại trong hệ thống.');
      }

      if (!user) {
        user = new User({
          email,
          username: username || '',
          avatar: avatar || '',
          googleId,
          roles: [userRole._id],
        });
        await user.save();
      } else if (!user.roles || user.roles.length === 0) {
        user.roles = [userRole._id as ObjectId];
        await user.save();
      }

      const accessTokenExpiresIn = rememberMe ? 60 * 60 * 2 : 60 * 60;
      const refreshTokenExpiresIn = rememberMe ? 21 * 24 * 60 * 60 : 2 * 24 * 60 * 60;

      const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN || '', {
        expiresIn: accessTokenExpiresIn,
      });

      const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN || '', {
        expiresIn: refreshTokenExpiresIn,
      });

      await RefreshToken.create({
        token: refreshToken,
        userId: user._id,
        expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
        userAgent: req?.get?.('User-Agent') || 'unknown',
        ipAddress: req?.ip || 'unknown',
      });

      return {
        user,
        accessToken,
        refreshToken,
        refreshTokenExpiresIn,
      };
    } catch (error: any) {
      throw new Error('Error during Google login: ' + error.message);
    }
  }

  async logout(refreshToken: string) {
    try {
      if (!refreshToken) {
        throw new Error('No refresh token provided');
      }

      const existingToken = await RefreshToken.findOne({ token: refreshToken });
      if (!existingToken) {
        throw new Error('Refresh token not found');
      }

      existingToken.isRevoked = true;
      await existingToken.save();

      return { message: 'Logout successful' };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async changePasswordByEmail(email: string, newPassword: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.otpVerifiedForChangePassword) {
      throw new Error('You must verify OTP before changing password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Sau khi đổi mật khẩu xong → hủy flag
    user.otpVerifiedForChangePassword = false;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async verifyForgotPasswordOtp(email: string, otp: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    if (user.changePasswordOtp?.trim() !== otp.trim()) {
      throw new Error('Invalid OTP');
    }
    if (!user.changePasswordOtpExpiry || user.changePasswordOtpExpiry < new Date()) {
      throw new Error('OTP expired');
    }

    user.changePasswordOtp = null;
    user.changePasswordOtpExpiry = null;
    user.otpVerifiedForChangePassword = true;
    await user.save();

    return 'OTP verified. You can now reset your password.';
  }

  async sendOtpFlexible(identifier: string): Promise<{ message: string }> {
    try {
      let user;
      const otp = crypto.randomInt(100000, 999999).toString();
      const expireAt = new Date(Date.now() + 1 * 60 * 1000); // 1 phút

      const phoneRegex = /^(\+84|0)(3|5|7|8|9)\d{8}$/;
      const emailRegex =
        /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-])*[a-zA-Z0-9]@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;

      if (phoneRegex.test(identifier)) {
        user = await User.findOne({ phone: identifier });
        if (!user) {
          throw new Error('Số điện thoại không tồn tại trong hệ thống');
        }

        user.phoneOtp = otp;
        user.phoneOtpExpiry = expireAt;
        await user.save();
        await sendOtpToPhoneNumber.sendOtpToPhoneNumber(identifier, otp);
        return { message: 'OTP đã được gửi qua số điện thoại' };
      } else if (emailRegex.test(identifier)) {
        user = await User.findOne({ email: identifier });
        if (!user) {
          throw new Error('Email không tồn tại trong hệ thống');
        }

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        if (user.otpSentCount >= 5 && user.lastOtpSentAt > oneHourAgo) {
          throw new Error('Bạn đã vượt quá số lần gửi OTP. Vui lòng thử lại sau');
        }

        user.changePasswordOtp = otp;
        user.changePasswordOtpExpiry = expireAt;
        user.otpSentCount += 1;
        user.lastOtpSentAt = now;
        await user.save();

        const transporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: Number(process.env.MAIL_PORT),
          secure: process.env.MAIL_ENCRYPTION === 'ssl',
          auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD,
          },
        });

        const mailOptions = {
          from: process.env.MAIL_FROM_ADDRESS,
          to: identifier,
          subject: 'Xác minh OTP',
          text: `Mã OTP của bạn là ${otp}. Sẽ hết hạn trong 1 phút.`,
        };

        await transporter.sendMail(mailOptions);
        return { message: 'OTP đã được gửi qua email' };
      } else {
        throw new Error('Số điện thoại hoặc email không hợp lệ');
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async resendVerificationEmail(email: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // 1 phút

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (user.otpSentCount >= 5 && user.lastOtpSentAt > oneHourAgo) {
      throw new Error('You have exceeded the OTP request limit. Please try again later.');
    }

    user.emailVerificationOtp = otp;
    user.emailVerificationOtpExpiry = otpExpiry;
    user.otpSentCount += 1;
    user.lastOtpSentAt = now;
    await user.save();

    setTimeout(
      async () => {
        const resetUser = await User.findOne({ email });
        if (resetUser) {
          resetUser.otpSentCount = 0;
          await resetUser.save();
        }
      },
      30 * 60 * 1000,
    );

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: process.env.MAIL_ENCRYPTION === 'ssl',
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.MAIL_FROM_ADDRESS,
      to: email,
      subject: 'Verify Your Email Address',
      text: `Your verification OTP is ${otp}. It will expire in 1 minute.`,
    };

    await transporter.sendMail(mailOptions);
    return 'Verification email sent successfully';
  }

  async verifyEmailVerificationOtp(email: string, otp: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) throw new Error('Không tìm thấy người dùng');

    if (user.isEmailVerified) {
      return 'Email đã được xác minh trước đó';
    }

    if (user.emailVerificationOtp !== otp) {
      throw new Error('Mã OTP không đúng');
    }

    if (!user.emailVerificationOtpExpiry || user.emailVerificationOtpExpiry < new Date()) {
      throw new Error('OTP đã hết hạn');
    }

    user.isEmailVerified = true;
    user.emailVerificationOtp = null;
    user.emailVerificationOtpExpiry = null;
    await user.save();

    return 'Xác minh email thành công';
  }
  changePasswordProfile = async (
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<string> => {
    const user = await User.findById(userId);
    if (!user) throw new Error('Người dùng không tồn tại');

    const isMatch = await bcrypt.compare(oldPassword, user.password || '');
    if (!isMatch) throw new Error('Mật khẩu cũ không đúng');

    if (oldPassword === newPassword) {
      throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return 'Đổi mật khẩu thành công';
  };
}
export default new AuthService();

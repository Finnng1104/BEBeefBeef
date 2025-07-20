import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GG_CLIENT_ID);

class GoogleAuthMiddleWare {
  // Xác thực token Google
  async verifyGoogleToken(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const token = req.body.token; // Lấy token từ body của request
      if (!token) {
        return res.status(401).json({ message: 'Access Denied - No token provided' });
      }

      // Xác thực token qua Google OAuth2Client
      try {
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.GG_CLIENT_ID, // Đảm bảo client ID của bạn khớp với Google Client ID
        });

        const payload = ticket.getPayload(); // Nhận thông tin người dùng từ payload

        if (payload) {
          // Lưu thông tin người dùng vào request để dùng ở các middleware sau
          req.body.googleUser = {
            email: payload.email,
            name: payload.name,
            avatar: payload.picture,
            sub: payload.sub, // Google ID
          };
          return next(); // Tiếp tục với controller hoặc middleware tiếp theo
        } else {
          return res.status(401).json({ message: 'Invalid Google token payload' });
        }
      } catch (error) {
        console.error('Error verifying token with Google OAuth2Client:', error);
        return res.status(401).json({ message: 'Access Denied - Invalid Google token' });
      }
    } catch (error) {
      console.error('Error verifying Google token:', error);
      return res.status(401).json({ message: 'Access Denied - Error verifying token' });
    }
  }
}

export default new GoogleAuthMiddleWare();

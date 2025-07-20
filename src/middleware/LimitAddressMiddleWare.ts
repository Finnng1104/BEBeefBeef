import rateLimit from 'express-rate-limit';

export const addressSearchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 10 phút
  max: 15,
  message: {
    error: 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

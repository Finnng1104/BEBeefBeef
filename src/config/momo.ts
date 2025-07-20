import dotenv from 'dotenv';
dotenv.config();

export const momoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE!,
  accessKey: process.env.MOMO_ACCESS_KEY!,
  secretKey: process.env.MOMO_SECRET_KEY!,
  redirectUrl: process.env.MOMO_RETURN_URL || 'http://localhost:4000/api/payment/momo-return',
  ipnUrl: 'http://localhost:4000/api/payment/momo-ipn',
  // ipnUrl: "https://callback.url/notify",
  endpoint: 'https://test-payment.momo.vn/v2/gateway/api/create',
};

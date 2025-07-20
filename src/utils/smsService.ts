import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Kiểm tra biến môi trường
if (!accountSid || !authToken || !fromPhoneNumber) {
  throw new Error(
    'Missing required environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)',
  );
}

const client = twilio(accountSid, authToken);

class SmsService {
  async sendOtpToPhoneNumber(to: string, otp: string): Promise<void> {
    try {
      const message = await client.messages.create({
        from: fromPhoneNumber,
        to: to,
        body: `Your OTP is: ${otp}`,
      });
      console.log('Message sent successfully:', message.sid); // Log thành công
    } catch (error: any) {
      console.error('Error sending OTP:', error.message); // Log chi tiết lỗi
    }
  }
}

export default new SmsService();

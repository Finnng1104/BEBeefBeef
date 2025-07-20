import { dateFormat, VnpLocale } from 'vnpay';
import vnpay from '../../config/vnpay';

const expireDate = new Date();
expireDate.setDate(expireDate.getDate() + 1);

const VNP_RETURN_URL =
  process.env.VNP_RETURN_URL || 'http://localhost:4000/api/payment/vnpay-return';

interface VNPayParams {
  amount: number;
  clientIp: string;
  transactionId: string;
  objectId: string;
  objectType: 'order' | 'reservation';
}

export const createVNPayPaymentUrl = ({
  amount,
  clientIp,
  transactionId,
  objectId,
  objectType,
}: VNPayParams) => {
  return vnpay.buildPaymentUrl({
    vnp_Amount: amount,
    vnp_IpAddr: clientIp || '127.0.0.1',
    vnp_TxnRef: transactionId,
    vnp_OrderInfo: `Thanh toán ${objectType} #${objectId}`,
    vnp_ReturnUrl: VNP_RETURN_URL,
    vnp_Locale: VnpLocale.VN,
    vnp_CreateDate: dateFormat(new Date()),
    vnp_ExpireDate: dateFormat(expireDate),
  });
};

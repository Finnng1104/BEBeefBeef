import crypto from 'crypto';
import axios from 'axios';
import { momoConfig } from '../../config/momo';

interface MomoPaymentParams {
  amount: number;
  method: 'wallet' | 'atm';
  objectId: string;
  transactionId: string;
  objectType: 'order' | 'reservation';
}

export const createMomoPaymentUrl = async ({
  amount,
  method = 'wallet',
  objectId,
  transactionId,
  objectType,
}: MomoPaymentParams) => {
  const requestId = `${Date.now()}`;
  const orderId = transactionId;

  const requestType = method === 'atm' ? 'payWithATM' : 'captureWallet';
  const orderType = method === 'atm' ? 'atm' : 'momo_wallet';

  const orderInfo = `Thanh toán ${objectType} ${objectId}`;

  const extraDataPayload = {
    objectId,
    objectType,
  };
  const extraData = Buffer.from(JSON.stringify(extraDataPayload)).toString('base64');

  const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${momoConfig.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  const signature = crypto
    .createHmac('sha256', momoConfig.secretKey)
    .update(rawSignature)
    .digest('hex');

  const body = {
    partnerCode: momoConfig.partnerCode,
    accessKey: momoConfig.accessKey,
    requestId,
    amount: amount.toString(),
    orderId,
    orderInfo,
    redirectUrl: momoConfig.redirectUrl,
    ipnUrl: momoConfig.ipnUrl,
    requestType,
    orderType,
    extraData,
    lang: 'vi',
    signature,
  };

  const response = await axios.post(momoConfig.endpoint, body, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log('Momo payment response:', response.data);
  return response.data.payUrl;
};

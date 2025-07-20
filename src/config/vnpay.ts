import { HashAlgorithm, VNPay, ignoreLogger } from 'vnpay';

import dotenv from 'dotenv';

dotenv.config();

const vnpay = new VNPay({
  tmnCode: 'L8M3EKX2',
  secureSecret: process.env.VNP_HASH_SECRET || '6HEKW2H6YES2FSOKLKKRQ0JS3QF1M4H6',
  vnpayHost: 'https://sandbox.vnpayment.vn',

  testMode: true,
  hashAlgorithm: 'SHA512' as HashAlgorithm,
  enableLog: true,
  loggerFn: ignoreLogger,

  endpoints: {
    paymentEndpoint: 'paymentv2/vpcpay.html',
    queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
    getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
  },
});

export default vnpay;

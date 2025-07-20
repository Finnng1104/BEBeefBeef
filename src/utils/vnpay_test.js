import crypto from 'crypto';

// Dữ liệu từ VNPAY
const params = {
  vnp_Amount: '14108000',
  vnp_BankCode: 'NCB',
  vnp_BankTranNo: 'VNP14980726',
  vnp_CardType: 'ATM',
  vnp_OrderInfo: 'Thanh toán đơn hàng #6834803ff5166e338d7103a8',
  vnp_PayDate: '20250526215346',
  vnp_ResponseCode: '00',
  vnp_TmnCode: 'L8M3EKX2',
  vnp_TransactionNo: '14980726',
  vnp_TransactionStatus: '00',
  vnp_TxnRef: '6834803ff5166e338d7103a8',
  vnp_SecureHash:
    '3264dbf4850cb57d0cd597716260bf0722810f49b7abb144254f7f77adf08a1a6f496ab19e18c16266153c8caee87497fea7fa3507e61bcf9786dcff0d71b532',
};

const secureSecret = '6HEKW2H6YES2FSOKLKKRQ0JS3QF1M4H6';

// Kiểm tra dữ liệu
console.log('==== DEBUG VNPay Signature ====');
console.log('Input Params:', JSON.stringify(params, null, 2));

// Tạo chữ ký
const data = { ...params };
const receivedHash = data.vnp_SecureHash.toLowerCase();
delete data.vnp_SecureHash;
delete data.vnp_SecureHashType; // Nếu có

const sortedKeys = Object.keys(data).sort();
const signData = sortedKeys
  .map((key) => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
  .join('&');

// Tính hash
const expectedHash = crypto
  .createHmac('sha512', secureSecret)
  .update(signData, 'utf8')
  .digest('hex');

// In thông tin debug
console.log('Sorted Keys:', sortedKeys);
console.log('signData:', signData);
console.log('secureSecret:', JSON.stringify(secureSecret));
console.log('Expected Hash:', expectedHash);
console.log('Received Hash:', receivedHash);
console.log('✅ Hash match?', expectedHash === receivedHash);

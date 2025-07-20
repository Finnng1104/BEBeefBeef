import crypto from 'crypto';

export function verifyReturn(params: Record<string, string>): boolean {
  const secureSecret = process.env.VNP_HASH_SECRET?.trim();
  if (!secureSecret) {
    console.error('Error: VNP_HASH_SECRET is not defined in environment variables');
    return false;
  }

  if (!params.vnp_SecureHash) {
    console.error('Error: vnp_SecureHash is missing in params');
    return false;
  }

  const vnpSecureHash = params.vnp_SecureHash.toLowerCase();

  const data = { ...params };
  delete data.vnp_SecureHash;
  delete data.vnp_SecureHashType;

  const sortedKeys = Object.keys(data).sort();

  const signData = sortedKeys
    .map((key) => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');

  const hash = crypto.createHmac('sha512', secureSecret).update(signData, 'utf8').digest('hex');

  return hash === vnpSecureHash;
}

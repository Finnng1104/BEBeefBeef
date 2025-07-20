/* eslint-disable prefer-const */
import paypal from '@paypal/checkout-server-sdk';

function environment() {
  let clientId =
    process.env.PAYPAL_CLIENT_ID ||
    'ATAZIx9r0UI4LAfBKiibOK0L_WIpP1QeXEQS2dcQR_67t1BYw1pDZCduRNDstqdDJPwZ1gd7XdoGJ2E8';
  let clientSecret =
    process.env.PAYPAL_CLIENT_SECRET ||
    'EKx_Iq-W_i3m-pz6aL8M8QMSJi92hqiE7Pw4noEnTd9piJ-qdHHOVdjSPem-Pat4ac3HxMrDkLX_WNE7';
  return new paypal.core.SandboxEnvironment(clientId, clientSecret);
  // Dùng live environment khi deploy thật:
  // return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
}

export const paypalClient = new paypal.core.PayPalHttpClient(environment());

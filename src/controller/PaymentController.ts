import { Request, Response } from 'express';
import { verifyReturn } from '../utils/vnpay';
import { flattenQueryParams } from '../utils/queryHelpers';
import OrderService from '../services/OrderService';
import Payment from '../models/PaymentModel';
import { capturePayPalOrder } from '../services/payments/PaypalService';
import ReservationService from '../services/ReservationService';
import { IUser } from '../models/UserModel';
import { Types } from 'mongoose';

const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:5173';

export const vnpayReturn = async (req: Request, res: Response): Promise<any> => {
  try {
    const vnp_Params = flattenQueryParams(req.query);
    const isValid = verifyReturn(vnp_Params);

    if (!isValid) {
      return res.status(400).send('Checksum failed - Invalid response from VNPay');
    }

    const vnp_ResponseCode = vnp_Params.vnp_ResponseCode;
    const paymentId = vnp_Params.vnp_TxnRef; // Đây là payment._id
    const amount = Number(vnp_Params.vnp_Amount) / 100;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).send('Không tìm thấy giao dịch thanh toán');
    }

    if (vnp_ResponseCode === '00') {
      await OrderService.markPaymentPaid(paymentId, amount, '', null);
      return res.redirect(`${CLIENT_BASE_URL}/payment-success?method=vnpay`);
    } else {
      await OrderService.markPaymentFailed(paymentId, 'VNPay return failed');
      return res.redirect(`${CLIENT_BASE_URL}/payment-failed?orderId=${payment.orderId}`);
    }
  } catch (error) {
    console.error('VNPay return error:', error);
    return res.status(500).send('Internal Server Error');
  }
};

export const momoReturn = async (req: Request, res: Response): Promise<any> => {
  try {
    const { orderId, amount, resultCode } = req.query;
    const paymentId = orderId as string;

    console.log('MoMo return params:', req.query);

    if (!paymentId || !amount || typeof resultCode === 'undefined') {
      return res.status(400).send('Thiếu tham số từ MoMo');
    }

    // ✅ Giải mã extraData
    const extraDataEncoded = req.query.extraData as string;
    let objectType: string | undefined;
    let objectId: string | undefined;

    if (extraDataEncoded) {
      try {
        const decoded = JSON.parse(Buffer.from(extraDataEncoded, 'base64').toString('utf8'));
        objectType = decoded.objectType;
        objectId = decoded.objectId;
        console.log('✅ extraData decoded:', decoded);
      } catch (err) {
        console.warn('⚠️ Lỗi giải mã extraData:', err);
      }
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).send('Không tìm thấy giao dịch thanh toán');
    }

    if (resultCode !== '0') {
      if (objectType === 'reservation') {
        await ReservationService.markPaymentFailed(paymentId, req.query.message as string);
        return res.redirect(`${CLIENT_BASE_URL}/payment-failed?type=reservation&id=${objectId}`);
      } else {
        await OrderService.markPaymentFailed(paymentId, req.query.message as string);
        return res.redirect(`${CLIENT_BASE_URL}/payment-failed?type=order&id=${objectId}`);
      }
    }

    const paidAmount = Number(amount);
    const transactionCode = req.query.transId as string;

    if (objectType === 'reservation') {
      await ReservationService.markPaymentPaid(paymentId, paidAmount, null);
      return res.redirect(`${CLIENT_BASE_URL}/payment-success?method=momo&type=reservation`);
    } else {
      await OrderService.markPaymentPaid(paymentId, paidAmount, transactionCode, null);
      return res.redirect(`${CLIENT_BASE_URL}/payment-success?method=vnpay`);
    }
  } catch (error) {
    console.error('MoMo return error:', error);
    return res.status(500).send('Internal Server Error');
  }
};

export const paypalReturn = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('Missing token');
    }

    const captureResult = await capturePayPalOrder(token as string);
    console.log('PayPal capture result:', captureResult);

    const referenceId = captureResult.purchase_units?.[0]?.reference_id;
    const amountUSD = parseFloat(
      captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0',
    );

    if (!referenceId || isNaN(amountUSD)) {
      return res.status(400).send('Missing reference ID or amount from PayPal');
    }

    const payment = await Payment.findById(referenceId);
    if (!payment) {
      return res.status(404).send('Không tìm thấy giao dịch thanh toán');
    }

    const amountVND = convertUSDtoVND(amountUSD);

    if (captureResult.status === 'COMPLETED') {
      if (payment.orderId) {
        await OrderService.markPaymentPaid(payment.id, amountVND, captureResult.id, null);
      } else if (payment.reservationId) {
        await ReservationService.markPaymentPaid(payment.id, amountVND, null);
        return res.redirect(`${CLIENT_BASE_URL}/payment-success?method=paypal&type=reservation`);
      } else {
        return res
          .status(400)
          .send('Invalid payment object: missing both orderId and reservationId');
      }

      return res.redirect(`${CLIENT_BASE_URL}/payment-success?method=paypal`);
    } else {
      if (payment.orderId) {
        await OrderService.markPaymentFailed(payment.id, `PayPal status: ${captureResult.status}`);
      } else if (payment.reservationId) {
        await ReservationService.markPaymentFailed(
          payment.id,
          `PayPal status: ${captureResult.status}`,
        );
      } else {
        return res
          .status(400)
          .send('Invalid payment object: missing both orderId and reservationId');
      }

      return res.redirect(`${CLIENT_BASE_URL}/payment-failed?orderId=${payment.orderId || ''}`);
    }
  } catch (error) {
    console.error('PayPal return error:', error);
    return res.status(500).send('Internal Server Error');
  }
};

export const updatePaymentStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { paymentId } = req.params;
    const { paidAmount, transactionCode } = req.body;
    const userId = (req.user as IUser).id as Types.ObjectId;

    if (!paymentId || !paidAmount) {
      return res.status(400).send('Missing paymentId or paidAmount');
    }

    const updated = await OrderService.markPaymentPaid(
      paymentId,
      paidAmount,
      transactionCode,
      userId.toString(),
    );
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Update payment status error:', error);
    return res.status(500).send('Internal Server Error');
  }
};

function convertUSDtoVND(usdAmount: number): number {
  const exchangeRate = 26000;
  return Math.round(usdAmount * exchangeRate);
}

export const retryPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).send('Missing orderId');
    }

    const objectId = new Types.ObjectId(orderId);
    const order = await OrderService.getOrderById(objectId);

    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (!['UNPAID', 'FAILED'].includes(order.payment_status)) {
      return res.status(400).send('Order is not in a retryable payment state');
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const postPayment = await OrderService.handlePostPaymentLogic(order, clientIp.toString());

    return res.status(200).json({ order, postPayment });
  } catch (error) {
    console.error('Retry payment error:', error);
    return res.status(500).send('Internal Server Error');
  }
};

export const changePaymentMethod = async (req: Request, res: Response): Promise<any> => {
  try {
    const { orderId } = req.params;
    const { paymentMethod } = req.body;
    const userId = (req.user as IUser).id as Types.ObjectId;

    if (!orderId || !paymentMethod) {
      return res.status(400).send('Missing orderId or paymentMethod');
    }

    const updatedOrder = await OrderService.changePaymentMethod(
      orderId,
      paymentMethod,
      userId.toString(),
    );
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const postPayment = await OrderService.handlePostPaymentLogic(
      updatedOrder,
      clientIp.toString(),
    );

    return res.status(200).json({ updatedOrder, postPayment });
  } catch (error) {
    console.error('Change payment method error:', error);
    return res.status(500).send('Internal Server Error');
  }
};

export const retryReservationPayment = async (req: Request, res: Response): Promise<any> => {
  const { reservationId } = req.params;
  if (!reservationId) return res.status(400).send('Missing reservationId');

  const reservation = await ReservationService.getReservationById(reservationId.toString());
  if (!reservation) return res.status(404).send('Reservation not found');

  if (!['UNPAID', 'FAILED'].includes(reservation.payment_status)) {
    return res.status(400).send('Reservation is not in a retryable state');
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const postPayment = await ReservationService.handleReservationPostPaymentLogic(
    reservation,
    clientIp.toString(),
  );

  return res.status(200).json({ reservation, postPayment });
};

export const changeReservationPaymentMethod = async (req: Request, res: Response): Promise<any> => {
  const { reservationId } = req.params;
  const { paymentMethod } = req.body;

  if (!reservationId || !paymentMethod) {
    return res.status(400).send('Missing reservationId or paymentMethod');
  }

  const objectId = new Types.ObjectId(reservationId); // Convert to ObjectId
  const updatedReservation = await ReservationService.changePaymentMethod(objectId, paymentMethod);
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const postPayment = await ReservationService.handleReservationPostPaymentLogic(
    updatedReservation,
    clientIp.toString(),
  );

  return res.status(200).json({ updatedReservation, postPayment });
};

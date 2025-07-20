import { Router } from 'express';
import AuthMiddleware from '../middleware/AuthMiddleWare';
import {
  vnpayReturn,
  momoReturn,
  paypalReturn,
  updatePaymentStatus,
  retryPayment,
  changePaymentMethod,
  retryReservationPayment,
  changeReservationPaymentMethod,
} from '../controller/PaymentController';

const router = Router();

router.get('/vnpay-return', vnpayReturn);
router.get('/momo-return', momoReturn);
router.get('/paypal-return', paypalReturn);
router.put('/payment-status/:paymentId', AuthMiddleware.verifyToken, updatePaymentStatus);
router.post('/retry-payment/:orderId', AuthMiddleware.verifyToken, retryPayment);
router.put('/change-payment/:orderId', AuthMiddleware.verifyToken, changePaymentMethod);
router.post('/retry-reservation/:reservationId', retryReservationPayment);
router.put('/change-reservation-payment/:reservationId', changeReservationPaymentMethod);

export default router;

import { Router } from 'express';
import OrderController from '../controller/OrderController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';

const router = Router();

router.post('/place-order', AuthMiddleWare.verifyToken, OrderController.placeOrder);
router.get('/all-orders', AuthMiddleWare.verifyToken, OrderController.getAllOrders);
router.get('/user-orders', AuthMiddleWare.verifyToken, OrderController.getUserOrders);
router.get('/:id', AuthMiddleWare.verifyToken, OrderController.getOrderById);
router.put('/order-status/:id', AuthMiddleWare.verifyToken, OrderController.updateOrderStatus);
router.put('/cancel-order/:id', AuthMiddleWare.verifyToken, OrderController.cancelOrder);
router.put('/request-return/:id', AuthMiddleWare.verifyToken, OrderController.requestReturn);
router.post('/send-invoice/:id', AuthMiddleWare.verifyToken, OrderController.sendInvoiceEmail);

export default router;

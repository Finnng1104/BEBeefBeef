import { Router } from 'express';
import CartController from '../controller/CartController';
import AuthMiddleWare from '../middleware/AuthMiddleWare';
const router = Router();

router.get('/getCart', AuthMiddleWare.verifyToken, CartController.getCartItems);
router.post('/add', AuthMiddleWare.verifyToken, CartController.AddItemToCart);
router.put('/update', AuthMiddleWare.verifyToken, CartController.UpdateCart);
router.delete('/item/:dishId', AuthMiddleWare.verifyToken, CartController.DeleteCartItem);
router.delete('/delete-all/:cartId', AuthMiddleWare.verifyToken, CartController.DeleteAllCart);
export default router;

import { Request, Response } from 'express';
import cartService from '../services/CartService';
import { IUser } from '../models/UserModel';

class CartController {
  static async getCartItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id?.toString();

      const cart = await cartService.getCartItems(userId);

      res.status(200).json({
        success: true,
        message: 'Cart items retrieved successfully',
        data: cart,
      });
    } catch (error: any) {
      console.error('Error retrieving cart items:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async AddItemToCart(req: Request, res: Response): Promise<void> {
    try {
      const { dishId, quantity } = req.body;
      const userId = (req.user as IUser).id?.toString();

      if (!dishId || typeof quantity !== 'number' || quantity <= 0) {
        res.status(400).json({
          success: false,
          message: 'Missing or invalid input fields. Quantity must be greater than 0',
        });
        return;
      }

      const addCart = await cartService.AddItemToCart(userId, dishId, quantity);

      res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        cart: addCart,
      });
    } catch (error: any) {
      console.error('Error adding item to cart:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async UpdateCart(req: Request, res: Response): Promise<void> {
    try {
      const { dishId, quantity } = req.body;
      const userId = (req.user as IUser).id?.toString();

      if (!dishId || quantity === undefined) {
        res.status(400).json({ success: false, message: 'Missing dishId or quantity' });
        return;
      }

      const updatedCart = await cartService.UpdateCart(userId, dishId, quantity);

      res.status(200).json({
        success: true,
        message: 'Cart updated successfully',
        data: updatedCart,
      });
    } catch (error: unknown) {
      console.error('Error updating cart:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
    }
  }

  static async DeleteCartItem(req: Request, res: Response): Promise<void> {
    try {
      const { dishId } = req.params;
      const userId = (req.user as IUser).id?.toString();

      if (!dishId) {
        res.status(400).json({ success: false, message: 'Missing dishId' });
        return;
      }
      const updatedCart = await cartService.DeleteCartItem(userId, dishId);
      if (!updatedCart) {
        res.status(404).json({ success: false, message: 'Cart not found' });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'Cart item deleted successfully',
        data: updatedCart,
      });
    } catch (error: unknown) {
      console.error('Error deleting cart item:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
    }
  }

  static async DeleteAllCart(req: Request, res: Response): Promise<void> {
    try {
      const { cartId } = req.params;
      if (!cartId) {
        res.status(400).json({ success: false, message: 'Missing cartId' });
        return;
      }
      const deletedCart = await cartService.DeleteAllCart(cartId);
      if (!deletedCart) {
        res.status(404).json({ success: false, message: 'Cart not found' });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'All items in cart deleted successfully',
        data: deletedCart,
      });
    } catch (error: unknown) {
      console.error('Error deleting all items in cart:', error);
      if (error instanceof Error) {
        res.status(500).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
    }
  }
}

export default CartController;

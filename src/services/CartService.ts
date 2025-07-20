import mongoose from 'mongoose';
import { Dish } from '../models/DishModel';
import Cart from '../models/CartModel';

class CartService {
  static async getCartItems(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId');
    }
    // tôi muốn lấy ra tên category của dish
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.dishId',
      populate: {
        path: 'categories',
        model: 'categories',
        select: 'Cate_name Cate_slug',
      },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    return cart;
  }

  static async AddItemToCart(userId: string, dishId: string, quantity: number) {
    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      throw new Error('Invalid dishId');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    // check status khác available thì không cho thêm vào giỏ hàng

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let cart = await Cart.findOne({ userId }).session(session);
      if (!cart) {
        cart = new Cart({
          userId: new mongoose.Types.ObjectId(userId),
          items: [],
          totalPrice: 0,
          status: 'pending',
        });
      }
      const dish = await Dish.findById(dishId).session(session);
      if (!dish) {
        throw new Error('Dish does not exist');
      }
      if (dish.countInStock <= 0) {
        throw new Error('Dish is out of stock');
      }
      if (dish.status !== 'available') {
        throw new Error('Dish is not available');
      }
      const existingItem = cart.items.find((item) => item.dishId.toString() === dishId);
      const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

      if (newQuantity > dish.countInStock) {
        throw new Error('Adding more exceeds available stock');
      }

      if (existingItem) {
        existingItem.quantity = newQuantity;
      } else {
        cart.items.push({
          dishId: new mongoose.Types.ObjectId(dishId),
          quantity,
          price: dish.discount_price == null ? dish.price : dish.discount_price,
          note: null,
        });
      }

      await cart.save({ session });
      await session.commitTransaction();

      const populatedCart = await Cart.findById(cart._id).populate('items.dishId').exec();
      return populatedCart;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async UpdateCart(userId: string, dishId: string, quantity: number) {
    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      throw new Error('Invalid dishId');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error('Cart not found');
    }

    const dish = await Dish.findById(dishId);
    if (!dish) {
      throw new Error('Dish does not exist');
    }

    const existingItem = cart.items.find((item) => item.dishId.toString() === dishId);

    if (existingItem) {
      const newQuantity = quantity;

      if (newQuantity > dish.countInStock) {
        throw new Error('Adding more exceeds available stock');
      }

      if (newQuantity > 0) {
        existingItem.quantity = newQuantity;
      } else {
        cart.items = cart.items.filter((item) => item.dishId.toString() !== dishId);
      }
    } else {
      cart.items.push({
        dishId: new mongoose.Types.ObjectId(dishId),
        quantity,
        price: dish.price,
        note: null,
      });
    }
    // Cập nhật lại tổng tiền
    cart.totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    await cart.save();
    return cart;
  }

  static async DeleteCartItem(userId: string, dishId: string) {
    if (!mongoose.Types.ObjectId.isValid(dishId)) {
      throw new Error('Invalid dishId');
    }
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error('Cart not found');
    }
    if (cart.items.length === 0) {
      throw new Error('Cart is already empty');
    }
    const itemIndex = cart.items.findIndex((item) => item.dishId.toString() === dishId);
    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }
    cart.items.splice(itemIndex, 1);
    cart.totalPrice = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();
    return cart;
  }

  static async DeleteAllCart(cartId: string) {
    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error('Invalid cartId');
    }
    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new Error('Cart not found');
    }
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();
    return cart;
  }
}

export default CartService;

/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';
import OrderService from '../services/OrderService';
import { IUser } from '../models/UserModel';
import { Types } from 'mongoose';
import OrderValidate from '../validators/orderValidator';
import VoucherService from '../services/VoucherService';
import MailerService from '../services/MailerService';

class OrderController {
  async placeOrder(req: Request, res: Response): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const validation = OrderValidate.validatePlaceOrder(req);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }

      const userId = (req.user as IUser).id as Types.ObjectId;
      const {
        address_id,
        address,
        payment_method,
        delivery_type,
        items,
        order_type,
        delivery_time_type,
        scheduled_time,
        note,
        shipping_fee,
        receiver,
        receiver_phone,
        voucher_id,
        discount_amount,
      } = req.body;

      if (voucher_id) {
        await VoucherService.validateVoucherForOrder({
          voucher_id,
          user_id: userId.toString(),
          items,
          discount_amount,
        });
      }

      const order = await OrderService.placeOrder({
        userId,
        address_id,
        address,
        payment_method,
        delivery_type,
        items,
        order_type,
        delivery_time_type,
        scheduled_time,
        note,
        shipping_fee,
        receiver,
        receiver_phone,
        voucher_id,
        discount_amount,
      });

      if (voucher_id) {
        await VoucherService.markVoucherUsed(userId.toString(), voucher_id);
      }

      await OrderService.sendOrderConfirmationEmail(order._id);

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const postPayment = await OrderService.handlePostPaymentLogic(order, clientIp.toString());

      return res.status(201).json({
        message: 'Order placed successfully',
        order,
        postPayment,
      });
    } catch (error: any) {
      console.error('Error placing order:', error.message);
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  }

  async getAllOrders(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page = 1, limit = 12, sortBy = 'createdAt', sortOrder = 'desc', filters } = req.query;
      const parsedSortOrder: 1 | -1 = sortOrder === 'asc' ? 1 : -1;
      const parsedPage = parseInt(page as string, 12);
      const parsedLimit = parseInt(limit as string, 12);
      const filtersObject = filters ? (filters as { [key: string]: string }) : {};

      const options = {
        page: parsedPage,
        limit: parsedLimit,
        sortBy: sortBy as string,
        sortOrder: parsedSortOrder,
        filters: filtersObject,
      };

      const orders = await OrderService.getAllOrders(options);

      return res.status(200).json({
        message: 'Orders retrieved successfully',
        ...orders,
      });
    } catch (error: any) {
      console.error('Error retrieving orders:', error.message);
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  }

  async getUserOrders(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userId = (req.user as IUser).id as Types.ObjectId;
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const sortType = (req.query.sortType as 'newest' | 'oldest') || 'newest';
      const searchTerm = req.query.searchTerm as string | undefined;

      const result = await OrderService.getUserOrders(
        userId,
        status,
        page,
        limit,
        sortType,
        searchTerm,
      );

      return res.status(200).json({
        message: 'Orders retrieved successfully',
        ...result,
      });
    } catch (error: any) {
      console.error('Error retrieving orders:', error.message);
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const orderId = new Types.ObjectId(req.params.id);
      const order = await OrderService.getOrderById(orderId);

      return res.status(200).json({
        message: 'Order retrieved successfully',
        order,
      });
    } catch (error: any) {
      console.error('Error retrieving order:', error.message);
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const orderId = new Types.ObjectId(req.params.id);
      const { status } = req.body;

      // Validate status
      const validStatuses = [
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'PENDING_PICKUP',
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'DELIVERY_FAILED',
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_REJECTED',
        'RETURNED',
        'CANCELLED',
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Invalid status value',
        });
      }

      const updatedOrder = await OrderService.updateOrderStatus(orderId, status);

      return res.status(200).json({
        message: 'Order status updated successfully',
        order: updatedOrder,
      });
    } catch (error: any) {
      console.error('Error updating order status:', error.message);
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  }

  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const orderId = new Types.ObjectId(req.params.id);
      const { reason } = req.body;
      const updatedOrder = await OrderService.cancelOrder(orderId, reason);

      return res.status(200).json({
        message: 'Order cancelled successfully',
        order: updatedOrder,
      });
    } catch (error: any) {
      console.error('Error cancelling order:', error.message);
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  }

  async requestReturn(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const orderId = new Types.ObjectId(req.params.id);
      const { reason } = req.body;
      const updatedOrder = await OrderService.requestReturn(orderId, reason);

      return res.status(200).json({
        message: 'Return requested successfully',
        order: updatedOrder,
      });
    } catch (error: any) {
      console.error('Error requesting return:', error.message);
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  }

  async sendInvoiceEmail(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { email } = req.body;
      const orderId = new Types.ObjectId(req.params.id);
      const order = await OrderService.getOrderById(orderId);

      const targetEmail = email || order.user_id?.email;

      await MailerService.sendInvoiceEmail(order, targetEmail);

      return res.status(200).json({
        message: 'Invoice email sent successfully',
        email: targetEmail,
      });
    } catch (error: any) {
      console.error('Error sending invoice email:', error.message);
      return res
        .status(error.statusCode || 500)
        .json({ message: error.message || 'Internal Server Error' });
    }
  }
}

export default new OrderController();

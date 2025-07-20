import mongoose from 'mongoose';
import { Order, IOrder } from '../models/OrderModel';
import Payment from '../models/PaymentModel';
import cron from 'node-cron';
import MailerService from './MailerService';
import User from '../models/UserModel';
import PostsService from './PostsServices';

class CronJobService {
  private readonly ONLINE_PAYMENT_METHODS = ['VNPAY', 'MOMO', 'MOMO_ATM', 'CREDIT_CARD', 'BANKING'];
  private cancelOrderTask: any;
  private publishPostTask: any; // Task for publishing scheduled posts

  constructor() {
    // Cron job for cancelling unpaid orders
    this.cancelOrderTask = cron.schedule('* * * * *', async () => {
      console.log('Chạy cron job kiểm tra đơn hàng chưa thanh toán...');
      await this.cancelUnpaidOrders();
    });

    // Cron job for publishing scheduled posts (e.g., every minute)
    this.publishPostTask = cron.schedule('* * * * *', async () => {
      console.log('Chạy cron job kiểm tra bài viết đã lên lịch...');
      try {
        const result = await PostsService.publishScheduledPosts();
        if (result.modifiedCount > 0) {
          console.log(`Đã đăng thành công ${result.modifiedCount} bài viết đã lên lịch.`);
        } else {
          console.log('Không có bài viết nào cần đăng theo lịch.');
        }
      } catch (error: any) {
        console.error('Lỗi trong cron job đăng bài viết đã lên lịch:', error.message);
      }
    });
  }

  // Hàm kiểm tra và hủy đơn hàng chưa thanh toán
  private async cancelUnpaidOrders() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 phút trước

      // Tìm các đơn hàng chưa thanh toán với phương thức thanh toán online
      const unpaidOrders = await Order.find({
        payment_method: { $in: this.ONLINE_PAYMENT_METHODS },
        payment_status: 'UNPAID',
        status: 'ORDER_PLACED',
        order_type: 'ONLINE',
        createdAt: { $lte: thirtyMinutesAgo },
      });

      for (const order of unpaidOrders) {
        // Bắt đầu transaction để đảm bảo tính toàn vẹn dữ liệu
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Cập nhật trạng thái đơn hàng sang CANCELLED
          order.status = 'CANCELLED';
          order.cancelled_at = new Date();
          order.cancelled_reason = 'Đơn hàng bị hủy do không thanh toán trong 30 phút';
          await order.save({ session }); // Cập nhật trạng thái thanh toán sang FAILED
          const payment = await Payment.findOne({ orderId: order._id }).session(session);
          if (payment) {
            payment.payment_status = 'FAILED';
            payment.failure_reason = 'Hết thời gian thanh toán';
            await payment.save({ session });
          }

          // Gửi email thông báo hủy đơn hàng
          await this.sendCancellationEmail(order);
          await session.commitTransaction();

          console.log(`Đã hủy đơn hàng ${order._id} do không thanh toán trong thời hạn`);
        } catch (error: any) {
          await session.abortTransaction();
          console.error(`Lỗi khi hủy đơn hàng ${order._id}:`, error.message);
        } finally {
          session.endSession();
        }
      }

      console.log(`Đã kiểm tra và xử lý ${unpaidOrders.length} đơn hàng chưa thanh toán.`);
    } catch (error: any) {
      console.error('Lỗi trong cron job hủy đơn hàng:', error.message);
    }
  }

  // Hàm gửi email thông báo hủy đơn hàng
  private async sendCancellationEmail(order: IOrder) {
    try {
      const user = await User.findById(order.user_id).lean();
      if (!user || !user.email) {
        console.error(`Không tìm thấy người dùng hoặc email cho đơn hàng ${order._id}`);
        return;
      }

      await MailerService.sendTemplateEmail({
        to: user.email,
        subject: `Đơn hàng #${order._id.toString().slice(-6).toUpperCase()} đã bị hủy`,
        template: 'order-cancellation-email',
        context: {
          orderId: order._id.toString().slice(-6).toUpperCase(),
          reason: order.cancelled_reason || 'Không thanh toán trong thời gian quy định',
        },
      });
    } catch (error: any) {
      console.error(`Lỗi khi gửi email thông báo hủy đơn hàng ${order._id}:`, error.message);
    }
  }

  public start() {
    this.cancelOrderTask.start();
    this.publishPostTask.start();
  }

  public stop() {
    this.cancelOrderTask.stop();
    this.publishPostTask.stop();
  }
}

export default new CronJobService();

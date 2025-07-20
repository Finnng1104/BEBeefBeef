import { Reservation } from '../models/ReservationModel';
import { ReservationDetail } from '../models/ReservationDetailModel';
import mongoose, { Document, Types } from 'mongoose';
import { Dish } from '../models/DishModel';
import MailerService from './MailerService';
import TableReservationService from './TableReservationService';
import { IUser } from '../models/UserModel';
import { Table } from '../models/TableModel';
import { IReservation } from '../types/reservation.types';
import Payment from '../models/PaymentModel';
import { createVNPayPaymentUrl } from '../services/payments/VnPayService';
import { createMomoPaymentUrl } from '../services/payments/MomoService';
import { createSimplePayPalOrder } from '../services/payments/PaypalService';
import axios from 'axios';

class ReservationService {
  async createReservation(data: any, userId: Types.ObjectId | null) {
    try {
      const {
        full_name,
        phone,
        email,
        date,
        time,
        table_type,
        number_of_people,
        table_code,
        note,
        is_choose_later,
        selectedItems = [],
        deposit,
        room_type,
      } = data;

      console.log('[ReservationService] Dữ liệu đầu vào:', JSON.stringify(data, null, 2));
      console.log('[ReservationService] table_type nhận được:', table_type);
      console.log('[ReservationService] Bắt đầu tạo reservation với data:', data);

      const newReservation = new Reservation({
        user_id: userId,
        full_name,
        phone,
        email,
        date,
        time,
        table_type,
        number_of_people,
        note,
        is_choose_later,
        status: 'PENDING',
        deposit_amount: deposit || 0,
        room_type,
        payment_method: data.payment_method,
      });

      let savedReservation: Document<unknown, IReservation> &
        IReservation &
        Required<{ _id: unknown }> & { __v: number };
      try {
        savedReservation = await newReservation.save();
        console.log('[ReservationService] Đã lưu reservation:', savedReservation);
      } catch (err) {
        console.error('[ReservationService] Lỗi khi lưu reservation:', err);
        throw err;
      }

      // giữ bàn nếu có table_code (bàn đã được hold từ Step2Seating)
      // if (table_code) {
      //   try {
      //     // Sử dụng userId hoặc một ID tạm thời cho khách không đăng nhập
      //     const holdUserId =
      //       userId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      //     await TableReservationService.holdTable(table_code, holdUserId, date, time);
      //     console.log('[ReservationService] Đã giữ bàn thành công:', table_code);
      //   } catch (holdErr) {
      //     console.error('[ReservationService] Lỗi khi giữ bàn:', holdErr);
      //     if (savedReservation && savedReservation._id) {
      //       const reservationId = typeof savedReservation._id === 'string'
      //         ? savedReservation._id
      //         : (savedReservation._id as Types.ObjectId).toString();
      //       await Reservation.findByIdAndDelete(reservationId); // rollback
      //     }
      //     throw new Error('Không thể giữ bàn');
      //   }
      // }

      if (Array.isArray(selectedItems) && selectedItems.length > 0) {
        try {
          const detailDocs = selectedItems.map((item: any) => ({
            reservation_id: savedReservation._id,
            dish_id: item.id,
            dish_name: item.name,
            category: item.category,
            unit_price: item.price,
            quantity: item.quantity,
            total_amount: item.price * item.quantity,
            note: item.note || '',
          }));

          await ReservationDetail.insertMany(detailDocs);
          console.log('[ReservationService] Đã lưu chi tiết món ăn:', detailDocs.length);
        } catch (err) {
          console.error('[ReservationService] Lỗi khi lưu chi tiết món ăn:', err);
          throw err;
        }
      }

      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        try {
          const reservationItems = await ReservationDetail.find({
            reservation_id: savedReservation._id,
          }).lean();

          // Lấy tên loại bàn hiển thị
          let seatingTypeDisplay = table_type;
          if (table_code) {
            const table = await Table.findOne({ code: table_code }).lean();
            if (table) {
              let typeName = '';
              switch (table.type) {
                case 'standard':
                  typeName = 'Bàn thường';
                  break;
                case 'group':
                  typeName = 'Bàn nhóm';
                  break;
                case 'quiet':
                  typeName = 'Bàn yên tĩnh';
                  break;
                case 'vip':
                  typeName = 'Bàn VIP';
                  break;
                default:
                  typeName = table.type;
              }
              seatingTypeDisplay = `${table.code} (${typeName})`;
            }
          }

          const emailData = {
            _id: (savedReservation._id as Types.ObjectId).toString(),
            user: { email } as IUser,
            full_name,
            phone,
            email,
            time,
            date,
            seating_type: seatingTypeDisplay,
            table_count: 1,
            number_of_people: number_of_people,
            note,
            items: reservationItems.map((item) => ({
              name: item.dish_name,
              quantity: item.quantity,
              price: item.unit_price,
            })),
          };

          await MailerService.sendReservationConfirmation(emailData);
          console.log('[ReservationService] Đã gửi email xác nhận.');
        } catch (emailError) {
          console.error('[ReservationService] Lỗi khi gửi email:', emailError);
          // Không throw để không chặn tạo đơn
        }
      }
      console.log('[ReservationService] Hoàn tất tạo reservation:', savedReservation?._id);
      return savedReservation;
    } catch (error: any) {
      console.error('❌ Error in createReservation:', error);
      throw new Error('Không thể tạo đơn đặt bàn');
    }
  }

  async handleReservationPostPaymentLogic(reservation: IReservation, clientIp: string) {
    const payment_method = reservation.payment_method;
    const amount = reservation.deposit_amount || 0;
    let redirectUrl: string | null = null;
    let bankingInfo = null;

    const newPayment = await Payment.create({
      reservationId: reservation._id,
      payment_method,
      payment_status: 'UNPAID',
      amount,
      transaction_code: null,
      bankingInfo: null,
    });

    const paymentTransactionId = newPayment._id.toString();
    const transactionCode = `RSV-${payment_method}-${paymentTransactionId.slice(-6)}`;

    await Payment.findByIdAndUpdate(paymentTransactionId, {
      transaction_code: transactionCode,
    });

    if (payment_method === 'BANKING') {
      const bank_name = 'Vietcombank';
      const bank_code = '970436';
      const account_number = '0123456789';
      const account_name = 'Công ty TNHH BeefBeef';
      const transfer_note = `RESERVATION-${reservation._id}`;

      const qrRes = await axios.post('https://api.vietqr.io/v2/generate', {
        accountNo: account_number,
        accountName: account_name,
        acqId: bank_code,
        amount,
        addInfo: transfer_note,
        format: 'base64',
      });

      const qr_base64 = qrRes?.data?.data?.qrDataURL;

      bankingInfo = {
        bank_name,
        account_number,
        account_name,
        qr_code: qr_base64,
        transfer_note,
      };

      await Payment.findByIdAndUpdate(paymentTransactionId, { bankingInfo });
    }

    const reservationId = (reservation._id as Types.ObjectId).toString();

    switch (payment_method) {
      case 'MOMO':
        redirectUrl = await createMomoPaymentUrl({
          amount,
          method: 'wallet',
          objectId: reservationId,
          transactionId: paymentTransactionId,
          objectType: 'reservation',
        });
        break;

      case 'MOMO_ATM':
        redirectUrl = await createMomoPaymentUrl({
          amount,
          method: 'atm',
          objectId: reservationId,
          transactionId: paymentTransactionId,
          objectType: 'reservation',
        });
        break;

      case 'VNPAY':
        redirectUrl = createVNPayPaymentUrl({
          amount,
          clientIp,
          transactionId: paymentTransactionId,
          objectId: reservationId,
          objectType: 'reservation',
        });
        break;

      case 'CREDIT_CARD':
        redirectUrl = await createSimplePayPalOrder({
          amount,
          objectId: reservationId,
          paymentId: paymentTransactionId,
          objectType: 'reservation',
        });
        break;
    }

    return {
      type: payment_method,
      redirectUrl,
      bankingInfo,
      amount,
    };
  }

  async markPaymentPaid(paymentId: string, paidAmount: number, userId: string | null) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    console.log('Marking payment as paid:ReservationService.ts', paymentId, paidAmount, userId);
    const allowedDifference = 1000;

    if (Math.abs((payment.amount || 0) - paidAmount) > allowedDifference) {
      throw new Error('Paid amount does not match expected payment amount');
    }

    payment.payment_status = 'PAID';
    payment.payment_date = new Date();
    payment.amount = paidAmount;

    if (userId) {
      payment.confirmed_by = new mongoose.Types.ObjectId(userId);
    }

    await payment.save();

    if (!payment.reservationId) throw new Error('Payment is not associated with any reservation');

    const reservation = await Reservation.findById(payment.reservationId);
    if (!reservation) throw new Error('Reservation not found');

    if (reservation.payment_status !== 'PAID') {
      reservation.payment_status = 'PAID';
      reservation.paid_at = new Date();
      reservation.status = 'BOOKED';
      await reservation.save();
    }

    if (reservation.table_type) {
      try {
        const table_code = reservation.table_type;

        // Tìm trạng thái holding hiện tại của bàn
        const currentHolding = await TableReservationService.getTableStatus(
          table_code,
          reservation.date,
          reservation.time,
        );

        if (currentHolding && currentHolding.status === 'holding' && currentHolding.heldBy) {
          await TableReservationService.bookTable(
            table_code,
            currentHolding.heldBy,
            reservation._id as Types.ObjectId,
            reservation.date,
            reservation.time,
          );
          console.log(
            '[ReservationService] Đã chuyển bàn từ holding sang booked khi thanh toán:',
            table_code,
          );
        } else {
          console.log(
            '[ReservationService] Không tìm thấy trạng thái holding cho bàn:',
            table_code,
          );
        }
      } catch (bookErr) {
        console.error('[ReservationService] Lỗi khi chuyển bàn từ holding sang booked:', bookErr);
      }
    }

    await this.sendReservationPaymentSuccessEmail(payment._id);

    console.log('Payment marked as paid: OK');
    return { reservation, payment };
  }

  async markPaymentFailed(paymentId: string, reason?: string) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    payment.payment_status = 'FAILED';
    payment.payment_date = new Date();
    payment.failure_reason = reason || 'Unknown failure';
    await payment.save();

    if (!payment.reservationId) throw new Error('Payment is not associated with any reservation');

    const reservation = await Reservation.findById(payment.reservationId);
    if (!reservation) throw new Error('Reservation not found');

    await Reservation.updateOne({ _id: reservation._id }, { $set: { payment_status: 'FAILED' } });

    return reservation;
  }

  async confirmReservation(reservationId: Types.ObjectId, userId: Types.ObjectId | null) {
    try {
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        throw new Error('Không tìm thấy reservation');
      }

      reservation.status = 'BOOKED';
      await reservation.save();

      if (reservation.table_type) {
        try {
          const table_code = reservation.table_type;
          const holdUserId =
            userId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          await TableReservationService.bookTable(
            table_code,
            holdUserId,
            reservationId,
            reservation.date,
            reservation.time,
          );
          console.log('[ReservationService] Đã chuyển bàn thành booked:', table_code);
        } catch (bookErr) {
          console.error('[ReservationService] Lỗi khi chuyển bàn thành booked:', bookErr);
        }
      }

      return reservation;
    } catch (error) {
      console.error('[ReservationService] Lỗi khi confirm reservation:', error);
      throw error;
    }
  }

  getMyReservations = async (userId: Types.ObjectId, status?: string[], page = 1, limit = 5) => {
    const query: any = { user_id: userId };

    if (status && status.length > 0) {
      query.status = { $in: status };
    }

    const skip = (page - 1) * limit;
    const [reservations, totalItems] = await Promise.all([
      Reservation.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Reservation.countDocuments(query),
    ]);

    return {
      reservations,
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
    };
  };

  async getReservationById(id: string) {
    const reservation = await Reservation.findById(id).lean();
    if (!reservation) throw new Error('Không tìm thấy đơn đặt bàn');

    const details = await ReservationDetail.find({ reservation_id: id }).lean();

    const detailsWithImages = await Promise.all(
      details.map(async (item) => {
        let image: string | null = null;
        try {
          const dish = await Dish.findById(item.dish_id, 'images').lean();
          image = dish?.images?.[0] || null;
        } catch (err: any) {
          console.warn('Không tìm thấy ảnh cho món:', item.dish_id, '| Lỗi:', err?.message);
        }
        return { ...item, image };
      }),
    );

    return { ...reservation, details: detailsWithImages };
  }

  async getReservationByCodeAndPhoneNumber(reservationCode: string, phoneNumber: string) {
    const reservations = await Reservation.find({ phone: phoneNumber }).lean();
    const match = reservations.find((r) => r._id.toString().slice(-6) === reservationCode);

    if (!match) {
      return { exists: false };
    }

    const details = await ReservationDetail.find({ reservation_id: match._id }).lean();

    const detailsWithImages = await Promise.all(
      details.map(async (item) => {
        let image: string | null = null;
        try {
          const dish = await Dish.findById(item.dish_id, 'images').lean();
          image = dish?.images?.[0] || null;
        } catch (err: any) {
          console.warn('Không tìm thấy ảnh cho món:', item.dish_id, '| Lỗi:', err?.message);
        }
        return { ...item, image };
      }),
    );

    return {
      exists: true,
      reservation: {
        ...match,
        order_items: detailsWithImages,
      },
    };
  }

  async getAllReservations() {
    const reservations = await Reservation.find().sort({ createdAt: -1 }).lean();
    return reservations;
  }

  async updateReservationStatus(
    id: string,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DONE',
  ) {
    const updated = await Reservation.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) throw new Error('Không tìm thấy đơn đặt bàn để cập nhật');
    return updated;
  }

  async cancelReservation(id: string) {
    const updated = await Reservation.findByIdAndUpdate(id, { status: 'CANCELLED' }, { new: true });
    if (!updated) throw new Error('Không tìm thấy đơn để huỷ');
    return updated;
  }

  async restoreReservation(id: string) {
    const reservation = await Reservation.findById(id);
    if (!reservation) throw new Error('Không tìm thấy đơn đặt bàn');
    if (reservation.status !== 'CANCELLED') {
      throw new Error('Chỉ có thể khôi phục đơn đã huỷ');
    }
    reservation.status = 'PENDING';
    return await reservation.save();
  }

  async sendReservationPaymentSuccessEmail(paymentId: Types.ObjectId) {
    const payment = await Payment.findById(paymentId).populate('reservationId');
    if (!payment) throw new Error('Payment not found');
    if (!payment.reservationId) throw new Error('Order not found in payment');

    const reservation = await Reservation.findById(payment.reservationId);
    if (!reservation) throw new Error('Reservation not found');

    const userEmail = reservation.email;

    await MailerService.sendReservationPaymentSuccess({
      payment,
      reservation,
      userEmail,
    });
  }

  async changePaymentMethod(
    reservationId: Types.ObjectId,
    newPaymentMethod: 'MOMO' | 'MOMO_ATM' | 'VNPAY' | 'BANKING' | 'CREDIT_CARD',
  ) {
    if (!reservationId || !newPaymentMethod) {
      throw new Error('Thiếu reservationId hoặc paymentMethod');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const reservation = await Reservation.findById(reservationId).session(session);
      if (!reservation) throw new Error('Không tìm thấy đơn đặt bàn');

      const invalidStatuses = ['CANCELLED', 'PAID'];
      if (
        invalidStatuses.includes(reservation.status) ||
        invalidStatuses.includes(reservation.payment_status)
      ) {
        throw new Error('Không thể thay đổi phương thức thanh toán ở trạng thái hiện tại');
      }

      const validMethods = ['MOMO', 'MOMO_ATM', 'VNPAY', 'BANKING', 'CREDIT_CARD'];
      if (!validMethods.includes(newPaymentMethod)) {
        throw new Error('Phương thức thanh toán không hợp lệ');
      }

      if (reservation.payment_method === newPaymentMethod) {
        await session.commitTransaction();
        session.endSession();
        return reservation;
      }

      const payments = await Payment.find({
        reservationId: reservationId,
        payment_status: { $in: ['UNPAID', 'PENDING', 'FAILED'] },
      }).session(session);

      if (payments.length > 0) {
        for (const payment of payments) {
          payment.payment_method = newPaymentMethod as
            | 'BANKING'
            | 'VNPAY'
            | 'MOMO'
            | 'MOMO_ATM'
            | 'CREDIT_CARD';
          await payment.save({ session });
        }
      } else {
        await Payment.create(
          [
            {
              reservationId: reservation._id,
              payment_method: newPaymentMethod as
                | 'BANKING'
                | 'VNPAY'
                | 'MOMO'
                | 'MOMO_ATM'
                | 'CREDIT_CARD',
              payment_status: 'UNPAID',
              amount: reservation.deposit_amount || 0,
              transaction_code: null,
              bankingInfo: null,
            },
          ],
          { session },
        );
      }

      reservation.payment_method = newPaymentMethod;
      reservation.payment_status = 'UNPAID';
      reservation.email = reservation.email || 'roppyhoangle@gmail.com';

      console.log('[Reservation service]reservation: ', reservation);
      await reservation.save({ session });

      await session.commitTransaction();
      session.endSession();

      return reservation;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

export default new ReservationService();

import { Request, Response } from 'express';
import { IUser } from '../models/UserModel';
import ReservationService from '../services/ReservationService';
import { Types } from 'mongoose';

export const ReservationController = {
  create: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      const userId = user?.id || null; // Cho phép null nếu không đăng nhập

      const {
        full_name,
        phone,
        date,
        time,
        table_type,
        number_of_people,
        note,
        is_choose_later,
        email,
        selectedItems,
        table_code,
        deposit,
        room_type,
        payment_method,
      } = req.body;

      const data = {
        full_name,
        phone,
        date,
        time,
        table_type,
        number_of_people,
        note,
        is_choose_later,
        email,
        selectedItems,
        table_code,
        deposit,
        room_type,
        payment_method,
      };

      const reservation = await ReservationService.createReservation(data, userId);

      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const postPayment = await ReservationService.handleReservationPostPaymentLogic(
        reservation,
        clientIp.toString(),
      );

      res.status(201).json({
        message: 'Đặt bàn thành công',
        data: reservation,
        postPayment,
      });
    } catch (error: any) {
      console.error('❌ Create reservation error:', error);
      res.status(error.statusCode || 500).json({
        message: error?.message || 'Đã xảy ra lỗi khi tạo đơn đặt bàn',
      });
    }
  },

  getMyReservations: async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      const userId = user?.id?.toString();
      console.log(userId);
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized - Please login to view your reservations' });
        return;
      }

      const rawStatus = req.query.status;
      let status: string[] | undefined;

      if (Array.isArray(rawStatus)) {
        status = rawStatus.map((s) => String(s));
      } else if (typeof rawStatus === 'string') {
        status = [rawStatus];
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const result = await ReservationService.getMyReservations(userId, status, page, limit);

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Get my reservations error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const reservation = await ReservationService.getReservationById(id);
      if (!reservation) {
        res.status(404).json({ message: 'Reservation not found' });
        return;
      }
      res.json({ success: true, data: reservation });
    } catch (error) {
      console.error('Get reservation by id error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getReservationByCodeAndPhoneNumber: async (req: Request, res: Response): Promise<void> => {
    try {
      const { reservationCode, phone } = req.query;

      if (!reservationCode || !phone) {
        res.status(400).json({ message: 'Reservation code and phone number are required' });
        return;
      }

      const { exists, reservation } = await ReservationService.getReservationByCodeAndPhoneNumber(
        String(reservationCode),
        String(phone),
      );

      if (!exists) {
        res.status(404).json({ message: 'Không tìm thấy đơn đặt bàn phù hợp' });
        return;
      }

      res.status(200).json({ success: true, data: reservation });
    } catch (error) {
      console.error('Get reservation by code and phone error:', error);
      res.status(500).json({ message: 'Đã có lỗi xảy ra trên server' });
    }
  },

  getAll: async (_req: Request, res: Response): Promise<void> => {
    try {
      const reservations = await ReservationService.getAllReservations();
      res.json({ success: true, data: reservations });
    } catch (error) {
      console.error('Get all reservations error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  confirmReservation: async (req: Request, res: Response): Promise<void> => {
    try {
      const { reservationId } = req.params;
      const user = req.user as IUser;
      const userId = user?.id || null;

      const reservation = await ReservationService.confirmReservation(
        new Types.ObjectId(reservationId),
        userId,
      );

      res.status(200).json({
        message: 'Xác nhận đặt bàn thành công',
        data: reservation,
      });
    } catch (error: any) {
      console.error('❌ Confirm reservation error:', error);
      res.status(error.statusCode || 500).json({
        message: error?.message || 'Đã xảy ra lỗi khi xác nhận đặt bàn',
      });
    }
  },

  updateStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await ReservationService.updateReservationStatus(id, status);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Update reservation status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  cancel: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await ReservationService.cancelReservation(id);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Cancel reservation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  restore: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await ReservationService.restoreReservation(id);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Restore reservation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
};

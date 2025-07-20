import { TableReservationStatus } from '../models/TableReservationStatusModel';
import { Types } from 'mongoose';

const TableReservationService = {
  getAllStatus: async () => {
    return await TableReservationStatus.find().lean();
  },

  holdTable: async (
    table_code: string,
    userId: Types.ObjectId | string,
    date: string,
    time: string,
  ) => {
    const expireAt = new Date(Date.now() + 60 * 60 * 1000);

    const bookingStart = new Date(`${date}T${time}`);
    const bookingEnd = new Date(bookingStart.getTime() + 3 * 60 * 60 * 1000);

    const overlapping = await TableReservationStatus.findOne({
      table_code,
      date: date,
      expireAt: { $gt: new Date() },
      $expr: {
        $and: [
          { $lt: [bookingStart, '$expireAt'] },
          { $gt: [bookingEnd, { $toDate: { $concat: ['$date', 'T', '$time'] } }] },
        ],
      },
    });

    if (overlapping) {
      console.error('[TableReservationService] Bàn đã bị giữ hoặc đặt (overlapping):', {
        table_code,
        date,
        time,
        expireAt,
        overlapping,
      });
      throw new Error('TABLE_ALREADY_HELD');
    }

    const hold = new TableReservationStatus({
      table_code,
      date,
      time,
      status: 'holding',
      heldBy: userId,
      expireAt,
    });

    try {
      const result = await hold.save();
      console.log('[TableReservationService] Đã giữ bàn thành công:', result);
      return result;
    } catch (err) {
      console.error('[TableReservationService] Lỗi khi lưu trạng thái giữ bàn:', err);
      throw err;
    }
  },

  releaseTable: async (table_code: string, userId: Types.ObjectId | string) => {
    const result = await TableReservationStatus.findOneAndDelete({
      table_code,
      heldBy: userId,
      status: 'holding',
    });
    return result;
  },

  bookTable: async (
    table_code: string,
    userId: Types.ObjectId | string,
    reservation_id: Types.ObjectId,
    date: string,
    time: string,
  ) => {
    const bookingTime = new Date(`${date}T${time}`);
    const expireAt = new Date(bookingTime.getTime() + 3 * 60 * 60 * 1000);

    const result = await TableReservationStatus.findOneAndUpdate(
      {
        table_code,
        heldBy: userId,
        status: 'holding',
        date: date,
        time: time,
      },
      {
        status: 'booked',
        reservation_id: reservation_id,
        expireAt: expireAt,
      },
      { new: true },
    );

    if (!result) {
      throw new Error('Không tìm thấy trạng thái holding để chuyển thành booked');
    }

    console.log('[TableReservationService] Đã chuyển bàn từ holding thành booked:', result);
    return result;
  },

  getTableStatus: async (table_code: string, date: string, time: string) => {
    const status = await TableReservationStatus.findOne({
      table_code,
      date,
      time,
      expireAt: { $gt: new Date() },
    }).lean();
    return status;
  },
};

export default TableReservationService;

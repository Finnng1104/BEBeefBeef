import mongoose from 'mongoose';
import { Document, Types } from 'mongoose';

export interface ITableReservationStatusInfo {
  status: 'holding' | 'booked';
  date: string;
  time: string;
  expireAt: Date;
}

export interface ITable extends mongoose.Document {
  code: string;
  type: 'standard' | 'group' | 'quiet' | 'vip';
  capacity: number;

  floor: number;
  zone: 'main-hall' | 'balcony' | 'stage' | 'quiet-zone' | 'vip-zone';

  isQuietZone?: boolean;
  isAvailable: boolean;
  allowBooking: boolean; // Trạng thái admin điều khiển

  description?: string;
  position?: {
    x: number;
    y: number;
  };

  // Thông tin trạng thái booking/holding (được thêm bởi service)
  reservationStatus?: ITableReservationStatusInfo | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITableReservationStatus extends Document {
  table_code: string;
  date: string;
  time: string;
  status: 'holding' | 'booked';
  heldBy?: Types.ObjectId | string | null;
  reservation_id?: Types.ObjectId | null;
  expireAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

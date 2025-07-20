import mongoose from 'mongoose';

export interface IReservation extends mongoose.Document {
  user_id?: mongoose.Types.ObjectId | null;
  full_name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  table_type: string;
  number_of_people: number;
  note?: string;
  is_choose_later: boolean;
  status: 'PENDING' | 'BOOKED' | 'CANCELLED' | 'DONE';
  payment_method: 'MOMO' | 'MOMO_ATM' | 'VNPAY' | 'BANKING' | 'CREDIT_CARD';
  payment_status: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';
  paid_at?: Date | null;
  deposit_amount?: number;
  room_type?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IReservationDetail extends mongoose.Document {
  reservation_id: mongoose.Types.ObjectId;
  dish_id: mongoose.Types.ObjectId;
  dish_name: string;
  category: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

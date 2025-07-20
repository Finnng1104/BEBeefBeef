import mongoose from 'mongoose';
import { IReservation } from '../types/reservation.types';

const reservationSchema = new mongoose.Schema<IReservation>(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    full_name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    table_type: { type: String, required: true },
    number_of_people: { type: Number, required: true },
    note: { type: String, default: '' },
    is_choose_later: { type: Boolean, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'BOOKED', 'CANCELLED', 'DONE'],
      default: 'PENDING',
    },
    deposit_amount: { type: Number, default: 0 },
    room_type: { type: String, default: '' },
    payment_method: {
      type: String,
      enum: ['MOMO', 'MOMO_ATM', 'VNPAY', 'BANKING', 'CREDIT_CARD'],
      required: false,
    },
    payment_status: {
      type: String,
      enum: ['UNPAID', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'UNPAID',
    },
    paid_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Reservation = mongoose.model<IReservation>('Reservation', reservationSchema);

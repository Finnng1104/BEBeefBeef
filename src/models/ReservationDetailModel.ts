import mongoose from 'mongoose';
import { IReservationDetail } from '../types/reservation.types';

const reservationDetailSchema = new mongoose.Schema<IReservationDetail>(
  {
    reservation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
    },
    dish_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish',
      required: true,
    },
    dish_name: { type: String, required: true },
    category: { type: String, required: true },
    unit_price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

export const ReservationDetail = mongoose.model<IReservationDetail>(
  'ReservationDetail',
  reservationDetailSchema,
);

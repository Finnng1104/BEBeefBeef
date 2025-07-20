import mongoose from 'mongoose';
import { ITableReservationStatus } from '../types/ITable.types';

const tableReservationStatusSchema = new mongoose.Schema<ITableReservationStatus>(
  {
    table_code: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ['holding', 'booked'],
      required: true,
    },
    heldBy: {
      type: mongoose.Schema.Types.Mixed, // Cho phép cả ObjectId và string
      ref: 'User',
      default: null,
    },
    reservation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
    expireAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index to auto-delete expired holds
tableReservationStatusSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const TableReservationStatus = mongoose.model<ITableReservationStatus>(
  'TableReservationStatus',
  tableReservationStatusSchema,
);

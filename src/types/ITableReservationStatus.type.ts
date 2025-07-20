import mongoose from 'mongoose';

export interface ITableReservationStatus extends mongoose.Document {
  table_code: string;
  status: 'holding' | 'booked';

  heldBy?: mongoose.Types.ObjectId | null;
  reservation_id?: mongoose.Types.ObjectId | null;

  expireAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

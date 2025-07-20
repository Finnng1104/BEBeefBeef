import mongoose from 'mongoose';
import { ITable } from '../types/ITable.types';

const tableSchema = new mongoose.Schema<ITable>(
  {
    code: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['standard', 'group', 'quiet', 'vip'],
      required: true,
    },
    capacity: { type: Number, required: true },

    floor: { type: Number, required: true },
    zone: {
      type: String,
      enum: ['main-hall', 'balcony', 'stage', 'quiet-zone', 'vip-zone'],
      default: 'main-hall',
    },

    isQuietZone: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    allowBooking: { type: Boolean, default: true }, // Trạng thái admin điều khiển

    description: { type: String, default: '' },

    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export const Table = mongoose.model<ITable>('Table', tableSchema);

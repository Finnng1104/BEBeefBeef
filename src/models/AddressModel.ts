import { Schema, model, Document, Types } from 'mongoose';

export interface IAddress extends Document {
  user_id: Types.ObjectId;
  full_name: string;
  phone: string;
  province: string;
  district: string;
  street_address: string;
  ward: string;
  address_type: 'HOME' | 'WORK' | 'OTHER';
  is_default?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lat: number;
  lon: number;
}

const AddressSchema = new Schema<IAddress>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    full_name: { type: String, required: true },
    phone: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },
    ward: { type: String, required: true },
    street_address: { type: String, required: true },
    address_type: {
      type: String,
      enum: ['HOME', 'WORK', 'OTHER'],
      default: 'HOME',
    },
    is_default: { type: Boolean, default: false },
    lat: { type: Number },
    lon: { type: Number },
  },
  { timestamps: true },
);

AddressSchema.index(
  { user_id: 1, is_default: 1 },
  { unique: true, partialFilterExpression: { is_default: true } },
);
AddressSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Address = model<IAddress>('Address', AddressSchema);

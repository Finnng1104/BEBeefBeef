import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  image: string;
  description?: string;
  order: number;
  status: 'active' | 'inactive';
  start_date?: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
}

const BannerSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    start_date: { type: Date },
    end_date: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

export default mongoose.model<IBanner>('Banner', BannerSchema);

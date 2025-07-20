import mongoose, { Schema, Document } from 'mongoose';

export interface IFAQ extends Document {
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  updated_at: Date;
  normalized_question: string;
}

const FAQSchema: Schema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    normalized_question: { type: String, required: true, unique: true, index: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    is_active: { type: Boolean, default: true },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export default mongoose.model<IFAQ>('FAQ', FAQSchema);

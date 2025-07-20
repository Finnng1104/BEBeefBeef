import mongoose, { Schema, Document } from 'mongoose';

export interface IFCMToken extends Document {
  userId: mongoose.Types.ObjectId | string;
  token: string;
  deviceInfo?: string;
  createdAt: Date;
}

const FCMTokenSchema = new Schema<IFCMToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    deviceInfo: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const FCMTokenModel = mongoose.model<IFCMToken>('FCMToken', FCMTokenSchema);
export default FCMTokenModel;

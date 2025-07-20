import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isRevoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    userAgent: String,
    ipAddress: String,
    replacedByToken: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model('RefreshToken', refreshTokenSchema);

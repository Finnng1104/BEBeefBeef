import mongoose, { Document } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string | null;
  birthday?: Date | null;
  avatar?: string | null;
  phone: string | null;
  googleId?: string | null;
  isEmailVerified: boolean;
  emailVerificationOtp?: string | null;
  emailVerificationOtpExpiry?: Date | null;
  changePasswordOtp?: string | null;
  changePasswordOtpExpiry?: Date | null;
  phoneOtp?: string | null;
  phoneOtpExpiry?: Date | null;
  roles?: mongoose.Schema.Types.ObjectId[];
  gender?: string | null;
  status?: string | null;
  default_address_id?: mongoose.Schema.Types.ObjectId[];
  expireAt: Date;
  otpSentCount: number;
  lastOtpSentAt: Date;
  otpVerifiedForChangePassword: boolean;
  isOnline: boolean;
}

const userSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true },
    email: { type: String, unique: true, trim: true },
    password: { type: String },
    birthday: { type: Date },
    avatar: { type: String },
    phone: { type: String, unique: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationOtp: { type: String },
    emailVerificationOtpExpiry: { type: Date },
    changePasswordOtp: { type: String },
    changePasswordOtpExpiry: { type: Date },
    phoneOtp: { type: String },
    phoneOtpExpiry: { type: Date },
    googleId: { type: String },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Roles' }],
    gender: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive', 'block'],
    },
    default_address_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
    },
    otpVerifiedForChangePassword: { type: Boolean, default: false },
    expireAt: { type: Date },
    otpSentCount: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.emailVerificationOtp;
        delete ret.emailVerificationOtpExpiry;
        delete ret.changePasswordOtp;
        delete ret.changePasswordOtpExpiry;
        delete ret.phoneOtp;
        delete ret.phoneOtpExpiry;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.emailVerificationOtp;
        delete ret.emailVerificationOtpExpiry;
        delete ret.changePasswordOtp;
        delete ret.changePasswordOtpExpiry;
        delete ret.phoneOtp;
        delete ret.phoneOtpExpiry;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.plugin(mongoosePaginate);

export type UserModel = mongoose.PaginateModel<IUser>;

const User = mongoose.model<IUser, UserModel>('User', userSchema);
export default User;

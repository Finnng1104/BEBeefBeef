import mongoose from 'mongoose';

export interface Register {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  roles: mongoose.Types.ObjectId[];
}

export interface Login {
  email: string;
  password: string;
}

export interface GoogleUser {
  id: string;
  email: string;
  googleId: string;
  username: string;
  avatar: string;
}
export interface ChangePasswordInput {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

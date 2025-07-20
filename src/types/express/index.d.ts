import { IUser } from '../../models/UserModel';

declare global {
  namespace Express {
    interface Request {
      user?: Pick<IUser, '_id' | 'email' | 'username'>;
    }
  }
}

export {};

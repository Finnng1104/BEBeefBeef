import { Request } from 'express';
import { IUser } from '../models/UserModel';

interface User {
  roles: mongoose.Types.ObjectId[];
}
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

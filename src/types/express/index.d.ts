import { IUser } from '../../models/UserModel';

declare global {
  namespace Express {
    interface Request {
      user?: Pick<IUser, '_id' | 'email' | 'username'>;
    }
  }
}

export {};
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
  }
}

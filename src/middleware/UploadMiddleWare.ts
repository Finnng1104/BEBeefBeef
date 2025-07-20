import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';

const imageFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValidExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const isValidMime = allowedTypes.test(file.mimetype);
  if (isValidExt && isValidMime) cb(null, true);
  else cb(new Error('Only image files are allowed!'));
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;

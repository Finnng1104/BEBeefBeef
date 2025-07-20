import dotenv from 'dotenv';
dotenv.config();
export const config = {
  ACCESS_TOKEN: process.env.ACCESS_TOKEN || '',
  REFRESH_TOKEN: process.env.REFRESH_TOKEN || '',
};

import * as jwt from 'jsonwebtoken';

export const accessToken = (payload: object, secretKey: string, expires: number): string => {
  try {
    return jwt.sign(payload, secretKey, { expiresIn: expires });
  } catch (error) {
    console.error('Error creating access token:', error);
    throw new Error('Token creation failed');
  }
};

export const refreshToken = (payload: object, secretKey: string, expires: number): string => {
  try {
    return jwt.sign(payload, secretKey, { expiresIn: expires });
  } catch (error) {
    console.error('Error creating refresh token:', error);
    throw new Error('Token creation failed');
  }
};

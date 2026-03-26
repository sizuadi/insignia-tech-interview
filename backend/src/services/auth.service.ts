import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JwtPayload } from '../middleware/auth.middleware';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.accessTokenSecret, { expiresIn: config.accessTokenExpiry });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.refreshTokenSecret, { expiresIn: config.refreshTokenExpiry });
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.refreshTokenSecret) as JwtPayload;
};

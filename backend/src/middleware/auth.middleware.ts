import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Access token required' } });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret) as JwtPayload;
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' } });
  }
};

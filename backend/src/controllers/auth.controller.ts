import { Request, Response } from 'express';
import prisma from '../config/prisma';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../services/auth.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' } });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' } });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Username already exists' } });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, passwordHash },
      select: { id: true, username: true, createdAt: true },
    });

    res.status(201).json({ success: true, message: 'User registered successfully', data: user });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
      return;
    }

    const payload = { userId: user.id, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.json({
      success: true,
      data: { accessToken, refreshToken, user: { id: user.id, username: user.username } },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Refresh token required' } });
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Refresh token revoked or invalid' } });
      return;
    }

    const newPayload = { userId: user.id, username: user.username };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await prisma.user.update({ where: { id: payload.userId }, data: { refreshToken: null } });
      } catch {
        // Token already invalid, still respond success
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
};


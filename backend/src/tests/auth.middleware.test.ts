import { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

describe('authMiddleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should return 401 if no authorization header', () => {
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    mockReq.headers = { authorization: 'Bearer invalid_token' };
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next with valid token', () => {
    const token = jwt.sign({ userId: 'user-1', username: 'testuser' }, config.accessTokenSecret);
    mockReq.headers = { authorization: `Bearer ${token}` };
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.userId).toBe('user-1');
  });

  it('should return 401 if Bearer prefix is missing', () => {
    const token = jwt.sign({ userId: 'user-1', username: 'testuser' }, config.accessTokenSecret);
    mockReq.headers = { authorization: token };
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: 'user' | 'admin';
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role?: string };
    req.userId = payload.userId;
    req.userRole = (payload.role === 'admin') ? 'admin' : 'user';
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}

export function generateAccessToken(userId: number, rememberMe = false, role = 'user'): string {
  const expiresIn = rememberMe
    ? (process.env.JWT_REMEMBER_EXPIRES_IN || '7d')
    : (process.env.JWT_EXPIRES_IN || '15m');
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function generateRefreshToken(userId: number, rememberMe = false, role = 'user'): string {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret';
  const expiresIn = rememberMe
    ? (process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN || '90d')
    : (process.env.JWT_REFRESH_EXPIRES_IN || '7d');
  return jwt.sign({ userId, role }, refreshSecret, { expiresIn } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { userId: number } {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret';
  return jwt.verify(token, refreshSecret) as { userId: number };
}

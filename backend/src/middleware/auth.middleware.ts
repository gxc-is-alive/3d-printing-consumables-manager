import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthPayload } from '../types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ success: false, error: 'No authorization header provided' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ success: false, error: 'Invalid authorization format' });
    return;
  }

  const token = parts[1];
  const payload = AuthService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Session expired, please login again' });
    return;
  }

  req.user = payload;
  next();
};

export default authMiddleware;

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'encalm-secret-jwt-key-2026';

export type UserPayload = {
  id: string;
  name: string;
  email: string;
  role: 'hod' | 'lead';
  title: string;
  initials: string;
};

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    // Check if user still exists in database
    const user = db.prepare('SELECT id, name, email, role, title, initials FROM users WHERE id = ?').get(decoded.id) as UserPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: ('hod' | 'lead')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Action restricted to ${allowedRoles.join(' or ')} role(s). Current role is ${req.user.role}.`
      });
    }

    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    const user = db.prepare('SELECT id, name, email, role, title, initials FROM users WHERE id = ?').get(decoded.id) as UserPayload | undefined;
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid token in optional auth
  }
  next();
}

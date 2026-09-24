import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { JWT_SECRET, requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalizedEmail) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    title: user.title,
    initials: user.initials,
  };

  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

  return res.json({
    token,
    user: userPayload,
  });
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, title, initials FROM users ORDER BY name ASC').all();
  return res.json({ users });
});

export default router;

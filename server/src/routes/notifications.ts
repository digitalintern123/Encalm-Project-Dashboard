import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET all notifications
router.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    ORDER BY created_at DESC
    LIMIT 50
  `).all() as any[];

  const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE read = 0').get() as { count: number };

  return res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      projectId: n.project_id,
      link: n.link,
      read: Boolean(n.read),
      createdAt: n.created_at,
    })),
    unreadCount: unreadCount.count,
  });
});

// PATCH mark notification as read
router.patch('/:id/read', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  return res.json({ success: true });
});

// POST mark all as read
router.post('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE read = 0').run();
  return res.json({ success: true });
});

// DELETE notification
router.delete('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  return res.json({ success: true });
});

export default router;

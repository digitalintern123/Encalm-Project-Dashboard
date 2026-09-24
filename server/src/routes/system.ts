import { Router } from 'express';
import { db } from '../db/database.js';
import { clearAllProjectData, seedDemoProjects } from '../db/seed.js';

const router = Router();

// POST reset/clear database
router.post('/reset', (req, res) => {
  try {
    const shouldSeed = req.query.seed === 'demo' || req.body?.seed === 'demo';
    if (shouldSeed) {
      seedDemoProjects();
      return res.json({ message: 'Database reset and seeded with demo projects successfully' });
    }

    clearAllProjectData();
    return res.json({ message: 'Database wiped clean. Ready for fresh project data entry.' });
  } catch (err: any) {
    console.error('Reset database failed:', err);
    return res.status(500).json({ error: 'Failed to reset database', details: err.message });
  }
});

// POST clear database explicitly
router.post('/clear', (req, res) => {
  try {
    clearAllProjectData();
    return res.json({ message: 'All project data cleared successfully.' });
  } catch (err: any) {
    console.error('Clear database failed:', err);
    return res.status(500).json({ error: 'Failed to clear database', details: err.message });
  }
});

// GET system health and statistics
router.get('/health', (req, res) => {
  try {
    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const phaseCount = db.prepare('SELECT COUNT(*) as count FROM phases').get() as { count: number };
    const milestoneCount = db.prepare('SELECT COUNT(*) as count FROM milestones').get() as { count: number };
    const issueCount = db.prepare('SELECT COUNT(*) as count FROM issues').get() as { count: number };
    const updateCount = db.prepare('SELECT COUNT(*) as count FROM updates').get() as { count: number };

    return res.json({
      status: 'healthy',
      database: 'connected (SQLite WAL)',
      counts: {
        projects: projectCount.count,
        users: userCount.count,
        phases: phaseCount.count,
        milestones: milestoneCount.count,
        issues: issueCount.count,
        updates: updateCount.count,
      },
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

export default router;

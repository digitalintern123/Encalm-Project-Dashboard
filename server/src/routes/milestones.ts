import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { fetchFullProject } from './projects.js';

const router = Router({ mergeParams: true });

// POST add milestone (Lead and Coordinator)
router.post('/', requireAuth, requireRole(['lead', 'coordinator']), (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id as string;
  const project = fetchFullProject(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const body = req.body;
  const milestoneId = body.id || `${projectId}-milestone-${Date.now()}`;
  const maxOrder = db.prepare('SELECT MAX(order_index) as max_idx FROM milestones WHERE project_id = ?').get(projectId) as { max_idx: number | null };
  const nextOrder = (maxOrder.max_idx ?? -1) + 1;

  db.prepare(`
    INSERT INTO milestones (
      id, project_id, title, date, status, stage, owner,
      approval_required, approval_status, completed_date, order_index
    ) VALUES (
      @id, @project_id, @title, @date, @status, @stage, @owner,
      @approval_required, @approval_status, @completed_date, @order_index
    )
  `).run({
    id: milestoneId,
    project_id: projectId,
    title: body.title,
    date: body.date,
    status: body.status || 'upcoming',
    stage: body.stage || null,
    owner: body.owner || 'Project Lead',
    approval_required: body.approvalRequired ? 1 : 0,
    approval_status: body.approvalStatus || (body.approvalRequired ? 'Pending' : 'Not required'),
    completed_date: body.completedDate || null,
    order_index: nextOrder,
  });

  // If requires approval, alert HOD
  if (body.approvalRequired) {
    db.prepare(`
      INSERT INTO notifications (id, type, title, message, project_id, link, read, created_at)
      VALUES (?, 'approval_required', ?, ?, ?, ?, 0, datetime('now'))
    `).run(
      `notif-appr-${milestoneId}`,
      `Approval Requested: ${body.title}`,
      `${project.name} requires milestone approval from HOD.`,
      projectId,
      `/project/${projectId}`
    );
  }

  const updatedProject = fetchFullProject(projectId);
  return res.status(201).json({ project: updatedProject });
});

// PATCH update milestone (Lead and Coordinator)
router.patch('/:milestoneId', requireAuth, requireRole(['lead', 'coordinator']), (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id as string;
  const milestoneId = req.params.milestoneId as string;
  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ? AND project_id = ?').get(milestoneId, projectId) as any;
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

  const patch = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (patch.title !== undefined) { updates.push('title = ?'); values.push(patch.title); }
  if (patch.date !== undefined) { updates.push('date = ?'); values.push(patch.date); }
  if (patch.status !== undefined) { updates.push('status = ?'); values.push(patch.status); }
  if (patch.stage !== undefined) { updates.push('stage = ?'); values.push(patch.stage); }
  if (patch.owner !== undefined) { updates.push('owner = ?'); values.push(patch.owner); }
  if (patch.approvalRequired !== undefined) { updates.push('approval_required = ?'); values.push(patch.approvalRequired ? 1 : 0); }
  if (patch.approvalStatus !== undefined) { updates.push('approval_status = ?'); values.push(patch.approvalStatus); }
  if (patch.completedDate !== undefined) { updates.push('completed_date = ?'); values.push(patch.completedDate); }

  if (updates.length > 0) {
    values.push(milestoneId);
    values.push(projectId);
    db.prepare(`UPDATE milestones SET ${updates.join(', ')} WHERE id = ? AND project_id = ?`).run(...values);
  }

  const updatedProject = fetchFullProject(projectId);
  return res.json({ project: updatedProject });
});

// DELETE milestone (Lead and Coordinator)
router.delete('/:milestoneId', requireAuth, requireRole(['lead', 'coordinator']), (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id as string;
  const milestoneId = req.params.milestoneId as string;
  db.prepare('DELETE FROM milestones WHERE id = ? AND project_id = ?').run(milestoneId, projectId);
  const updatedProject = fetchFullProject(projectId);
  return res.json({ project: updatedProject });
});

export default router;

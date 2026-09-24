import bcrypt from 'bcryptjs';
import { db, initDatabase } from './database.js';
import { defaultDemoProjects as seedProjects } from '../../../src/data/projects.js';
import { users as seedUsers } from '../../../src/data/users.js';

/** Ensures user accounts exist so authentication and RBAC function properly. */
export function ensureUsersSeeded() {
  initDatabase();

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash, role, title, initials)
    VALUES (@id, @name, @email, @password_hash, @role, @title, @initials)
  `);

  const defaultPasswordHash = bcrypt.hashSync('encalm', 10);

  const tx = db.transaction(() => {
    for (const u of seedUsers) {
      insertUser.run({
        id: u.id,
        name: u.name,
        email: u.email || `${u.id.replace('user-', '')}@encalm.com`,
        password_hash: defaultPasswordHash,
        role: u.role,
        title: u.title,
        initials: u.initials,
      });
    }
  });

  tx();
  console.log('✓ User accounts synchronized for authentication.');
}

/** Clears all project records, stages, milestones, issues, updates, and notifications for a clean slate. */
export function clearAllProjectData() {
  initDatabase();
  ensureUsersSeeded();

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM notifications').run();
    db.prepare('DELETE FROM updates').run();
    db.prepare('DELETE FROM issues').run();
    db.prepare('DELETE FROM milestones').run();
    db.prepare('DELETE FROM phases').run();
    db.prepare('DELETE FROM projects').run();
  });

  tx();
  console.log('✓ All seeded project data removed. Database is now empty and ready for fresh input.');
}

/** Optional helper to seed demo data if explicitly requested. */
export function seedDemoProjects() {
  initDatabase();
  ensureUsersSeeded();
  clearAllProjectData();

  const tx = db.transaction(() => {
    const insertProject = db.prepare(`
      INSERT INTO projects (
        id, name, location, category, code, health, progress, target_date, target_label,
        aop, awarded, spent, next_milestone, next_milestone_date, lead_id, start_date,
        last_updated, specification_json, template_id
      ) VALUES (
        @id, @name, @location, @category, @code, @health, @progress, @target_date, @target_label,
        @aop, @awarded, @spent, @next_milestone, @next_milestone_date, @lead_id, @start_date,
        @last_updated, @specification_json, @template_id
      )
    `);

    const insertPhase = db.prepare(`
      INSERT INTO phases (
        id, project_id, name, status, progress, owner, order_index,
        planned_start, planned_finish, actual_finish, work_completed, next_action,
        decision_required, updated_at
      ) VALUES (
        @id, @project_id, @name, @status, @progress, @owner, @order_index,
        @planned_start, @planned_finish, @actual_finish, @work_completed, @next_action,
        @decision_required, @updated_at
      )
    `);

    const insertMilestone = db.prepare(`
      INSERT INTO milestones (
        id, project_id, title, date, status, stage, owner,
        approval_required, approval_status, completed_date, order_index
      ) VALUES (
        @id, @project_id, @title, @date, @status, @stage, @owner,
        @approval_required, @approval_status, @completed_date, @order_index
      )
    `);

    const insertIssue = db.prepare(`
      INSERT INTO issues (
        id, project_id, title, detail, severity, owner, category, status,
        stage, date_raised, due_date, impact_cost, impact_schedule, impact_scope,
        action, resolution, order_index
      ) VALUES (
        @id, @project_id, @title, @detail, @severity, @owner, @category, @status,
        @stage, @date_raised, @due_date, @impact_cost, @impact_schedule, @impact_scope,
        @action, @resolution, @order_index
      )
    `);

    const insertUpdate = db.prepare(`
      INSERT INTO updates (
        id, project_id, date, author, role, text, stage, kind
      ) VALUES (
        @id, @project_id, @date, @author, @role, @text, @stage, @kind
      )
    `);

    const insertNotification = db.prepare(`
      INSERT INTO notifications (
        id, type, title, message, project_id, link, read, created_at
      ) VALUES (
        @id, @type, @title, @message, @project_id, @link, @read, @created_at
      )
    `);

    for (const p of seedProjects) {
      insertProject.run({
        id: p.id,
        name: p.name,
        location: p.location,
        category: p.category,
        code: p.code,
        health: p.health,
        progress: p.progress,
        target_date: p.targetDate,
        target_label: p.targetLabel,
        aop: p.aop,
        awarded: p.awarded,
        spent: p.spent,
        next_milestone: p.nextMilestone,
        next_milestone_date: p.nextMilestoneDate,
        lead_id: p.leadId || 'user-chinmay-saxena',
        start_date: p.startDate || null,
        last_updated: p.lastUpdated || null,
        specification_json: p.specification ? JSON.stringify(p.specification) : null,
        template_id: p.templateId || null,
      });

      if (Array.isArray(p.phases)) {
        p.phases.forEach((ph, idx) => {
          insertPhase.run({
            id: ph.id || `${p.id}-phase-${idx}`,
            project_id: p.id,
            name: ph.name,
            status: ph.status,
            progress: ph.progress,
            owner: ph.owner,
            order_index: idx,
            planned_start: ph.plannedStart || null,
            planned_finish: ph.plannedFinish || null,
            actual_finish: ph.actualFinish || null,
            work_completed: ph.workCompleted || null,
            next_action: ph.nextAction || null,
            decision_required: ph.decisionRequired || null,
            updated_at: ph.updatedAt || null,
          });
        });
      }

      if (Array.isArray(p.milestones)) {
        p.milestones.forEach((m, idx) => {
          insertMilestone.run({
            id: (m as any).id || `${p.id}-milestone-${idx}`,
            project_id: p.id,
            title: m.title,
            date: m.date,
            status: m.status,
            stage: m.stage || null,
            owner: m.owner || null,
            approval_required: m.approvalRequired ? 1 : 0,
            approval_status: m.approvalStatus || (m.approvalRequired ? 'Pending' : 'Not required'),
            completed_date: m.completedDate || null,
            order_index: idx,
          });
        });
      }

      if (Array.isArray(p.issues)) {
        p.issues.forEach((iss, idx) => {
          insertIssue.run({
            id: iss.id || `${p.id}-issue-${idx}`,
            project_id: p.id,
            title: iss.title,
            detail: iss.detail,
            severity: iss.severity || 'Medium',
            owner: iss.owner || 'Project Lead',
            category: iss.category || 'Other',
            status: iss.status || 'Open',
            stage: iss.stage || null,
            date_raised: iss.dateRaised || '24 Sep 2026',
            due_date: iss.dueDate || null,
            impact_cost: iss.impactCost || null,
            impact_schedule: iss.impactSchedule || null,
            impact_scope: iss.impactScope || null,
            action: iss.action || null,
            resolution: iss.resolution || null,
            order_index: idx,
          });
        });
      }

      if (Array.isArray(p.updates)) {
        p.updates.forEach((u, idx) => {
          insertUpdate.run({
            id: `${p.id}-update-${idx}`,
            project_id: p.id,
            date: u.date,
            author: u.author,
            role: u.role,
            text: u.text,
            stage: u.stage || null,
            kind: u.kind || 'General',
          });
        });
      }
    }
  });

  tx();
  console.log('✓ Demo projects successfully seeded.');
}

/** Default entry point: ensures users exist, does not force demo data. */
export function seedDatabase(force = false) {
  ensureUsersSeeded();
  if (force) {
    clearAllProjectData();
  }
}

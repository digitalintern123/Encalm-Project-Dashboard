import bcrypt from 'bcryptjs';
import { db, initDatabase } from './database.js';
import { users as seedUsers } from '../../../src/data/users.js';

/** Ensures authentic user accounts exist so authentication and RBAC function properly. */
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
  console.log('✓ All project data removed. Database is now empty and ready for fresh input.');
}

/** Default entry point: ensures authentic users exist, does not force demo data. */
export function seedDatabase(force = false) {
  ensureUsersSeeded();
  if (force) {
    clearAllProjectData();
  }
}

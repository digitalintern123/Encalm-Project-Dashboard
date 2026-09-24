import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'encalm.db');
export const db = new Database(dbPath);

// Performance & data integrity pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('hod', 'lead')),
      title TEXT NOT NULL,
      initials TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      code TEXT NOT NULL,
      health TEXT NOT NULL CHECK(health IN ('On track', 'At risk', 'Delayed', 'Not started')),
      progress REAL NOT NULL DEFAULT 0,
      target_date TEXT NOT NULL,
      target_label TEXT NOT NULL,
      aop REAL NOT NULL DEFAULT 0,
      awarded REAL NOT NULL DEFAULT 0,
      spent REAL NOT NULL DEFAULT 0,
      next_milestone TEXT NOT NULL,
      next_milestone_date TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      start_date TEXT,
      last_updated TEXT,
      specification_json TEXT,
      template_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('upcoming', 'active', 'blocked', 'complete')),
      progress REAL NOT NULL DEFAULT 0,
      owner TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      planned_start TEXT,
      planned_finish TEXT,
      actual_finish TEXT,
      work_completed TEXT,
      next_action TEXT,
      decision_required TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('upcoming', 'complete', 'late')),
      stage TEXT,
      owner TEXT,
      approval_required INTEGER NOT NULL DEFAULT 0,
      approval_status TEXT DEFAULT 'Not required',
      completed_date TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('High', 'Medium', 'Low')),
      owner TEXT NOT NULL,
      category TEXT DEFAULT 'Other',
      status TEXT NOT NULL DEFAULT 'Open',
      stage TEXT,
      date_raised TEXT,
      due_date TEXT,
      impact_cost TEXT,
      impact_schedule TEXT,
      impact_scope TEXT,
      action TEXT,
      resolution TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS updates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      author TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      stage TEXT,
      kind TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      project_id TEXT,
      link TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(project_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id, date);
    CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id, severity);
    CREATE INDEX IF NOT EXISTS idx_updates_project ON updates(project_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, created_at DESC);
  `);
}

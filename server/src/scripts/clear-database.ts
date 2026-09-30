import { db, initDatabase } from '../db/database.js';
import { saveDatabaseSnapshot } from '../utils/backup.js';

export function wipeDatabaseForManualEntry() {
  initDatabase();

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM notifications').run();
    db.prepare('DELETE FROM updates').run();
    db.prepare('DELETE FROM issues').run();
    db.prepare('DELETE FROM milestones').run();
    db.prepare('DELETE FROM phases').run();
    db.prepare('DELETE FROM photos').run();
    db.prepare('DELETE FROM projects').run();
  });

  tx();
  saveDatabaseSnapshot();
  console.log('✓ All projects removed. Database and snapshot are 100% clean for manual entry.');
}

wipeDatabaseForManualEntry();

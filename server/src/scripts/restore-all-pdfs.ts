import { db, initDatabase } from '../db/database.js';
import { ensureUsersSeeded } from '../db/seed.js';
import { saveDatabaseSnapshot } from '../utils/backup.js';
import { seedVizagHotelToDatabase } from './seed-vizag-database.js';
import { seedMopaGoaHotelToDatabase } from './seed-mopa-goa-database.js';
import { seedPortfolioAreaSheetToDatabase } from './seed-portfolio-area-sheet.js';

export interface RestoreSummary {
  success: boolean;
  totalProjects: number;
  hotelCount: number;
  loungeCount: number;
  kitchenCount: number;
  otherCount: number;
  encalmEatsCount: number;
  locations: Record<string, number>;
  restoredAt: string;
}

/**
 * Master restoration pipeline for all 3 source PDFs:
 * 1. PDF 1: Vizag Hotel & Suites (156 Keys / 168 Bays, 14,970 sqm, 6th Floor Presidential Suite bifurcation)
 * 2. PDF 2: Mopa Goa Hotel (220 Keys • 109 Car Parks, 20,000 sqm, 10-zone Area Program)
 * 3. PDF 3: Master "PROJECT AREA SHEET" (66 facilities across Delhi, Hyderabad, Goa, Vizag)
 * Total: 68 authentic enterprise projects.
 */
export function restoreAllPdfDataToDatabase(): RestoreSummary {
  console.log('===============================================================');
  console.log(' 🚀 Starting Master Restoration of All 3 Source PDF Datasets');
  console.log('===============================================================');

  // 1. Initialize SQLite schema & migrations
  initDatabase();

  // 2. Ensure authentic system user accounts exist
  ensureUsersSeeded();

  // 3. Restore PDF 1: Vizag Hotel & Suites
  console.log('\n[1/3] Restoring PDF 1: Vizag Hotel & Suites...');
  seedVizagHotelToDatabase();

  // 4. Restore PDF 2: Mopa Goa Hotel
  console.log('\n[2/3] Restoring PDF 2: Mopa Goa Hotel...');
  seedMopaGoaHotelToDatabase();

  // 5. Restore PDF 3: Master Project Area Sheet (66 facilities)
  console.log('\n[3/3] Restoring PDF 3: Project Area Sheet (66 facilities)...');
  seedPortfolioAreaSheetToDatabase();

  // 6. Force clean synchronized snapshot to server/data/portfolio-database.json
  saveDatabaseSnapshot();

  // 7. Verification & Statistical Summary
  const countRow = db.prepare('SELECT count(*) as count FROM projects').get() as { count: number };
  const categories = db.prepare('SELECT category, count(*) as count FROM projects GROUP BY category').all() as {
    category: string;
    count: number;
  }[];
  const locations = db.prepare('SELECT location, count(*) as count FROM projects GROUP BY location').all() as {
    location: string;
    count: number;
  }[];

  const catMap: Record<string, number> = {};
  categories.forEach((c) => {
    catMap[c.category] = c.count;
  });

  const locMap: Record<string, number> = {};
  locations.forEach((l) => {
    locMap[l.location] = l.count;
  });

  console.log('\n===============================================================');
  console.log(` ✓ Master PDF Restoration Complete! Total Projects in SQLite: ${countRow.count}`);
  console.log('   - Hotels:', catMap['Hotel'] || 0);
  console.log('   - Lounges & Spas:', catMap['Lounge'] || 0);
  console.log('   - Central Kitchens:', catMap['Kitchen'] || 0);
  console.log('   - Encalm Eats:', catMap['Encalm Eats'] || 0);
  console.log('   - Operations & Support:', catMap['Other'] || 0);
  console.log(' Locations Breakdown:', JSON.stringify(locMap));
  console.log('===============================================================\n');

  return {
    success: true,
    totalProjects: countRow.count,
    hotelCount: catMap['Hotel'] || 0,
    loungeCount: catMap['Lounge'] || 0,
    kitchenCount: catMap['Kitchen'] || 0,
    otherCount: catMap['Other'] || 0,
    encalmEatsCount: catMap['Encalm Eats'] || 0,
    locations: locMap,
    restoredAt: new Date().toISOString(),
  };
}

// Auto-run if invoked directly via tsx
if (process.argv[1]?.includes('restore-all-pdfs')) {
  restoreAllPdfDataToDatabase();
}

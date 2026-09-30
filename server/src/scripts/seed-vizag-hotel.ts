import { db, initDatabase } from '../db/database.js';
import { saveDatabaseSnapshot } from '../utils/backup.js';
import { vizagHotelAreaProgram } from '../../../src/data/projects.js';

export function seedVizagHotelProject() {
  initDatabase();

  const projectId = 'encalm-vizag-hotel';

  // Check if project already exists
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (existing) {
    console.log(`ℹ Project "${projectId}" already exists in database. Updating area program...`);
    db.prepare('UPDATE projects SET specification_json = ? WHERE id = ?').run(
      JSON.stringify({
        projectType: 'Hotel & Suites',
        area: '14,970 SQ.M. / 161,137 SQ.FT.',
        capacity: '156 Keys / 168 Bays',
        units: '156 Keys',
        terminal: 'Vizag',
        floor: 'B + G + 1 + Service + 2nd–6th',
        scope:
          'Plot Area: 8,160 SQ.M. (2.0 Acres), BUA: 14,970 SQ.M. (161,137 SQ.FT.), 156 Keys / 168 Bays across Basement, Ground, First, Service floor, and 2nd to 6th Guest Floors with Banquet, ADD, Lounge Bar, Gym, Pool & 4 Presidential Suites.',
        areaProgram: vizagHotelAreaProgram,
      }),
      projectId
    );
    saveDatabaseSnapshot();
    console.log(`✓ Updated Vizag Hotel Area Program in SQLite and snapshot.`);
    return;
  }

  const tx = db.transaction(() => {
    // 1. Insert Project
    db.prepare(`
      INSERT INTO projects (
        id, name, location, category, code, health, status, progress,
        target_date, target_label, aop, awarded, spent, projected_cost,
        area, pax_keys, next_milestone, next_milestone_date, lead_id,
        start_date, last_updated, specification_json, template_id
      ) VALUES (
        @id, @name, @location, @category, @code, @health, @status, @progress,
        @target_date, @target_label, @aop, @awarded, @spent, @projected_cost,
        @area, @pax_keys, @next_milestone, @next_milestone_date, @lead_id,
        @start_date, @last_updated, @specification_json, @template_id
      )
    `).run({
      id: projectId,
      name: 'Vizag Hotel & Suites',
      location: 'Vizag',
      category: 'Hotel',
      code: 'VIZ-HTL-26',
      health: 'On track',
      status: 'In Design',
      progress: 25,
      target_date: '2027-03-31',
      target_label: '31 Mar 2027',
      aop: 1200000000, // ₹120 Cr
      awarded: 350000000, // ₹35 Cr
      spent: 120000000, // ₹12 Cr
      projected_cost: 1200000000,
      area: '14,970 SQ.M. / 161,137 SQ.FT.',
      pax_keys: '156 Keys / 168 Bays',
      next_milestone: 'Statutory Approvals & Structural Design',
      next_milestone_date: '2026-11-15',
      lead_id: 'user-chinmay-saxena',
      start_date: '2026-06-01',
      last_updated: '30 Sep 2026',
      specification_json: JSON.stringify({
        projectType: 'Hotel & Suites',
        area: '14,970 SQ.M. / 161,137 SQ.FT.',
        capacity: '156 Keys / 168 Bays',
        units: '156 Keys',
        terminal: 'Vizag',
        floor: 'B + G + 1 + Service + 2nd–6th',
        scope:
          'Plot Area: 8,160 SQ.M. (2.0 Acres), BUA: 14,970 SQ.M. (161,137 SQ.FT.), 156 Keys / 168 Bays across Basement, Ground, First, Service floor, and 2nd to 6th Guest Floors with Banquet, ADD, Lounge Bar, Gym, Pool & 4 Presidential Suites.',
        areaProgram: vizagHotelAreaProgram,
      }),
      template_id: 'hotel',
    });

    // 2. Insert Phases
    const phases = [
      { name: 'Feasibility & architectural brief', status: 'complete', progress: 100, owner: 'PMO', weight: 15 },
      { name: 'Concept & architectural space program', status: 'active', progress: 85, owner: 'Design', weight: 20 },
      { name: 'Statutory clearances & approvals', status: 'upcoming', progress: 15, owner: 'Projects', weight: 15 },
      { name: 'Procurement & contractor tendering', status: 'upcoming', progress: 0, owner: 'Sourcing', weight: 15 },
      { name: 'Civil & structural execution', status: 'upcoming', progress: 0, owner: 'Projects', weight: 20 },
      { name: 'Fit-out, MEP & hotel services', status: 'upcoming', progress: 0, owner: 'Projects', weight: 10 },
      { name: 'Opening readiness & handover', status: 'upcoming', progress: 0, owner: 'Operations', weight: 5 },
    ];

    const insertPhase = db.prepare(`
      INSERT INTO phases (id, project_id, name, status, progress, owner, weight, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    phases.forEach((ph, idx) => {
      insertPhase.run(`${projectId}-phase-${idx}`, projectId, ph.name, ph.status, ph.progress, ph.owner, ph.weight, idx);
    });

    // 3. Insert Milestones
    const milestones = [
      {
        title: 'Architectural Area Program Sign-Off',
        date: '2026-08-15',
        status: 'complete',
        stage: 'Concept & architectural space program',
        owner: 'Design',
        approvalRequired: 1,
        approvalStatus: 'Approved',
        completedDate: '2026-08-15',
      },
      {
        title: 'Fire NOC & Coastal Zone Clearances',
        date: '2026-11-15',
        status: 'upcoming',
        stage: 'Statutory clearances & approvals',
        owner: 'Projects',
        approvalRequired: 1,
        approvalStatus: 'Pending',
      },
      {
        title: 'Civil Works Contractor Award',
        date: '2026-12-31',
        status: 'upcoming',
        stage: 'Procurement & contractor tendering',
        owner: 'Sourcing',
        approvalRequired: 1,
        approvalStatus: 'Pending',
      },
      {
        title: 'Guest Room & Suite Mockup Sign-Off',
        date: '2027-01-20',
        status: 'upcoming',
        stage: 'Fit-out, MEP & hotel services',
        owner: 'Operations',
        approvalRequired: 1,
        approvalStatus: 'Pending',
      },
    ];

    const insertMilestone = db.prepare(`
      INSERT INTO milestones (
        id, project_id, title, date, status, stage, owner,
        approval_required, approval_status, completed_date, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    milestones.forEach((m, idx) => {
      insertMilestone.run(
        `${projectId}-milestone-${idx}`,
        projectId,
        m.title,
        m.date,
        m.status,
        m.stage,
        m.owner,
        m.approvalRequired,
        m.approvalStatus,
        m.completedDate || null,
        idx
      );
    });

    // 4. Insert Issues
    const insertIssue = db.prepare(`
      INSERT INTO issues (
        id, project_id, title, detail, severity, owner, category, status,
        stage, date_raised, due_date, impact_cost, impact_schedule, impact_scope, action, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertIssue.run(
      `${projectId}-issue-1`,
      projectId,
      'Coastal Zone Regulation Clearances for Swimming Pool & Deck',
      '2nd-floor pool deck and alfresco dining integration requires statutory environmental verification.',
      'Medium',
      'Chinmay Saxena',
      'Approval',
      'Action in progress',
      'Statutory clearances & approvals',
      '2026-09-01',
      '2026-10-30',
      'None expected',
      '15 days buffer',
      '2nd floor outdoor pool deck boundary',
      'Liaison architect submitting revised architectural site layout to municipal authority.',
      0
    );

    // 5. Insert Updates
    const insertUpdate = db.prepare(`
      INSERT INTO updates (id, project_id, date, author, role, text, stage, kind)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUpdate.run(
      `${projectId}-update-1`,
      projectId,
      '30 Sep 2026',
      'Chinmay Saxena',
      'Project Lead',
      'Architectural space program verified against the official project brief: 14,970 SQ.M. BUA, 156 keys (168 bays including 4 Presidential Suites on the 6th floor), 350 Pax banquet, and 150 Pax ADD confirmed.',
      'Concept & architectural space program',
      'Progress'
    );
  });

  tx();
  saveDatabaseSnapshot();
  console.log(`✓ Vizag Hotel & Suites ("${projectId}") successfully pre-loaded with complete Area Program!`);
}

// Run immediately if executed via CLI
if (process.argv[1]?.endsWith('seed-vizag-hotel.ts') || process.argv[1]?.endsWith('seed-vizag-hotel.js')) {
  seedVizagHotelProject();
}

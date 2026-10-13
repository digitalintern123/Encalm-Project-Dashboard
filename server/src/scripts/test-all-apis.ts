import express from 'express';
import cors from 'cors';
import { db, initDatabase } from '../db/database.js';
import { seedDatabase } from '../db/seed.js';
import authRouter from '../routes/auth.js';
import projectsRouter from '../routes/projects.js';
import phasesRouter from '../routes/phases.js';
import milestonesRouter from '../routes/milestones.js';
import issuesRouter from '../routes/issues.js';
import { projectUpdatesRouter, globalUpdatesRouter } from '../routes/updates.js';
import notificationsRouter from '../routes/notifications.js';
import systemRouter from '../routes/system.js';
import emailRouter from '../routes/email.js';
import { projectPhotosRouter, globalPhotosRouter } from '../routes/photos.js';

interface TestResult {
  name: string;
  category: string;
  method: string;
  endpoint: string;
  status: number;
  expectedStatus: number;
  passed: boolean;
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  ENCALM PROJECT DASHBOARD - FULL SYSTEM & RBAC AUDIT RUNNER  ');
  console.log('===============================================================\n');

  // 1. Initialize Database
  console.log('Step 1: Checking Database & Schema Initialization...');
  initDatabase();
  seedDatabase(false);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  console.log(`✓ SQLite connected. Tables found (${tables.length}): ${tables.map(t => t.name).join(', ')}`);

  const projectCount = db.prepare('SELECT count(*) as cnt FROM projects').get() as { cnt: number };
  console.log(`✓ Authentic Facilities in DB: ${projectCount.cnt}`);

  // 2. Set up ephemeral Express instance for deterministic testing
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/projects/:id/phases', phasesRouter);
  app.use('/api/projects/:id/milestones', milestonesRouter);
  app.use('/api/projects/:id/issues', issuesRouter);
  app.use('/api/projects/:id/updates', projectUpdatesRouter);
  app.use('/api/projects/:id/photos', projectPhotosRouter);
  app.use('/api/updates', globalUpdatesRouter);
  app.use('/api/photos', globalPhotosRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/email', emailRouter);
  app.use('/api/system', systemRouter);

  // Start test server on dynamic ephemeral port
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5001;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`✓ Test API server listening on ${baseUrl}\n`);

  let currentAuthToken = '';

  async function testApi(
    name: string,
    category: string,
    method: string,
    path: string,
    body?: any,
    expectedStatus: number = 200,
    validator?: (data: any) => boolean | string,
    customToken?: string | null
  ) {
    const start = Date.now();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const tokenToUse = customToken !== undefined ? customToken : currentAuthToken;
      if (tokenToUse) {
        headers['Authorization'] = `Bearer ${tokenToUse}`;
      }

      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const durationMs = Date.now() - start;
      const json = await res.json().catch(() => null);

      let customCheckPass = true;
      let checkDetail = '';
      if (validator && json) {
        const valRes = validator(json);
        if (typeof valRes === 'string') {
          customCheckPass = false;
          checkDetail = valRes;
        } else if (valRes === false) {
          customCheckPass = false;
          checkDetail = 'Validation assertion failed';
        }
      }

      const passed = res.status === expectedStatus && customCheckPass;
      results.push({
        name,
        category,
        method,
        endpoint: path,
        status: res.status,
        expectedStatus,
        passed,
        durationMs,
        details: checkDetail || (json?.error ? String(json.error) : undefined),
      });

      const icon = passed ? '✓' : '✗';
      console.log(` ${icon} [${category}] ${method} ${path} -> ${res.status} (${durationMs}ms)`);
      if (!passed && checkDetail) {
        console.log(`   └─ Error: ${checkDetail}`);
      }
    } catch (err: any) {
      const durationMs = Date.now() - start;
      results.push({
        name,
        category,
        method,
        endpoint: path,
        status: 0,
        expectedStatus,
        passed: false,
        durationMs,
        details: err.message,
      });
      console.log(` ✗ [${category}] ${method} ${path} -> FAILED (${err.message})`);
    }
  }

  console.log('Step 2: Executing API Route & RBAC Tests...\n');

  // --- 1. System Health & Probes ---
  await testApi('System Health Check (Liveness)', 'System', 'GET', '/api/system/health', undefined, 200, (d) => {
    return d.status === 'healthy' && d.counts?.projects >= 68;
  });

  await testApi('System Ready Probe (Readiness)', 'System', 'GET', '/api/system/ready', undefined, 200, (d) => {
    return d.status === 'ready';
  });

  // --- 2. Security Negative Test: Unauthenticated Mutation Lockdown ---
  await testApi('Reject Unauthenticated Delete Project', 'Security', 'DELETE', '/api/projects/delhi-cip-delhi', undefined, 401, (d) => {
    return d.error && d.error.includes('Unauthorized');
  }, null);

  await testApi('Reject Unauthenticated Phase Creation', 'Security', 'POST', '/api/projects/delhi-cip-delhi/phases', {
    name: 'Hacker Stage',
    owner: 'Unknown',
    status: 'upcoming',
  }, 401, undefined, null);

  // --- 3. Auth APIs: Users list & HOD Login ---
  await testApi('List System Users', 'Auth', 'GET', '/api/auth/users', undefined, 200, (d) => {
    return Array.isArray(d.users) && d.users.length >= 3;
  });

  let hodToken = '';
  await testApi('Login with HOD Account', 'Auth', 'POST', '/api/auth/login', {
    email: 'hod@encalm.com',
    password: 'encalm',
  }, 200, (d) => {
    hodToken = d.token;
    return Boolean(d.token && d.user?.role === 'hod');
  });

  // --- 4. Security Negative Test: HOD View-Only Enforcement ---
  await testApi('Reject HOD Mutating Project Issues', 'Security', 'POST', '/api/projects/delhi-cip-delhi/issues', {
    title: 'HOD Attempted Issue',
    detail: 'Should fail',
    severity: 'Medium',
    owner: 'HOD',
  }, 403, (d) => {
    return d.error && d.error.includes('HOD role has strict view-only oversight');
  }, hodToken);

  await testApi('Reject HOD Deleting Milestone', 'Security', 'DELETE', '/api/projects/delhi-cip-delhi/milestones/some-ms', undefined, 403, (d) => {
    return d.error && d.error.includes('HOD role has strict view-only oversight');
  }, hodToken);

  // --- 5. Auth APIs: Lead Login ---
  let leadToken = '';
  await testApi('Login with Lead Account (Chinmay)', 'Auth', 'POST', '/api/auth/login', {
    email: 'chinmay.saxena@encalm.com',
    password: 'encalm',
  }, 200, (d) => {
    leadToken = d.token;
    currentAuthToken = d.token;
    return Boolean(d.token && d.user?.email === 'chinmay.saxena@encalm.com');
  });

  // --- 6. Security Negative Test: Lead Cross-Project Isolation ---
  // delhi-cip-delhi is allotted to Saharsh Tandon, not Chinmay Saxena
  await testApi('Reject Lead Editing Other Lead Project', 'Security', 'POST', '/api/projects/delhi-cip-delhi/phases', {
    name: 'Unauthorized Stage',
    owner: 'Chinmay',
    status: 'upcoming',
  }, 403, (d) => {
    return d.error && d.error.includes('You can only edit projects allotted to you');
  }, leadToken);

  await testApi('Reject Lead Deleting Entire Project', 'Security', 'DELETE', '/api/projects/delhi-cip-delhi', undefined, 403, undefined, leadToken);

  // --- 7. Positive Test: Lead Managing Own Allotted Project ---
  // delhi-1st-class-lounge-inl-07-07a-xenia is allotted to Chinmay Saxena
  const chinmayProjectId = 'delhi-1st-class-lounge-inl-07-07a-xenia';
  await testApi('Get Single Project Detail', 'Projects', 'GET', `/api/projects/${chinmayProjectId}`, undefined, 200, (d) => {
    return Boolean(d.project && d.project.id === chinmayProjectId && Array.isArray(d.project.phases));
  });

  let createdPhaseId: string | undefined;
  await testApi('Lead Add Project Phase/Stage to Own Project', 'Phases', 'POST', `/api/projects/${chinmayProjectId}/phases`, {
    name: 'Diagnostic Test Phase',
    owner: 'Quality Assurance',
    status: 'upcoming',
    progress: 0,
  }, 201, (d) => {
    const phase = d.project?.phases?.find((p: any) => p.name === 'Diagnostic Test Phase');
    if (phase) createdPhaseId = phase.id;
    return Boolean(phase);
  }, leadToken);

  if (createdPhaseId) {
    await testApi('Lead Clean up Own Project Phase', 'Phases', 'DELETE', `/api/projects/${chinmayProjectId}/phases/${createdPhaseId}`, undefined, 200, undefined, leadToken);
  }

  let createdMilestoneId: string | undefined;
  await testApi('Lead Add Milestone to Own Project', 'Milestones', 'POST', `/api/projects/${chinmayProjectId}/milestones`, {
    title: 'Diagnostic Test Milestone',
    date: '2026-12-31',
    status: 'upcoming',
    stage: 'Planning',
    owner: 'QA Lead',
    approvalRequired: false,
    approvalStatus: 'Not required',
  }, 201, (d) => {
    const ms = d.project?.milestones?.find((m: any) => m.title === 'Diagnostic Test Milestone');
    if (ms) createdMilestoneId = ms.id;
    return Boolean(ms);
  }, leadToken);

  if (createdMilestoneId) {
    await testApi('Lead Clean up Own Milestone', 'Milestones', 'DELETE', `/api/projects/${chinmayProjectId}/milestones/${createdMilestoneId}`, undefined, 200, undefined, leadToken);
  }

  let createdIssueId: string | undefined;
  await testApi('Lead Add Issue to Own Project', 'Issues', 'POST', `/api/projects/${chinmayProjectId}/issues`, {
    title: 'Diagnostic Test Issue',
    detail: 'Verification of issue creation',
    severity: 'Low',
    owner: 'QA Engineer',
    category: 'Other',
  }, 201, (d) => {
    const issue = d.project?.issues?.find((i: any) => i.title === 'Diagnostic Test Issue');
    if (issue) createdIssueId = issue.id;
    return Boolean(issue);
  }, leadToken);

  if (createdIssueId) {
    await testApi('Lead Clean up Own Issue', 'Issues', 'DELETE', `/api/projects/${chinmayProjectId}/issues/${createdIssueId}`, undefined, 200, undefined, leadToken);
  }

  // Updates & Photos
  await testApi('Get Global Updates', 'Updates', 'GET', '/api/updates', undefined, 200);
  await testApi('Get Project Updates', 'Updates', 'GET', `/api/projects/${chinmayProjectId}/updates`, undefined, 200);
  await testApi('Lead Post Update to Own Project', 'Updates', 'POST', `/api/projects/${chinmayProjectId}/updates`, {
    text: 'Audit test update for automated verification suite.',
    author: 'Chinmay Saxena',
    role: 'Lead',
    kind: 'Progress',
  }, 201, undefined, leadToken);

  await testApi('Get Global Photos', 'Photos', 'GET', '/api/photos', undefined, 200);
  await testApi('Get Project Photos', 'Photos', 'GET', `/api/projects/${chinmayProjectId}/photos`, undefined, 200);
  await testApi('Get Notifications', 'Notifications', 'GET', '/api/notifications', undefined, 200);

  // --- 8. Coordinator Supervisory Operations ---
  let coordinatorToken = '';
  await testApi('Login with Coordinator Account', 'Auth', 'POST', '/api/auth/login', {
    email: 'digital.intern@encalm.com',
    password: 'encalm',
  }, 200, (d) => {
    coordinatorToken = d.token;
    currentAuthToken = d.token;
    return Boolean(d.token && d.user?.role === 'coordinator');
  });

  // Snapshot existing system_settings before running destructive settings tests
  const savedSettings = db.prepare('SELECT key, value, updated_at FROM system_settings').all() as Array<{
    key: string;
    value: string;
    updated_at: string;
  }>;

  try {
    await testApi('Coordinator Save SMTP Settings', 'Email', 'POST', '/api/email/settings', {
      provider: 'smtp',
      smtp: {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        user: 'notifications@outlook.com',
        pass: 'test-app-password-16ch',
        fromName: 'Encalm Audit',
      },
    }, 200, (d) => {
      return d.settings?.provider === 'smtp' && d.settings?.smtp?.isConfigured === true;
    }, coordinatorToken);

    await testApi('Coordinator Save Microsoft Graph Settings', 'Email', 'POST', '/api/email/settings', {
      provider: 'microsoft_graph',
      tenantId: 'test-azure-tenant-id-84a7e930',
      clientId: 'test-azure-client-id-3df2a510',
      clientSecret: 'test-secret-value-12345',
      senderEmail: 'notifications@encalm.com',
      saveToSentItems: true,
    }, 200, (d) => {
      return d.settings?.provider === 'microsoft_graph' && d.settings?.isConfigured === true;
    }, coordinatorToken);
  } finally {
    // Restore original system_settings immediately so live email & directory services remain intact
    const restoreTx = db.transaction(() => {
      db.prepare('DELETE FROM system_settings').run();
      const ins = db.prepare('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)');
      for (const row of savedSettings) {
        ins.run(row.key, row.value, row.updated_at);
      }
    });
    restoreTx();
  }

  await testApi('Get Email Logs / Outbox', 'Email', 'GET', '/api/email/logs', undefined, 200, (d) => {
    return Array.isArray(d.logs);
  });

  await testApi('Tag Member & Send Notification', 'Email', 'POST', '/api/email/tag-and-comment', {
    projectId: chinmayProjectId,
    entityType: 'Stage',
    entityId: 'stage-1',
    entityTitle: 'Stage 1: Concept & Planning',
    entityContext: 'Final drawings ready for approval.',
    taggedUserIds: ['user-ruchika-chauhan'],
    comment: 'Audit comment: Please verify drawings.',
    authorName: 'Audit System',
  }, 200, (d) => {
    return d.success === true && Array.isArray(d.recipients) && d.recipients.length > 0;
  }, coordinatorToken);

  // Clean up diagnostic test updates from DB
  try {
    db.prepare("DELETE FROM updates WHERE text LIKE '%Audit test update%' OR text LIKE '%Audit comment:%'").run();
    db.prepare("DELETE FROM notifications WHERE message LIKE '%Audit comment:%'").run();
  } catch {}

  // Close test server
  server.close();

  // Print scorecard summary
  console.log('\n===============================================================');
  console.log('                    AUDIT SCORECARD SUMMARY                    ');
  console.log('===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Endpoints Tested : ${total}`);
  console.log(`Passed                 : ${passed} / ${total} (${Math.round((passed / total) * 100)}%)`);
  console.log(`Failed                 : ${failed}`);
  console.log('---------------------------------------------------------------');

  results.forEach((r, idx) => {
    const mark = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${String(idx + 1).padStart(2, ' ')}. [${mark}] [${r.category}] ${r.method.padEnd(4, ' ')} ${r.endpoint} (${r.durationMs}ms)`);
  });
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});

import http from 'node:http';

const BASE_URL = 'http://127.0.0.1:5000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(
      url,
      { method, headers: reqHeaders },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('--- Starting E2E Smoke Tests (Clean Slate) ---');

  // 1. Health
  console.log('Testing GET /api/system/health...');
  const health = await request('GET', '/api/system/health');
  if (health.status !== 200 || health.data.status !== 'healthy') {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log('✓ Health check passed:', health.data.counts);

  // 2. Login Lead
  console.log('Testing Lead Login...');
  const leadLogin = await request('POST', '/api/auth/login', {
    email: 'lead@encalm.com',
    password: 'encalm'
  });
  if (leadLogin.status !== 200 || !leadLogin.data.token) {
    throw new Error(`Lead login failed: ${JSON.stringify(leadLogin)}`);
  }
  const leadToken = leadLogin.data.token;
  console.log('✓ Lead logged in as:', leadLogin.data.user.name, `(${leadLogin.data.user.role})`);

  // 3. Login HOD
  console.log('Testing HOD Login...');
  const hodLogin = await request('POST', '/api/auth/login', {
    email: 'hod@encalm.com',
    password: 'encalm'
  });
  if (hodLogin.status !== 200 || !hodLogin.data.token) {
    throw new Error(`HOD login failed: ${JSON.stringify(hodLogin)}`);
  }
  const hodToken = hodLogin.data.token;
  console.log('✓ HOD logged in as:', hodLogin.data.user.name, `(${hodLogin.data.user.role})`);

  // 4. Create a new project as Lead
  console.log('Testing POST /api/projects (creating new project from scratch)...');
  const createRes = await request(
    'POST',
    '/api/projects',
    {
      name: 'Goa Business Hotel & Lounge',
      location: 'Goa',
      category: 'Hotel',
      code: 'GOA-HOTEL-01',
      health: 'On track',
      progress: 25,
      targetDate: '2026-12-31',
      targetLabel: '31 Dec 2026',
      aop: 85000000,
      awarded: 42000000,
      spent: 10500000,
      nextMilestone: 'Structure Completion Sign-off',
      nextMilestoneDate: '2026-10-15',
      phases: [
        { name: 'Concept & Brief', status: 'complete', progress: 100, owner: 'Lead Architect' },
        { name: 'Detailed Design', status: 'active', progress: 50, owner: 'Lead Architect' },
        { name: 'Procurement', status: 'upcoming', progress: 0, owner: 'Sourcing' },
      ],
      milestones: [
        {
          id: 'goa-milestone-1',
          title: 'Structure Completion Sign-off',
          date: '2026-10-15',
          status: 'upcoming',
          approvalRequired: true,
          approvalStatus: 'Pending',
          stage: 'Detailed Design',
          owner: 'Chinmay Saxena'
        }
      ],
      issues: [],
      updates: []
    },
    { Authorization: `Bearer ${leadToken}` }
  );

  if (createRes.status !== 201 || !createRes.data.project) {
    throw new Error(`Project creation failed: ${JSON.stringify(createRes)}`);
  }
  const createdProject = createRes.data.project;
  console.log(`✓ Project created: "${createdProject.name}" (ID: ${createdProject.id})`);

  // 5. Update project as Lead
  console.log('Testing Lead Project update...');
  const updateRes = await request(
    'PATCH',
    `/api/projects/${createdProject.id}`,
    { progress: 30 },
    { Authorization: `Bearer ${leadToken}` }
  );
  if (updateRes.status !== 200 || updateRes.data.project.progress !== 30) {
    throw new Error(`Project progress update failed: ${JSON.stringify(updateRes)}`);
  }
  console.log('✓ Project progress updated to 30% by Lead');

  // 6. Test HOD forbidden to edit general project fields
  console.log('Testing HOD RBAC restriction on project update...');
  const hodUpdateRes = await request(
    'PATCH',
    `/api/projects/${createdProject.id}`,
    { progress: 99 },
    { Authorization: `Bearer ${hodToken}` }
  );
  if (hodUpdateRes.status !== 403) {
    throw new Error(`Expected 403 for HOD edit, got ${hodUpdateRes.status}`);
  }
  console.log('✓ HOD write restriction correctly enforced (403 Forbidden)');

  // 7. Milestone approval by HOD
  const testMilestone = createdProject.milestones[0];
  console.log(`Testing HOD milestone approval for: ${testMilestone.title}...`);
  const milestoneRes = await request(
    'PATCH',
    `/api/projects/${createdProject.id}/milestones/${testMilestone.id}`,
    { approvalStatus: 'Approved' },
    { Authorization: `Bearer ${hodToken}` }
  );
  if (milestoneRes.status !== 200) {
    throw new Error(`Milestone approval failed: ${JSON.stringify(milestoneRes)}`);
  }
  console.log('✓ Milestone approval successfully recorded by HOD');

  // 8. Notifications listing
  console.log('Testing Notifications retrieval...');
  const notifRes = await request('GET', '/api/notifications', null, {
    Authorization: `Bearer ${leadToken}`,
  });
  if (notifRes.status !== 200 || !Array.isArray(notifRes.data.notifications)) {
    throw new Error(`Fetch notifications failed: ${JSON.stringify(notifRes)}`);
  }
  console.log(`✓ Notifications functional: ${notifRes.data.notifications.length} alerts loaded`);

  // 9. Reset database back to clean slate
  console.log('Testing System Reset / Clear...');
  const resetRes = await request('POST', '/api/system/reset');
  if (resetRes.status !== 200 || !resetRes.data.message) {
    throw new Error(`Database reset failed: ${JSON.stringify(resetRes)}`);
  }
  console.log('✓ System reset back to clean slate succeeded:', resetRes.data.message);

  console.log('\n--- ALL E2E SMOKE TESTS PASSED CLEANLY ---');
}

run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

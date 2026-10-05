import { Router } from 'express';
import { db } from '../db/database.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getSmtpConfig,
  saveSmtpConfig,
  sendEmail,
  resendEmailLog,
  buildTestEmailHtml,
  buildProjectSummaryHtml,
} from '../services/email.js';
import { fetchFullProject } from './projects.js';

const router = Router();

// GET email logs / outbox
router.get('/logs', optionalAuth, (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  const limit = Math.min(100, parseInt((req.query.limit as string) || '50', 10));

  let query = 'SELECT * FROM email_logs';
  const params: any[] = [];

  if (projectId) {
    query += ' WHERE project_id = ?';
    params.push(projectId);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const logs = db.prepare(query).all(...params) as any[];

  return res.json({
    logs: logs.map((l) => ({
      id: l.id,
      recipientEmail: l.recipient_email,
      recipientName: l.recipient_name,
      subject: l.subject,
      templateType: l.template_type,
      projectId: l.project_id,
      status: l.status,
      htmlContent: l.html_content,
      error: l.error,
      createdAt: l.created_at,
    })),
  });
});

// GET email settings (with masked password)
router.get('/settings', optionalAuth, (req, res) => {
  const config = getSmtpConfig();
  return res.json({
    settings: {
      host: config.host || '',
      port: config.port || 587,
      secure: config.secure || false,
      user: config.user || '',
      pass: config.pass ? '••••••••' : '',
      from: config.from || 'Encalm Projects <notifications@encalm.com>',
      isConfigured: Boolean(config.host && config.user),
    },
  });
});

// POST save email settings
router.post('/settings', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { host, port, secure, user, pass, from } = req.body;

  saveSmtpConfig({
    host,
    port: port ? Number(port) : undefined,
    secure: Boolean(secure),
    user,
    pass,
    from,
  });

  const updated = getSmtpConfig();
  return res.json({
    message: 'SMTP settings updated successfully',
    settings: {
      host: updated.host || '',
      port: updated.port || 587,
      secure: updated.secure || false,
      user: updated.user || '',
      pass: updated.pass ? '••••••••' : '',
      from: updated.from || 'Encalm Projects <notifications@encalm.com>',
      isConfigured: Boolean(updated.host && updated.user),
    },
  });
});

// POST send test email
router.post('/test', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const { to, recipientName } = req.body;
  const targetEmail = to || req.user?.email || 'hod@encalm.com';
  const name = recipientName || req.user?.name || 'Encalm User';

  const html = buildTestEmailHtml(name);
  const result = await sendEmail({
    to: targetEmail,
    recipientName: name,
    subject: 'Encalm Projects - SMTP Delivery Test',
    html,
    templateType: 'test_email',
  });

  return res.json({
    success: result.status === 'sent',
    result,
    message:
      result.status === 'sent'
        ? `Test email sent successfully to ${targetEmail}`
        : result.status === 'outbox'
          ? `SMTP not configured: Email queued in dashboard Outbox`
          : `Failed to deliver email: ${result.error}`,
  });
});

// POST resend log entry
router.post('/resend/:id', optionalAuth, async (req, res) => {
  const id = req.params.id as string;
  const result = await resendEmailLog(id);
  return res.json(result);
});

// POST send executive project update to stakeholders
router.post('/send-project-update', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const { projectId, recipients, customNote } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const project = fetchFullProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const senderName = req.user?.name || 'Project Lead';
  const targetRecipients: { email: string; name: string }[] = [];

  if (Array.isArray(recipients) && recipients.length > 0) {
    recipients.forEach((r: any) => {
      if (typeof r === 'string' && r.includes('@')) {
        targetRecipients.push({ email: r, name: r.split('@')[0] });
      } else if (r && typeof r === 'object' && r.email) {
        targetRecipients.push({ email: r.email, name: r.name || r.email });
      }
    });
  } else {
    // Default to authentic system users
    const allUsers = db.prepare('SELECT email, name FROM users').all() as { email: string; name: string }[];
    targetRecipients.push(...allUsers.filter((u) => u.email));
  }

  const origin = req.headers.origin || 'http://localhost:5173';
  const dashboardUrl = `${origin}/project/${projectId}`;

  const dispatchResults: any[] = [];
  for (const rc of targetRecipients) {
    const html = buildProjectSummaryHtml({
      recipientName: rc.name,
      projectName: project.name,
      senderName,
      progress: project.progress,
      health: project.health,
      status: project.status,
      customNote,
      dashboardUrl,
    });

    const result = await sendEmail({
      to: rc.email,
      recipientName: rc.name,
      subject: `Project Update: ${project.name} (${project.progress}% Complete)`,
      html,
      templateType: 'project_summary',
      projectId,
    });

    dispatchResults.push({ recipient: rc.email, ...result });
  }

  return res.json({
    success: true,
    message: `Dispatched project summary to ${dispatchResults.length} recipient(s)`,
    results: dispatchResults,
  });
});

export default router;

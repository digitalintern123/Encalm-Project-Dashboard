import nodemailer, { type Transporter } from 'nodemailer';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';

export interface EmailLogEntry {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  templateType: string;
  projectId: string | null;
  status: 'sent' | 'failed' | 'outbox';
  htmlContent: string;
  error: string | null;
  createdAt: string;
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

/**
 * Retrieve SMTP configuration from system_settings table, falling back to environment variables.
 */
export function getSmtpConfig(): SmtpConfig {
  const getSetting = (key: string): string | undefined => {
    try {
      const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as { value: string } | undefined;
      return row ? row.value : undefined;
    } catch {
      return undefined;
    }
  };

  const host = getSetting('smtp_host') || process.env.SMTP_HOST || '';
  const portStr = getSetting('smtp_port') || process.env.SMTP_PORT || '587';
  const secureStr = getSetting('smtp_secure') || process.env.SMTP_SECURE || 'false';
  const user = getSetting('smtp_user') || process.env.SMTP_USER || '';
  const pass = getSetting('smtp_pass') || process.env.SMTP_PASS || '';
  const from = getSetting('smtp_from') || process.env.SMTP_FROM || 'Encalm Projects <notifications@encalm.com>';

  return {
    host: host.trim(),
    port: parseInt(portStr, 10) || 587,
    secure: secureStr === 'true' || secureStr === '1',
    user: user.trim(),
    pass: pass.trim(),
    from: from.trim(),
  };
}

/**
 * Save SMTP settings into SQLite system_settings table
 */
export function saveSmtpConfig(config: Partial<SmtpConfig>): void {
  const upsert = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  const tx = db.transaction(() => {
    if (config.host !== undefined) upsert.run('smtp_host', config.host);
    if (config.port !== undefined) upsert.run('smtp_port', String(config.port));
    if (config.secure !== undefined) upsert.run('smtp_secure', String(config.secure));
    if (config.user !== undefined) upsert.run('smtp_user', config.user);
    if (config.pass !== undefined && config.pass !== '••••••••') upsert.run('smtp_pass', config.pass);
    if (config.from !== undefined) upsert.run('smtp_from', config.from);
  });

  tx();
}

/**
 * Construct Nodemailer transport. Returns null if host or user is omitted.
 */
function getTransporter(): Transporter | null {
  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user) {
    return null;
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    tls: {
      rejectUnauthorized: false, // Permit self-signed corporate internal certificates
    },
  });
}

export interface SendEmailOptions {
  to: string;
  recipientName?: string;
  subject: string;
  html: string;
  templateType: 'tag_notification' | 'critical_issue' | 'milestone_approval' | 'project_summary' | 'test_email';
  projectId?: string;
}

/**
 * Core email dispatcher with automatic in-app Outbox fallback.
 * Never throws errors to calling controllers; logs delivery status into SQLite.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  id: string;
  status: 'sent' | 'failed' | 'outbox';
  error?: string;
}> {
  const emailId = `eml-${randomUUID()}`;
  const cfg = getSmtpConfig();
  const transporter = getTransporter();

  // If no SMTP host is configured, store directly in outbox for review
  if (!transporter) {
    try {
      db.prepare(`
        INSERT INTO email_logs (id, recipient_email, recipient_name, subject, template_type, project_id, status, html_content, error, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'outbox', ?, 'SMTP not configured - Queued in in-app outbox', datetime('now'))
      `).run(
        emailId,
        options.to,
        options.recipientName || null,
        options.subject,
        options.templateType,
        options.projectId || null,
        options.html
      );
      console.log(`[Email Outbox] Queued email "${options.subject}" to ${options.to}`);
      return { id: emailId, status: 'outbox', error: 'SMTP not configured' };
    } catch (err: any) {
      console.error('[Email Outbox Save Error]', err);
      return { id: emailId, status: 'outbox', error: err.message };
    }
  }

  // Attempt real SMTP dispatch
  try {
    await transporter.sendMail({
      from: cfg.from || 'Encalm Projects <notifications@encalm.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    db.prepare(`
      INSERT INTO email_logs (id, recipient_email, recipient_name, subject, template_type, project_id, status, html_content, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, null, datetime('now'))
    `).run(
      emailId,
      options.to,
      options.recipientName || null,
      options.subject,
      options.templateType,
      options.projectId || null,
      options.html
    );

    console.log(`[Email Sent] Delivered "${options.subject}" to ${options.to}`);
    return { id: emailId, status: 'sent' };
  } catch (error: any) {
    const errorMsg = error?.message || 'SMTP delivery failed';
    console.warn(`[Email Failed] Could not deliver to ${options.to}:`, errorMsg);

    db.prepare(`
      INSERT INTO email_logs (id, recipient_email, recipient_name, subject, template_type, project_id, status, html_content, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, ?, datetime('now'))
    `).run(
      emailId,
      options.to,
      options.recipientName || null,
      options.subject,
      options.templateType,
      options.projectId || null,
      options.html,
      errorMsg
    );

    return { id: emailId, status: 'failed', error: errorMsg };
  }
}

/**
 * Resend an email from the log table
 */
export async function resendEmailLog(id: string): Promise<{ success: boolean; status: string; error?: string }> {
  const row = db.prepare('SELECT * FROM email_logs WHERE id = ?').get(id) as any;
  if (!row) {
    return { success: false, status: 'not_found', error: 'Email record not found' };
  }

  const transporter = getTransporter();
  const cfg = getSmtpConfig();

  if (!transporter) {
    return { success: false, status: 'outbox', error: 'SMTP is not yet configured' };
  }

  try {
    await transporter.sendMail({
      from: cfg.from || 'Encalm Projects <notifications@encalm.com>',
      to: row.recipient_email,
      subject: row.subject,
      html: row.html_content,
    });

    db.prepare('UPDATE email_logs SET status = "sent", error = null WHERE id = ?').run(id);
    return { success: true, status: 'sent' };
  } catch (err: any) {
    const errorMsg = err.message || 'Resend failed';
    db.prepare('UPDATE email_logs SET status = "failed", error = ? WHERE id = ?').run(errorMsg, id);
    return { success: false, status: 'failed', error: errorMsg };
  }
}

/* ========================================================================= */
/*                          Branded HTML Templates                           */
/* ========================================================================= */

function baseEmailWrapper(contentHtml: string, previewText: string = 'Encalm Projects Notification'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${previewText}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f5ef;
      color: #1a202c;
    }
    .wrapper {
      max-width: 600px;
      margin: 24px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2ddd3;
      box-shadow: 0 4px 20px rgba(23, 62, 73, 0.06);
    }
    .header {
      background: #173e49;
      padding: 24px 32px;
      border-bottom: 3px solid #d19b35;
    }
    .brand {
      color: #ffffff;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .brand-sub {
      color: #d19b35;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .body-content {
      padding: 32px;
      font-size: 14px;
      line-height: 1.6;
      color: #2d3748;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-gold { background: #fdf3d8; color: #9a711f; border: 1px solid #eadcb1; }
    .badge-teal { background: #edf5f0; color: #2e7c67; border: 1px solid #cbe4d9; }
    .badge-red { background: #fae5e1; color: #b2473d; border: 1px solid #f3c2bc; }
    .card-box {
      background: #faf8f2;
      border: 1px solid #e8e3d5;
      border-radius: 8px;
      padding: 18px;
      margin: 20px 0;
    }
    .btn {
      display: inline-block;
      background: #2e7c67;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-top: 16px;
    }
    .footer {
      background: #faf8f2;
      padding: 20px 32px;
      border-top: 1px solid #e8e3d5;
      font-size: 11px;
      color: #718096;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">ENCALM HOSPITALITY</div>
      <div class="brand-sub">Project Delivery Radar & Governance</div>
    </div>
    <div class="body-content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">This is an automated notification from the <strong>Encalm Projects Dashboard</strong>.</p>
      <p style="margin: 0;">Encalm Hospitality Private Limited • Airport Lounges, Transit Hotels & F&B Operations</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Template 1: User Tag Notification
 */
export function buildTagNotificationHtml(data: {
  recipientName: string;
  taggedByName: string;
  entityType: 'Task' | 'Stage' | 'Milestone' | 'Issue';
  entityTitle: string;
  entityContext?: string;
  projectName: string;
  dashboardUrl: string;
}): string {
  return baseEmailWrapper(`
    <p style="font-size: 16px; font-weight: 700; color: #173e49; margin-top: 0;">
      Hello ${data.recipientName},
    </p>
    <p>
      <strong>${data.taggedByName}</strong> tagged you on a <strong>${data.entityType}</strong> in the project 
      <span class="badge badge-teal">${data.projectName}</span>.
    </p>

    <div class="card-box">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #718096; margin-bottom: 6px;">
        Tagged Item (${data.entityType})
      </div>
      <div style="font-size: 16px; font-weight: 700; color: #173e49; margin-bottom: 8px;">
        ${data.entityTitle}
      </div>
      ${data.entityContext ? `<p style="margin: 0; font-size: 13px; color: #4a5568;">${data.entityContext}</p>` : ''}
    </div>

    <p style="margin-bottom: 0;">
      Please review the details, take necessary action, or collaborate on this item directly in the dashboard:
    </p>

    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" class="btn" target="_blank">View in Project Dashboard →</a>
    </div>
  `, `Tagged in ${data.projectName}: ${data.entityTitle}`);
}

/**
 * Template 2: Critical Issue Alert
 */
export function buildCriticalIssueHtml(data: {
  recipientName: string;
  issueTitle: string;
  severity: string;
  category?: string;
  detail: string;
  projectName: string;
  raisedBy?: string;
  dashboardUrl: string;
}): string {
  return baseEmailWrapper(`
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <span class="badge badge-red">CRITICAL ISSUE ALERT</span>
      <span class="badge badge-gold">${data.projectName}</span>
    </div>

    <p style="font-size: 16px; font-weight: 700; color: #b2473d; margin-top: 0;">
      Attention ${data.recipientName},
    </p>
    <p>
      A high-severity issue requiring immediate leadership oversight has been logged on <strong>${data.projectName}</strong>.
    </p>

    <div class="card-box" style="border-left: 4px solid #b2473d;">
      <div style="font-size: 15px; font-weight: 700; color: #173e49; margin-bottom: 6px;">
        ${data.issueTitle}
      </div>
      <div style="font-size: 12px; color: #718096; margin-bottom: 12px;">
        Severity: <strong style="color: #b2473d;">${data.severity}</strong> &nbsp;•&nbsp; 
        Category: <strong>${data.category || 'General'}</strong>
        ${data.raisedBy ? ` &nbsp;•&nbsp; Raised by: <strong>${data.raisedBy}</strong>` : ''}
      </div>
      <p style="margin: 0; font-size: 13px; color: #2d3748; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2ddd3;">
        ${data.detail}
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" class="btn" style="background: #b2473d;" target="_blank">Review Critical Issue →</a>
    </div>
  `, `Critical Issue Alert: ${data.projectName}`);
}

/**
 * Template 3: Milestone Approval Required
 */
export function buildMilestoneApprovalHtml(data: {
  recipientName: string;
  milestoneTitle: string;
  targetDate: string;
  stage?: string;
  projectName: string;
  dashboardUrl: string;
}): string {
  return baseEmailWrapper(`
    <p style="font-size: 16px; font-weight: 700; color: #173e49; margin-top: 0;">
      Dear ${data.recipientName},
    </p>
    <p>
      A milestone requiring governance sign-off on <strong>${data.projectName}</strong> is waiting for review.
    </p>

    <div class="card-box">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #718096; margin-bottom: 6px;">
        Milestone Pending Approval
      </div>
      <div style="font-size: 16px; font-weight: 700; color: #173e49; margin-bottom: 8px;">
        ${data.milestoneTitle}
      </div>
      <div style="font-size: 12px; color: #4a5568;">
        Target Date: <strong>${data.targetDate}</strong> 
        ${data.stage ? `&nbsp;•&nbsp; Stage: <strong>${data.stage}</strong>` : ''}
      </div>
    </div>

    <p>As Project Coordinator, please log in to approve or reject this milestone milestone request.</p>

    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" class="btn" target="_blank">Review & Sign Off Milestone →</a>
    </div>
  `, `Milestone Approval: ${data.milestoneTitle}`);
}

/**
 * Template 4: Executive Project Summary
 */
export function buildProjectSummaryHtml(data: {
  recipientName: string;
  projectName: string;
  senderName: string;
  progress: number;
  health: string;
  status: string;
  customNote?: string;
  dashboardUrl: string;
}): string {
  return baseEmailWrapper(`
    <p style="font-size: 16px; font-weight: 700; color: #173e49; margin-top: 0;">
      Hello ${data.recipientName},
    </p>
    <p>
      <strong>${data.senderName}</strong> has shared an executive project status update for <strong>${data.projectName}</strong>.
    </p>

    <div class="card-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 16px; font-weight: 700; color: #173e49;">${data.projectName}</span>
        <span class="badge badge-teal">${data.status}</span>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0;">
        <tr>
          <td style="padding: 6px 0; color: #718096;">Progress:</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #2e7c67;">${data.progress}% Completed</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #718096;">Health:</td>
          <td style="padding: 6px 0; font-weight: 700; text-align: right;">${data.health}</td>
        </tr>
      </table>

      ${data.customNote ? `
        <div style="margin-top: 12px; padding: 12px; background: #ffffff; border-radius: 6px; border: 1px solid #e2ddd3;">
          <div style="font-size: 11px; text-transform: uppercase; color: #718096; font-weight: 700; margin-bottom: 4px;">Executive Note:</div>
          <div style="font-size: 13px; color: #2d3748; white-space: pre-wrap;">${data.customNote}</div>
        </div>
      ` : ''}
    </div>

    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" class="btn" target="_blank">Open Project in Dashboard →</a>
    </div>
  `, `Project Update: ${data.projectName}`);
}

/**
 * Template 5: SMTP Test Email
 */
export function buildTestEmailHtml(recipientName: string): string {
  return baseEmailWrapper(`
    <p style="font-size: 16px; font-weight: 700; color: #2e7c67; margin-top: 0;">
      ✓ SMTP Integration Connected Successfully!
    </p>
    <p>
      Hello <strong>${recipientName}</strong>,
    </p>
    <p>
      This is a test notification confirming that the Encalm Projects Dashboard email service is operational and properly authenticated with your SMTP server.
    </p>

    <div class="card-box" style="border-left: 4px solid #2e7c67;">
      <div style="font-size: 13px; color: #2d3748;">
        <strong>Configuration Status:</strong> Active & Verified<br />
        <strong>Timestamp:</strong> ${new Date().toUTCString()}
      </div>
    </div>
  `, 'Encalm Projects SMTP Test Email');
}

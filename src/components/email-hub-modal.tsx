import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Settings,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  X,
  Server,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { api, type EmailLogItem, type EmailSettings } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface EmailHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'outbox' | 'settings' | 'send';
  projectId?: string;
  projectName?: string;
}

export function EmailHubModal({
  isOpen,
  onClose,
  defaultTab = 'outbox',
  projectId,
  projectName,
}: EmailHubModalProps) {
  const [activeTab, setActiveTab] = useState<'outbox' | 'settings' | 'send'>(defaultTab);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<EmailLogItem | null>(null);

  // Microsoft Graph API Settings State
  const [settings, setSettings] = useState<EmailSettings>({
    provider: 'microsoft_graph',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    senderEmail: 'notifications@encalm.com',
    saveToSentItems: true,
    isConfigured: false,
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Send Project Update State
  const [customNote, setCustomNote] = useState('');
  const [recipientInput, setRecipientInput] = useState('');
  const [sendingUpdate, setSendingUpdate] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      loadSettings();
    }
  }, [isOpen, projectId]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.email.getLogs(projectId);
      setLogs(res.logs || []);
    } catch (err: any) {
      console.warn('Failed to load email logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.email.getSettings();
      if (res.settings) {
        setSettings(res.settings);
        if (res.settings.senderEmail && !testEmailAddress) {
          setTestEmailAddress(res.settings.senderEmail);
        }
      }
    } catch (err) {
      console.warn('Failed to load email settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.email.saveSettings(settings);
      setSettings(res.settings);
      toast({
        title: 'Settings Saved',
        description: 'Microsoft Graph API configuration updated successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save Microsoft Graph settings.',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const res = await api.email.sendTest(testEmailAddress || undefined);
      toast({
        title: res.success ? '✓ Graph Email Sent' : 'Queued in Outbox',
        description: res.message,
      });
      loadLogs();
    } catch (err: any) {
      toast({
        title: 'Test Failed',
        description: err.message || 'Could not dispatch test email via Microsoft Graph API.',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleResend = async (logId: string) => {
    try {
      const res = await api.email.resend(logId);
      if (res.success) {
        toast({
          title: 'Email Sent',
          description: 'Successfully redelivered email via SMTP.',
        });
      } else {
        toast({
          title: 'Resend Note',
          description: res.error || 'Failed to dispatch email.',
          variant: 'destructive',
        });
      }
      loadLogs();
    } catch (err: any) {
      toast({
        title: 'Resend Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleSendProjectUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setSendingUpdate(true);
    try {
      const recipients = recipientInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.includes('@'));

      const res = await api.email.sendProjectUpdate(projectId, {
        recipients: recipients.length > 0 ? recipients : undefined,
        customNote: customNote.trim() || undefined,
      });

      toast({
        title: 'Update Dispatched',
        description: res.message,
      });
      setCustomNote('');
      setRecipientInput('');
      setActiveTab('outbox');
      loadLogs();
    } catch (err: any) {
      toast({
        title: 'Dispatch Failed',
        description: err.message || 'Could not send project update.',
        variant: 'destructive',
      });
    } finally {
      setSendingUpdate(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#123b45]/40 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-[#f8f6f0] shadow-2xl animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#edf5f0] text-[#2e7c67]">
              <Mail size={18} />
            </span>
            <div>
              <h2 className="font-serif text-[18px] font-bold text-[#173e49]">
                Email Integration & Communications
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Automated delivery radar, stakeholder notifications & SMTP outbox
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-white/70 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('outbox')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-[12px] font-bold transition ${
              activeTab === 'outbox'
                ? 'border-[#2e7c67] text-[#2e7c67]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Inbox size={14} />
            <span>Outbox & Delivery Logs</span>
            {logs.length > 0 && (
              <span className="rounded-full bg-[#edf5f0] px-2 py-0.5 text-[10px] font-semibold text-[#2e7c67]">
                {logs.length}
              </span>
            )}
          </button>

          {projectId && (
            <button
              type="button"
              onClick={() => setActiveTab('send')}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-[12px] font-bold transition ${
                activeTab === 'send'
                  ? 'border-[#2e7c67] text-[#2e7c67]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Send size={14} />
              <span>Send Executive Update</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-[12px] font-bold transition ${
              activeTab === 'settings'
                ? 'border-[#2e7c67] text-[#2e7c67]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings size={14} />
            <span>SMTP Server Settings</span>
            <span
              className={`size-2 rounded-full ${
                settings.isConfigured ? 'bg-[#3d9a7e]' : 'bg-[#d19b35]'
              }`}
              title={settings.isConfigured ? 'SMTP Configured' : 'Development Outbox Mode'}
            />
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Outbox & Delivery Logs */}
          {activeTab === 'outbox' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-[#173e49]">
                    Communication Log & Outbox Queue
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    All notifications dispatched by the dashboard are tracked here with full HTML preview.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadLogs}
                  disabled={loadingLogs}
                  className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                >
                  <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white/50 py-12 text-center">
                  <Inbox size={28} className="mx-auto text-muted-foreground/60" />
                  <p className="mt-2 text-[12px] font-bold text-[#173e49]">Outbox Empty</p>
                  <p className="text-[11px] text-muted-foreground">
                    When you tag individuals or trigger alerts, email notifications will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border bg-white shadow-xs overflow-hidden">
                  {logs.map((log) => {
                    return (
                      <div
                        key={log.id}
                        className="flex flex-col gap-2 p-3.5 transition hover:bg-[#fbfaf6] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                log.status === 'sent'
                                  ? 'bg-[#edf5f0] text-[#2e7c67] border border-[#cbe4d9]'
                                  : log.status === 'outbox'
                                    ? 'bg-[#fdf3d8] text-[#9a711f] border border-[#eadcb1]'
                                    : 'bg-[#fae5e1] text-[#b2473d] border border-[#f3c2bc]'
                              }`}
                            >
                              {log.status === 'sent' && <CheckCircle2 size={10} />}
                              {log.status === 'outbox' && <Inbox size={10} />}
                              {log.status === 'failed' && <AlertTriangle size={10} />}
                              <span>{log.status}</span>
                            </span>

                            <span className="font-mono text-[10px] text-muted-foreground">
                              {log.createdAt}
                            </span>
                            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground uppercase">
                              {log.templateType.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="mt-1 font-bold text-[12px] text-foreground truncate">
                            {log.subject}
                          </div>

                          <div className="text-[11px] text-muted-foreground">
                            To: <span className="font-semibold text-foreground">{log.recipientEmail}</span>
                            {log.recipientName && <span> ({log.recipientName})</span>}
                            {log.error && (
                              <span className="ml-2 text-[#b2473d]">Note: {log.error}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => setSelectedPreview(log)}
                            className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </button>

                          {(log.status === 'outbox' || log.status === 'failed') && (
                            <button
                              type="button"
                              onClick={() => handleResend(log.id)}
                              className="flex items-center gap-1 rounded-lg border border-[#cbe4d9] bg-[#edf5f0] px-2.5 py-1 text-[11px] font-bold text-[#2e7c67] hover:bg-[#dfeee5]"
                            >
                              <Send size={11} />
                              <span>Dispatch</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Send Executive Update */}
          {activeTab === 'send' && projectId && (
            <form onSubmit={handleSendProjectUpdate} className="space-y-4 max-w-2xl">
              <div>
                <h3 className="text-[13px] font-bold text-[#173e49]">
                  Send Executive Project Status Update
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Dispatch a branded email summary of {projectName || 'this project'} to executive stakeholders.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-white p-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-foreground">
                    Recipients (comma separated emails)
                  </label>
                  <input
                    type="text"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="hod@encalm.com, lead@encalm.com, coordinator@encalm.com"
                    className="mt-1 w-full rounded-lg border border-border bg-[#faf8f3] px-3 py-2 text-[12px] focus:outline-hidden focus:ring-1 focus:ring-[#2e7c67]"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Leave blank to dispatch to all authentic Encalm leadership accounts (HOD, Lead, Coordinator).
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground">
                    Executive Commentary / Note
                  </label>
                  <textarea
                    rows={4}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g. Critical procurement milestones achieved this week; civil structural work remains on schedule for soft opening."
                    className="mt-1 w-full rounded-lg border border-border bg-[#faf8f3] px-3 py-2 text-[12px] focus:outline-hidden focus:ring-1 focus:ring-[#2e7c67]"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={sendingUpdate}
                    className="flex items-center gap-1.5 rounded-lg bg-[#2e7c67] px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-[#256654] disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>{sendingUpdate ? 'Dispatching...' : 'Send Branded Update Email'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: Microsoft Graph API Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-[13px] font-bold text-[#173e49]">
                  Microsoft Graph API Configuration (Microsoft 365 / Azure AD)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Connect your corporate Microsoft 365 tenant using modern Azure AD OAuth 2.0 (Application permissions).
                </p>
              </div>

              {!settings.isConfigured && (
                <div className="flex items-start gap-3 rounded-xl border border-[#eadcb1] bg-[#fdf3d8]/60 p-3.5">
                  <Inbox size={18} className="mt-0.5 shrink-0 text-[#9a711f]" />
                  <div className="text-[11px] leading-relaxed text-[#7a5914]">
                    <strong>In-App Outbox Mode Active:</strong> Microsoft Graph API is not yet configured with an Azure Client Secret.
                    All generated emails (tag alerts, comments, updates) will safely queue in your dashboard Outbox with full HTML preview.
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="rounded-xl border border-border bg-white p-5 space-y-4">
                <div className="rounded-lg border border-[#cbe4d9] bg-[#edf5f0] p-3 text-[10px] text-[#2e7c67]">
                  <strong>Azure AD App Setup Tip:</strong> In your Azure Portal, register an App with <strong>Application Permission</strong>: <code className="bg-white/80 px-1 py-0.5 rounded font-mono">Mail.Send</code> under Microsoft Graph, and grant Admin Consent for <code className="bg-white/80 px-1 py-0.5 rounded font-mono">@encalm.com</code>.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground">
                      Azure Directory (Tenant) ID
                    </label>
                    <input
                      type="text"
                      value={settings.tenantId}
                      onChange={(e) => setSettings({ ...settings, tenantId: e.target.value })}
                      placeholder="e.g. 84a7e930-b183-4a11-8f52-..."
                      className="mt-1 w-full rounded-lg border border-border bg-[#faf8f3] px-3 py-2 text-[12px] font-mono focus:outline-hidden focus:ring-1 focus:ring-[#2e7c67]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground">
                      Application (Client) ID
                    </label>
                    <input
                      type="text"
                      value={settings.clientId}
                      onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
                      placeholder="e.g. 3df2a510-721a-4632-9b24-..."
                      className="mt-1 w-full rounded-lg border border-border bg-[#faf8f3] px-3 py-2 text-[12px] font-mono focus:outline-hidden focus:ring-1 focus:ring-[#2e7c67]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground">
                      Azure Client Secret
                    </label>
                    <input
                      type="password"
                      value={settings.clientSecret || ''}
                      onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
                      placeholder="••••••••"
                      className="mt-1 w-full rounded-lg border border-border bg-[#faf8f3] px-3 py-2 text-[12px] font-mono focus:outline-hidden focus:ring-1 focus:ring-[#2e7c67]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-foreground">
                      Sender Mailbox (Microsoft 365 User)
                    </label>
                    <input
                      type="email"
                      value={settings.senderEmail}
                      onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                      placeholder="notifications@encalm.com or hod@encalm.com"
                      className="mt-1 w-full rounded-lg border border-border bg-[#faf8f3] px-3 py-2 text-[12px] focus:outline-hidden focus:ring-1 focus:ring-[#2e7c67]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveToSentItems"
                    checked={settings.saveToSentItems}
                    onChange={(e) => setSettings({ ...settings, saveToSentItems: e.target.checked })}
                    className="rounded border-border text-[#2e7c67] focus:ring-[#2e7c67]"
                  />
                  <label htmlFor="saveToSentItems" className="text-[11px] font-medium text-foreground">
                    Automatically save a copy in the sender's Outlook <strong>"Sent Items"</strong> folder
                  </label>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Test recipient email"
                      className="w-48 rounded-lg border border-border bg-[#faf8f3] px-2.5 py-1.5 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={sendingTest}
                      className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                    >
                      <Send size={11} />
                      <span>{sendingTest ? 'Sending...' : 'Test Send'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex items-center gap-1.5 rounded-lg bg-[#2e7c67] px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-[#256654]"
                  >
                    <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Selected Email HTML Preview Modal */}
        {selectedPreview && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="min-w-0">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    Subject Preview
                  </span>
                  <h4 className="truncate text-[13px] font-bold text-[#173e49]">
                    {selectedPreview.subject}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPreview(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-auto bg-[#f7f5ef] p-4">
                <div
                  className="rounded-xl border border-[#e2ddd3] bg-white p-4 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: selectedPreview.htmlContent }}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border p-3 text-[11px] text-muted-foreground">
                <span>To: {selectedPreview.recipientEmail}</span>
                <button
                  type="button"
                  onClick={() => setSelectedPreview(null)}
                  className="rounded-lg border border-border px-3 py-1 font-semibold hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Tag, X, Check, Users, Send, Mail, Loader2, MessageSquare } from 'lucide-react';
import { users as defaultUsers, getUserById, initialsOf, type User } from '@/data/users';
import { useAppState } from '@/state/app-state';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { MentionTextarea, extractMentionedUserIds } from './mention-textarea';

interface TagUserPopoverProps {
  taggedUsers?: string[];
  onChange: (taggedUserIds: string[]) => void;
  canTag?: boolean;
  compact?: boolean;
  label?: string;
  projectId?: string;
  entityType?: 'Task' | 'Stage' | 'Milestone' | 'Issue' | 'Update' | 'General';
  entityId?: string;
  entityTitle?: string;
  entityContext?: string;
}

export function TagUserPopover({
  taggedUsers = [],
  onChange,
  canTag = true,
  compact = false,
  label = 'Tag',
  projectId,
  entityType = 'Stage',
  entityId,
  entityTitle,
  entityContext,
}: TagUserPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [externalMentionedUsers, setExternalMentionedUsers] = useState<User[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { leads, users: contextUsers, resolveUser, user: currentUser } = useAppState();
  const { toast } = useToast();

  // Merge default users, context directory users, leads, and dynamically fetched Azure users
  const baseUsers: User[] = React.useMemo(() => {
    const map = new Map<string, User>();
    defaultUsers.forEach((u) => map.set(u.id, u));
    if (Array.isArray(contextUsers)) {
      contextUsers.forEach((u) => map.set(u.id, { ...map.get(u.id), ...u }));
    }
    if (Array.isArray(leads)) {
      leads.forEach((l) => map.set(l.id, { ...map.get(l.id), ...l }));
    }
    externalMentionedUsers.forEach((eu) => map.set(eu.id, { ...map.get(eu.id), ...eu }));
    return Array.from(map.values());
  }, [leads, contextUsers, externalMentionedUsers]);

  // Real-time detection of @mentions directly from the comment input
  const mentionedFromComment = React.useMemo(() => {
    return extractMentionedUserIds(comment, baseUsers);
  }, [comment, baseUsers]);

  // Combined selected IDs: explicitly checked + mentioned via @name in comment
  const effectiveSelectedIds = React.useMemo(() => {
    return Array.from(new Set([...(taggedUsers || []), ...mentionedFromComment]));
  }, [taggedUsers, mentionedFromComment]);

  // Sort available users: currently selected/tagged users always appear at the top
  const availableUsers: User[] = React.useMemo(() => {
    return [...baseUsers].sort((a, b) => {
      const aSelected = effectiveSelectedIds.includes(a.id) ? 1 : 0;
      const bSelected = effectiveSelectedIds.includes(b.id) ? 1 : 0;
      return bSelected - aSelected;
    });
  }, [baseUsers, effectiveSelectedIds]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleUser = (userId: string) => {
    if (!canTag) return;
    const isAlreadySelected = effectiveSelectedIds.includes(userId);
    if (isAlreadySelected) {
      const updated = (taggedUsers || []).filter((id) => id !== userId);
      onChange(updated);

      // If user was also mentioned in comment, clear their @mention so it doesn't immediately re-check
      const targetUser = baseUsers.find((u) => u.id === userId);
      if (targetUser && comment) {
        const cleanedComment = comment
          .replace(new RegExp(`@${targetUser.name}\\s*`, 'gi'), '')
          .replace(new RegExp(`@${targetUser.email}\\s*`, 'gi'), '')
          .trim();
        setComment(cleanedComment);
      }
    } else {
      const updated = Array.from(new Set([...(taggedUsers || []), userId]));
      onChange(updated);
    }
  };

  const removeTag = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!canTag) return;
    onChange((taggedUsers || []).filter((id) => id !== userId));
  };

  const handleMentionSelect = (user: User) => {
    setExternalMentionedUsers((prev) => {
      if (!prev.some((u) => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase())) {
        return [...prev, user];
      }
      return prev;
    });
    if (!(taggedUsers || []).includes(user.id)) {
      onChange([...(taggedUsers || []), user.id]);
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();

    const allRecipientIds = effectiveSelectedIds;

    if (allRecipientIds.length === 0) {
      toast({
        title: 'Select a team member',
        description: 'Please select a team member or type @name in the comment.',
        variant: 'destructive',
      });
      return;
    }

    // Keep parent state updated with newly discovered @mentions
    onChange(allRecipientIds);

    if (!projectId) {
      // If no projectId is passed, we simply close with local tagging updated
      toast({
        title: 'Members tagged',
        description: 'Tagged team members updated successfully.',
      });
      setIsOpen(false);
      setComment('');
      return;
    }

    setSending(true);
    try {
      const res = await api.email.tagAndComment({
        projectId,
        entityType,
        entityId,
        entityTitle: entityTitle || entityType,
        entityContext,
        taggedUserIds: allRecipientIds,
        comment: comment.trim() || undefined,
      });

      const recipientNames = res.recipients
        .filter((r) => r.status !== 'skipped')
        .map((r) => r.userName || r.email)
        .join(', ');

      const outboxCount = res.recipients.filter((r) => r.status === 'outbox').length;
      const sentCount = res.recipients.filter((r) => r.status === 'sent').length;

      toast({
        title: sentCount > 0 ? '✓ Email Sent Successfully' : '✓ Notification Logged in Outbox',
        description:
          sentCount > 0
            ? `Dispatched email notification to ${recipientNames}.`
            : `Notification queued for ${recipientNames} (view in Email Hub).`,
      });

      setComment('');
      setIsOpen(false);
    } catch (err: any) {
      toast({
        title: 'Notification Error',
        description: err?.message || 'Could not dispatch email notification.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={containerRef}>
      {/* Existing Tag Chips */}
      {taggedUsers.map((userId) => {
        const u = (resolveUser ? resolveUser(userId) : undefined) || availableUsers.find((user) => user.id === userId) || getUserById(userId);
        const name = u?.name || userId;
        const initials = u?.initials || (u?.name ? initialsOf(u.name) : name.slice(0, 2).toUpperCase());

        return (
          <span
            key={userId}
            className="inline-flex items-center gap-1 rounded-full border border-[#eadcb1] bg-[#fdf8ec] px-2 py-0.5 text-[10px] font-semibold text-[#8c671b] shadow-xs transition hover:border-[#d19b35]"
            title={`Tagged: ${name} (${u?.title || u?.role || 'Member'}) - ${u?.email || 'No email'}`}
          >
            <span className="grid size-3.5 place-items-center rounded-full bg-[#d19b35] text-[8px] font-bold text-white">
              {initials}
            </span>
            <span className="max-w-[80px] truncate">{name.split(' ')[0]}</span>
            {canTag && (
              <button
                type="button"
                onClick={(e) => removeTag(e, userId)}
                aria-label={`Remove tag ${name}`}
                className="ml-0.5 rounded-full p-0.5 text-[#8c671b] hover:bg-[#ebd59f] hover:text-[#5a3e0b]"
              >
                <X size={10} />
              </button>
            )}
          </span>
        );
      })}

      {/* Trigger Button */}
      {canTag && (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1 rounded-md border transition ${
            taggedUsers.length > 0
              ? 'border-border/60 bg-white/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'border-dashed border-border bg-[#faf8f3] px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:border-[#2e7c67] hover:bg-[#edf5f0] hover:text-[#2e7c67]'
          }`}
          title="Tag individuals to assign ownership & send email comments"
        >
          {taggedUsers.length === 0 ? (
            <>
              <Tag size={11} className="text-[#3d9a7e]" />
              <span>{label}</span>
            </>
          ) : (
            <>
              <Tag size={10} />
              <span>+</span>
            </>
          )}
        </button>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-border bg-white p-3 shadow-xl shadow-[#173e49]/15 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 pb-2">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-[#2e7c67]" />
              <span className="text-[12px] font-bold text-[#173e49]">
                Tag & Send Email
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X size={13} />
            </button>
          </div>

          {/* User Selection List */}
          <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Select Member(s):</span>
            {effectiveSelectedIds.length > 0 && (
              <span className="font-mono text-[#2e7c67] font-bold lowercase">
                {effectiveSelectedIds.length} selected
              </span>
            )}
          </div>
          <div className="mt-1 max-h-36 space-y-1 overflow-y-auto pr-1">
            {availableUsers.map((user) => {
              const isSelected = effectiveSelectedIds.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] transition ${
                    isSelected ? 'bg-[#edf5f0] text-[#2e7c67] font-semibold' : 'hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                        isSelected ? 'bg-[#2e7c67] text-white' : 'bg-[#e2ddd3] text-[#173e49]'
                      }`}
                    >
                      {user.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{user.name}</div>
                      <div className="text-[9px] text-muted-foreground truncate font-mono">
                        {user.email || user.title}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded-sm border ${
                      isSelected ? 'border-[#2e7c67] bg-[#2e7c67] text-white' : 'border-border bg-card'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Comment & Mail Form */}
          <form onSubmit={handleSendMail} className="mt-3 border-t border-border/70 pt-2.5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold text-[#173e49]">
                Add Message / Comment:
              </label>
              <span className="text-[9px] text-[#2e7c67] font-semibold">
                Type @ to tag recipient
              </span>
            </div>
            <MentionTextarea
              value={comment}
              onChange={setComment}
              users={availableUsers}
              onMentionSelect={handleMentionSelect}
              placeholder="Type @person to tag, then write message..."
              rows={2}
              className="w-full rounded-lg border border-border bg-[#faf8f3] px-2.5 py-1.5 text-[11px] outline-none focus:border-[#2e7c67] focus:bg-white transition resize-none"
            />

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Mail size={11} className="text-[#3d9a7e]" />
                Sends to tagged email
              </span>

              <button
                type="submit"
                disabled={sending || effectiveSelectedIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#173e49] px-3 py-1.5 text-[10px] font-bold text-white shadow-xs transition hover:bg-[#205160] disabled:opacity-40"
              >
                {sending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={11} />
                    <span>Tag & Send Mail</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

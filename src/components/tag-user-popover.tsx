import React, { useState, useRef, useEffect } from 'react';
import { Tag, UserCheck, X, Check, Users } from 'lucide-react';
import { users as defaultUsers, getUserById, type User } from '@/data/users';
import { useAppState } from '@/state/app-state';

interface TagUserPopoverProps {
  taggedUsers?: string[];
  onChange: (taggedUserIds: string[]) => void;
  canTag?: boolean;
  compact?: boolean;
  label?: string;
}

export function TagUserPopover({
  taggedUsers = [],
  onChange,
  canTag = true,
  compact = false,
  label = 'Tag',
}: TagUserPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { leads } = useAppState();

  // Merge default users with any dynamically registered leads
  const availableUsers: User[] = React.useMemo(() => {
    const combined = [...defaultUsers];
    if (Array.isArray(leads)) {
      leads.forEach((l) => {
        if (!combined.some((u) => u.id === l.id || u.email === l.email)) {
          combined.push(l);
        }
      });
    }
    return combined;
  }, [leads]);

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
    const exists = taggedUsers.includes(userId);
    const updated = exists ? taggedUsers.filter((id) => id !== userId) : [...taggedUsers, userId];
    onChange(updated);
  };

  const removeTag = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!canTag) return;
    onChange(taggedUsers.filter((id) => id !== userId));
  };

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={containerRef}>
      {/* Existing Tag Chips */}
      {taggedUsers.map((userId) => {
        const u = getUserById(userId) || availableUsers.find((user) => user.id === userId);
        const name = u?.name || userId;
        const initials = u?.initials || name.slice(0, 2).toUpperCase();

        return (
          <span
            key={userId}
            className="inline-flex items-center gap-1 rounded-full border border-[#eadcb1] bg-[#fdf8ec] px-2 py-0.5 text-[10px] font-semibold text-[#8c671b] shadow-xs transition hover:border-[#d19b35]"
            title={`Tagged: ${name} (${u?.title || u?.role || 'Member'})`}
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
          title="Tag individuals to assign ownership & dispatch email alerts"
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
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-white p-2 shadow-xl shadow-[#173e49]/10 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-border/70 pb-2 px-1">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-[#2e7c67]" />
              <span className="text-[11px] font-bold text-[#173e49]">Tag Individuals</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X size={12} />
            </button>
          </div>

          <div className="mt-1.5 max-h-48 space-y-1 overflow-y-auto py-1">
            {availableUsers.map((user) => {
              const isSelected = taggedUsers.includes(user.id);
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
                      <div className="truncate">{user.name}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{user.title}</div>
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

          <div className="mt-2 border-t border-border/70 pt-2 px-1 text-[9px] text-muted-foreground">
            Tagged users receive an in-app notice and an automated email alert.
          </div>
        </div>
      )}
    </div>
  );
}

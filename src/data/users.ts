/**
 * User identity — the stable-ID replacement for matching people by their
 * display name.
 *
 * Only two of these users can actually sign in (see `src/state/app-state.tsx`
 * — the login screen only recognises `hod@encalm.com` and `lead@encalm.com`).
 * The rest exist so every seeded project can have a real `leadId` pointing
 * at a stable record instead of a bare name string. When a real backend
 * lands, this file becomes the seed for a `users` table and `id` becomes a
 * database primary key rather than a hand-written slug.
 */

export type UserRole = 'hod' | 'lead' | 'coordinator';

export type User = {
  id: string;
  name: string;
  /** Demo login accounts have one. */
  email?: string;
  role: UserRole;
  title: string;
  initials: string;
};

export const DEMO_HOD_ID = 'user-ruchika-chauhan';
export const DEMO_COORDINATOR_ID = 'user-rajesh-sharma';
export const DEMO_LEAD_ID = 'user-chinmay-saxena';

export const users: User[] = [
  // The accounts the login screen accepts.
  { id: DEMO_HOD_ID, name: 'Ruchika Chauhan', email: 'hod@encalm.com', role: 'hod', title: 'Project HOD', initials: 'RC' },
  { id: DEMO_COORDINATOR_ID, name: 'Rajesh Sharma', email: 'coordinator@encalm.com', role: 'coordinator', title: 'Project Coordinator', initials: 'RS' },
  { id: DEMO_LEAD_ID, name: 'Chinmay Saxena', email: 'lead@encalm.com', role: 'lead', title: 'Project Lead', initials: 'CS' },

  // Other project leads on record in the seed data. They have no login in
  // this prototype — only the account above does — but every project needs
  // a stable owner id, and these are the people the demo data already
  // attributes projects to.
  { id: 'user-anika-sethi', name: 'Anika Sethi', role: 'lead', title: 'Project Lead', initials: 'AS' },
  { id: 'user-arjun-mehta', name: 'Arjun Mehta', role: 'lead', title: 'Project Lead', initials: 'AM' },
  { id: 'user-arjun-menon', name: 'Arjun Menon', role: 'lead', title: 'Project Lead', initials: 'AM' },
  { id: 'user-kabir-bahl', name: 'Kabir Bahl', role: 'lead', title: 'Project Lead', initials: 'KB' },
  { id: 'user-latha-kumar', name: 'Latha Kumar', role: 'lead', title: 'Project Lead', initials: 'LK' },
  { id: 'user-meera-nair', name: 'Meera Nair', role: 'lead', title: 'Project Lead', initials: 'MN' },
  { id: 'user-vikram-iyer', name: 'Vikram Iyer', role: 'lead', title: 'Project Lead', initials: 'VI' },
];

export function getUserById(id: string | undefined | null): User | undefined {
  if (!id) return undefined;
  return users.find((user) => user.id === id);
}

/** Display name for a `leadId`. Never blank — falls back to "Unassigned". */
export function leadName(leadId: string | undefined | null): string {
  return getUserById(leadId)?.name ?? 'Unassigned';
}

export function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

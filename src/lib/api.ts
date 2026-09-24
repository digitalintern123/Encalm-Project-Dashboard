import type { Phase, Milestone, Project, ProjectIssue, ProjectUpdate } from '@/data/projects';
import type { User } from '@/data/users';

const TOKEN_KEY = 'encalm-auth-token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted webviews
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export type NotificationItem = {
  id: string;
  type: 'milestone_overdue' | 'high_issue' | 'approval_required' | 'system';
  title: string;
  message: string;
  projectId?: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ user: User }>('/api/auth/me'),
    logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
    getUsers: () => request<{ users: User[] }>('/api/auth/users'),
  },

  projects: {
    getAll: () => request<{ projects: Project[] }>('/api/projects'),
    get: (id: string) => request<{ project: Project }>(`/api/projects/${id}`),
    create: (project: Partial<Project>) =>
      request<{ project: Project }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(project),
      }),
    update: (id: string, patch: Partial<Project>) =>
      request<{ project: Project }>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/projects/${id}`, {
        method: 'DELETE',
      }),
  },

  phases: {
    add: (projectId: string, phase: Partial<Phase>) =>
      request<{ project: Project }>(`/api/projects/${projectId}/phases`, {
        method: 'POST',
        body: JSON.stringify(phase),
      }),
    update: (projectId: string, phaseId: string, patch: Partial<Phase>) =>
      request<{ project: Project }>(`/api/projects/${projectId}/phases/${phaseId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    delete: (projectId: string, phaseId: string) =>
      request<{ project: Project }>(`/api/projects/${projectId}/phases/${phaseId}`, {
        method: 'DELETE',
      }),
    move: (projectId: string, phaseIndex: number, direction: -1 | 1) =>
      request<{ project: Project }>(`/api/projects/${projectId}/phases/move`, {
        method: 'POST',
        body: JSON.stringify({ phaseIndex, direction }),
      }),
  },

  milestones: {
    add: (projectId: string, milestone: Partial<Milestone>) =>
      request<{ project: Project }>(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify(milestone),
      }),
    update: (projectId: string, milestoneId: string, patch: Partial<Milestone>) =>
      request<{ project: Project }>(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    delete: (projectId: string, milestoneId: string) =>
      request<{ project: Project }>(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'DELETE',
      }),
  },

  issues: {
    add: (projectId: string, issue: Partial<ProjectIssue>) =>
      request<{ project: Project }>(`/api/projects/${projectId}/issues`, {
        method: 'POST',
        body: JSON.stringify(issue),
      }),
    update: (projectId: string, issueId: string, patch: Partial<ProjectIssue>) =>
      request<{ project: Project }>(`/api/projects/${projectId}/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    delete: (projectId: string, issueId: string) =>
      request<{ project: Project }>(`/api/projects/${projectId}/issues/${issueId}`, {
        method: 'DELETE',
      }),
  },

  updates: {
    getAll: () =>
      request<{ updates: (ProjectUpdate & { id: string; project: { id: string; name: string; code: string } })[] }>(
        '/api/updates'
      ),
    add: (projectId: string, update: Partial<ProjectUpdate>) =>
      request<{ project: Project }>(`/api/projects/${projectId}/updates`, {
        method: 'POST',
        body: JSON.stringify(update),
      }),
  },

  notifications: {
    getAll: () => request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications'),
    markRead: (id: string) => request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),
  },

  system: {
    health: () => request<{ status: string; database: string; counts: Record<string, number> }>('/api/system/health'),
    reset: () => request<{ message: string }>('/api/system/reset', { method: 'POST' }),
  },
};

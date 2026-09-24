import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type Health,
  type Milestone,
  type Phase,
  type Project,
  type ProjectIssue,
  type ProjectUpdate,
} from '@/data/projects';
import { readJson, removeItem, writeJson } from '@/lib/storage';
import { todayLabel } from '@/lib/date';
import { DEMO_HOD_ID, DEMO_LEAD_ID, DEMO_COORDINATOR_ID, getUserById, type User } from '@/data/users';
import { api, getStoredToken, setStoredToken, type NotificationItem } from '@/lib/api';
import { calculateWeightedProgress, calculateProjectStatus } from '@/lib/calculations';

export type AppRole = 'hod' | 'lead' | 'coordinator';
export type DemoUser = User;

const demoUserIds: Record<AppRole, string> = {
  hod: DEMO_HOD_ID,
  lead: DEMO_LEAD_ID,
  coordinator: DEMO_COORDINATOR_ID,
};

const EDITOR_ROLES: readonly AppRole[] = ['lead', 'coordinator'];

type AppStateValue = {
  role: AppRole | null;
  user: DemoUser | null;
  projects: Project[];
  canEdit: boolean;
  canEditProject: (projectOrId: Project | string) => boolean;
  isConnected: boolean;
  notifications: NotificationItem[];
  unreadNotifCount: number;
  leads: User[];
  refreshLeads: () => Promise<void>;
  createLead: (data: { name: string; email: string; password: string; title?: string }) => Promise<{ success: boolean; error?: string; lead?: User }>;
  allotProject: (projectId: string, leadId: string) => Promise<{ success: boolean; error?: string }>;
  login: (roleOrEmail: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProjects: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  approveMilestone: (projectId: string, milestoneId: string, status: 'Approved' | 'Rejected') => Promise<boolean>;
  completeMilestone: (projectId: string, milestoneId: string) => Promise<boolean>;
  updateProject: (id: string, patch: Partial<Project>) => boolean;
  updatePhase: (id: string, phaseIndex: number, patch: Partial<Phase>) => boolean;
  addPhase: (id: string, phase: Phase) => boolean;
  removePhase: (id: string, phaseIndex: number) => boolean;
  movePhase: (id: string, phaseIndex: number, direction: -1 | 1) => boolean;
  addProject: (project: Project) => boolean;
  addMilestone: (id: string, milestone: Milestone) => boolean;
  addIssue: (id: string, issue: ProjectIssue) => boolean;
  updateIssue: (id: string, issueIndex: number, patch: Partial<ProjectIssue>) => boolean;
  addUpdate: (id: string, update: ProjectUpdate) => boolean;
  resetProjects: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

const PROJECTS_KEY = 'encalm-projects-data-v2';
const ROLE_KEY = 'encalm-projects-role-v1';

function normaliseProject(project: Project): Project {
  const phases = (project.phases ?? []).map((phase, index) => {
    const rawName = phase.name || '';
    const normalisedName =
      rawName === 'Build & install' || rawName === 'Build and install' || rawName === 'Build & installation'
        ? 'Execution'
        : rawName;
    return {
      ...phase,
      id: phase.id ?? `${project.id}-phase-${index}`,
      name: normalisedName,
      weight: typeof phase.weight === 'number' ? phase.weight : undefined,
    };
  });
  const calculatedProgress =
    phases.length > 0
      ? calculateWeightedProgress(phases).overallProgress
      : (project.progress ?? 0);
  const calculatedStatus = calculateProjectStatus(calculatedProgress, phases);
  const normalisedHealth: Health =
    (project.health === 'Not started' || !project.health) && calculatedProgress > 0
      ? 'On track'
      : (project.health || 'Not started');

  return {
    ...project,
    progress: calculatedProgress,
    status: calculatedStatus,
    health: normalisedHealth,
    phases,
    milestones: (project.milestones ?? []).map((milestone, index) => ({
      ...milestone,
      id: (milestone as any).id ?? `${project.id}-milestone-${index}`,
      approvalStatus:
        milestone.approvalStatus ?? (milestone.approvalRequired ? 'Pending' : 'Not required'),
    })),
    issues: (project.issues ?? []).map((issue, index) => ({
      ...issue,
      id: issue.id ?? `${project.id}-issue-${index}`,
      category: issue.category ?? 'Other',
      status: issue.status ?? 'Open',
      dateRaised: issue.dateRaised ?? issue.issueAriseDate ?? project.lastUpdated ?? todayLabel(),
      issueAriseDate: issue.issueAriseDate ?? issue.dateRaised ?? project.lastUpdated ?? todayLabel(),
      dueDate: issue.dueDate ?? issue.targetClosureDate,
      targetClosureDate: issue.targetClosureDate ?? issue.dueDate,
    })),
    updates: (project.updates ?? []).map((update) => ({
      ...update,
      kind: update.kind ?? 'General',
    })),
  };
}

function isProjectLike(value: unknown): value is Project {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Project>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.phases) &&
    Array.isArray(candidate.milestones) &&
    Array.isArray(candidate.issues) &&
    Array.isArray(candidate.updates)
  );
}

function seedState(): Project[] {
  return [];
}

function hydrateProjects(): Project[] {
  const saved = readJson<unknown>(PROJECTS_KEY);
  if (!Array.isArray(saved)) return [];
  const valid = saved.filter(isProjectLike);
  return valid.map(normaliseProject);
}

function hydrateRole(): AppRole | null {
  const saved = readJson<unknown>(ROLE_KEY);
  return saved === 'hod' || saved === 'lead' || saved === 'coordinator' ? saved : null;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(hydrateRole);
  const [user, setUser] = useState<DemoUser | null>(() => {
    const saved = hydrateRole();
    return saved ? getUserById(demoUserIds[saved]) ?? null : null;
  });
  const [projectState, setProjectState] = useState<Project[]>(hydrateProjects);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [leads, setLeads] = useState<User[]>([]);

  // Sync with localStorage as cache / fallback
  useEffect(() => {
    writeJson(PROJECTS_KEY, projectState);
  }, [projectState]);

  useEffect(() => {
    if (role) writeJson(ROLE_KEY, role);
    else removeItem(ROLE_KEY);
  }, [role]);

  // Fetch full project list from backend with auto-recovery against ephemeral server redeploys
  const refreshProjects = useCallback(async () => {
    try {
      const data = await api.projects.getAll();
      if (Array.isArray(data.projects)) {
        if (data.projects.length === 0) {
          // Check if local cache has projects that were wiped by an ephemeral server redeploy
          const localCached = readJson<unknown>(PROJECTS_KEY);
          if (Array.isArray(localCached) && localCached.length > 0) {
            const valid = localCached.filter(isProjectLike).map(normaliseProject);
            if (valid.length > 0) {
              console.log('Detected fresh server instance; re-syncing cached projects to backend...');
              for (const proj of valid) {
                await api.projects.create(proj).catch(console.warn);
              }
              const reloaded = await api.projects.getAll().catch(() => null);
              if (reloaded?.projects && reloaded.projects.length > 0) {
                setProjectState(reloaded.projects.map(normaliseProject));
                setIsConnected(true);
                return;
              }
            }
          }
        }
        setProjectState(data.projects.map(normaliseProject));
        setIsConnected(true);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  // Fetch notifications from backend
  const refreshNotifications = useCallback(async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data.notifications || []);
      setUnreadNotifCount(data.unreadCount || 0);
    } catch {
      // Offline fallback
    }
  }, []);

  // Fetch leads list from backend
  const refreshLeads = useCallback(async () => {
    try {
      const data = await api.auth.getLeads();
      if (Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  const createLead = useCallback(
    async (data: { name: string; email: string; password: string; title?: string }) => {
      try {
        const res = await api.auth.createLead(data);
        await refreshLeads();
        return { success: true, lead: res.lead };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to create lead' };
      }
    },
    [refreshLeads],
  );

  const allotProject = useCallback(
    async (projectId: string, leadId: string) => {
      try {
        const res = await api.projects.allot(projectId, leadId);
        setProjectState((prev) =>
          prev.map((p) => (p.id === projectId ? normaliseProject(res.project) : p)),
        );
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to allot project' };
      }
    },
    [],
  );

  // Initial load & authentication check
  useEffect(() => {
    const initAuthAndData = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const authData = await api.auth.me();
          if (authData.user) {
            setUser(authData.user);
            setRole(authData.user.role);
          }
        } catch {
          // Token expired or invalid
          setStoredToken(null);
        }
      }

      await refreshProjects();
      await refreshNotifications();
      await refreshLeads();
    };

    initAuthAndData();

    // Periodic poll for real-time updates and notification sync
    const interval = setInterval(() => {
      refreshProjects();
      refreshNotifications();
      refreshLeads();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshProjects, refreshNotifications, refreshLeads]);

  const canEdit = role !== null && EDITOR_ROLES.includes(role);

  const canEditProject = useCallback(
    (projectOrId: Project | string): boolean => {
      if (!role) return false;
      if (role === 'coordinator') return true;
      if (role === 'hod') return false;
      if (role === 'lead') {
        const target =
          typeof projectOrId === 'string'
            ? projectState.find((p) => p.id === projectOrId)
            : projectOrId;
        if (!target) return false;
        return !target.leadId || target.leadId === user?.id;
      }
      return false;
    },
    [role, user?.id, projectState],
  );

  const login = useCallback(
    async (roleOrEmail: string, password = 'encalm'): Promise<{ success: boolean; error?: string }> => {
      let email = roleOrEmail.trim().toLowerCase();
      if (email === 'hod') email = 'hod@encalm.com';
      if (email === 'lead') email = 'lead@encalm.com';
      if (email === 'coordinator') email = 'coordinator@encalm.com';

      try {
        const result = await api.auth.login(email, password);
        setStoredToken(result.token);
        setUser(result.user);
        setRole(result.user.role);
        setIsConnected(true);
        refreshProjects();
        refreshNotifications();
        refreshLeads();
        return { success: true };
      } catch (err: any) {
        // Fallback for offline demo mode
        const targetRole: AppRole | null =
          email === 'hod@encalm.com' ? 'hod'
          : email === 'lead@encalm.com' ? 'lead'
          : email === 'coordinator@encalm.com' ? 'coordinator'
          : null;
        if (targetRole) {
          setRole(targetRole);
          setUser(getUserById(demoUserIds[targetRole]) ?? null);
          return { success: true };
        }
        return { success: false, error: err.message || 'Login failed' };
      }
    },
    [refreshProjects, refreshNotifications, refreshLeads],
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setRole(null);
    setUser(null);
    api.auth.logout().catch(() => {});
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    try {
      await api.notifications.markRead(id);
    } catch {
      // Silently ignore
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifCount(0);
    try {
      await api.notifications.markAllRead();
    } catch {
      // Silently ignore
    }
  }, []);

  // Mutator wrapper for optimistic updates + backend sync
  const mutate = useCallback(
    (updater: (projects: Project[]) => Project[]): boolean => {
      if (!canEdit) return false;
      setProjectState(updater);
      return true;
    },
    [canEdit],
  );

  const patchById = useCallback(
    (id: string, transform: (project: Project) => Project): boolean => {
      if (!canEditProject(id)) return false;
      return mutate((projects) =>
        projects.map((project) => (project.id === id ? transform(project) : project)),
      );
    },
    [canEditProject, mutate],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>): boolean => {
      const ok = patchById(id, (project) => {
        const newProgress = patch.progress !== undefined ? patch.progress : project.progress;
        const newPhases = patch.phases !== undefined ? patch.phases : project.phases;
        const autoStatus =
          patch.status !== undefined ? patch.status : calculateProjectStatus(newProgress, newPhases);
        const autoHealth =
          patch.health !== undefined
            ? patch.health
            : (project.health === 'Not started' || !project.health) && newProgress > 0
            ? 'On track'
            : project.health;
        return {
          ...project,
          ...patch,
          status: autoStatus,
          health: autoHealth,
          lastUpdated: todayLabel(),
        };
      });

      if (ok) {
        api.projects.update(id, patch).catch((err) => {
          console.warn('Backend update failed:', err);
        });
      }
      return ok;
    },
    [patchById],
  );

  const updatePhase = useCallback(
    (id: string, phaseIndex: number, patch: Partial<Phase>): boolean => {
      const targetProject = projectState.find((p) => p.id === id);
      const phase = targetProject?.phases[phaseIndex];
      const phaseId = phase?.id || `${id}-phase-${phaseIndex}`;

      const ok = patchById(id, (project) => {
        if (phaseIndex < 0 || phaseIndex >= project.phases.length) return project;
        const newPhases = project.phases.map((p, index) =>
          index === phaseIndex ? { ...p, ...patch, updatedAt: todayLabel() } : p,
        );
        const { overallProgress } = calculateWeightedProgress(newPhases);
        const autoStatus = calculateProjectStatus(overallProgress, newPhases);
        const autoHealth =
          (project.health === 'Not started' || !project.health) && overallProgress > 0
            ? 'On track'
            : project.health;
        return {
          ...project,
          phases: newPhases,
          progress: overallProgress,
          status: autoStatus,
          health: autoHealth,
          lastUpdated: todayLabel(),
        };
      });

      if (ok && phaseId) {
        api.phases.update(id, phaseId, patch).then((res) => {
          if (res?.project) {
            patchById(id, () => normaliseProject(res.project));
          }
        }).catch(console.warn);
      }
      return ok;
    },
    [patchById, projectState],
  );

  const addPhase = useCallback(
    (id: string, phase: Phase): boolean => {
      const generatedId = phase.id ?? `${id}-phase-${Date.now()}`;
      const newPhase = { ...phase, id: generatedId };

      const ok = patchById(id, (project) => {
        const newPhases = [...project.phases, newPhase];
        const { overallProgress } = calculateWeightedProgress(newPhases);
        const autoStatus = calculateProjectStatus(overallProgress, newPhases);
        return {
          ...project,
          phases: newPhases,
          progress: overallProgress,
          status: autoStatus,
          lastUpdated: todayLabel(),
        };
      });

      if (ok) {
        api.phases.add(id, newPhase).then((res) => {
          if (res?.project) {
            patchById(id, () => normaliseProject(res.project));
          }
        }).catch(console.warn);
      }
      return ok;
    },
    [patchById],
  );

  const removePhase = useCallback(
    (id: string, phaseIndex: number): boolean => {
      const targetProject = projectState.find((p) => p.id === id);
      const phase = targetProject?.phases[phaseIndex];
      const phaseId = phase?.id;

      const ok = patchById(id, (project) => {
        if (project.phases.length <= 1) return project;
        if (phaseIndex < 0 || phaseIndex >= project.phases.length) return project;
        const newPhases = project.phases.filter((_, index) => index !== phaseIndex);
        const { overallProgress } = calculateWeightedProgress(newPhases);
        const autoStatus = calculateProjectStatus(overallProgress, newPhases);
        return {
          ...project,
          phases: newPhases,
          progress: overallProgress,
          status: autoStatus,
          lastUpdated: todayLabel(),
        };
      });

      if (ok && phaseId) {
        api.phases.delete(id, phaseId).then((res) => {
          if (res?.project) {
            patchById(id, () => normaliseProject(res.project));
          }
        }).catch(console.warn);
      }
      return ok;
    },
    [patchById, projectState],
  );

  const movePhase = useCallback(
    (id: string, phaseIndex: number, direction: -1 | 1): boolean => {
      const ok = patchById(id, (project) => {
        const targetIndex = phaseIndex + direction;
        if (phaseIndex < 0 || phaseIndex >= project.phases.length) return project;
        if (targetIndex < 0 || targetIndex >= project.phases.length) return project;
        const phases = [...project.phases];
        [phases[phaseIndex], phases[targetIndex]] = [phases[targetIndex], phases[phaseIndex]];
        const { overallProgress } = calculateWeightedProgress(phases);
        const autoStatus = calculateProjectStatus(overallProgress, phases);
        return { ...project, phases, progress: overallProgress, status: autoStatus, lastUpdated: todayLabel() };
      });

      if (ok) {
        api.phases.move(id, phaseIndex, direction).then((res) => {
          if (res?.project) {
            patchById(id, () => normaliseProject(res.project));
          }
        }).catch(console.warn);
      }
      return ok;
    },
    [patchById],
  );

  const addProject = useCallback(
    (project: Project): boolean => {
      const normalised = normaliseProject(project);
      const ok = mutate((projects) => {
        if (projects.some((existing) => existing.id === project.id)) return projects;
        return [normalised, ...projects];
      });

      if (ok) {
        api.projects.create(normalised).then((res) => {
          if (res?.project) {
            patchById(project.id, () => normaliseProject(res.project));
          }
        }).catch(console.warn);
      }
      return ok;
    },
    [mutate, patchById],
  );

  const addMilestone = useCallback(
    (id: string, milestone: Milestone): boolean => {
      const ok = patchById(id, (project) => ({
        ...project,
        milestones: [...project.milestones, milestone],
        lastUpdated: todayLabel(),
      }));

      if (ok) {
        api.milestones.add(id, milestone).then((res) => {
          if (res?.project) {
            patchById(id, () => normaliseProject(res.project));
          }
        }).catch(console.warn);
      }
      return ok;
    },
    [patchById],
  );

  const approveMilestone = useCallback(
    async (projectId: string, milestoneId: string, status: 'Approved' | 'Rejected'): Promise<boolean> => {
      // Governance approval is strictly reserved for Coordinator
      if (role !== 'coordinator') return false;

      setProjectState((projects) =>
        projects.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            milestones: project.milestones.map((m) =>
              (m as any).id === milestoneId || m.title === milestoneId
                ? { ...m, approvalStatus: status }
                : m,
            ),
          };
        }),
      );

      try {
        await api.milestones.update(projectId, milestoneId, { approvalStatus: status });
        refreshNotifications();
        return true;
      } catch {
        return false;
      }
    },
    [role, refreshNotifications],
  );

  const completeMilestone = useCallback(
    async (projectId: string, milestoneId: string): Promise<boolean> => {
      // Only the assigned project lead or coordinator can complete milestones
      if (!canEditProject(projectId)) return false;

      const today = new Date().toISOString().split('T')[0];
      setProjectState((projects) =>
        projects.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            milestones: project.milestones.map((m) =>
              (m as any).id === milestoneId || m.title === milestoneId
                ? { ...m, status: 'complete', completedDate: today }
                : m,
            ),
          };
        }),
      );

      try {
        await api.milestones.update(projectId, milestoneId, { status: 'complete', completedDate: today });
        refreshNotifications();
        return true;
      } catch {
        return false;
      }
    },
    [canEditProject, refreshNotifications],
  );

  const addIssue = useCallback(
    (id: string, issue: ProjectIssue): boolean => {
      const generatedId = issue.id ?? `${id}-issue-${Date.now()}`;
      const newIssue = { ...issue, id: generatedId };

      const ok = patchById(id, (project) => ({
        ...project,
        issues: [...project.issues, newIssue],
        lastUpdated: todayLabel(),
      }));

      if (ok) {
        api.issues.add(id, newIssue).catch(console.warn);
      }
      return ok;
    },
    [patchById],
  );

  const updateIssue = useCallback(
    (id: string, issueIndex: number, patch: Partial<ProjectIssue>): boolean => {
      const targetProject = projectState.find((p) => p.id === id);
      const issue = targetProject?.issues[issueIndex];
      const issueId = issue?.id;

      const ok = patchById(id, (project) => {
        if (issueIndex < 0 || issueIndex >= project.issues.length) return project;
        return {
          ...project,
          issues: project.issues.map((iss, index) =>
            index === issueIndex ? { ...iss, ...patch } : iss,
          ),
          lastUpdated: todayLabel(),
        };
      });

      if (ok && issueId) {
        api.issues.update(id, issueId, patch).catch(console.warn);
      }
      return ok;
    },
    [patchById, projectState],
  );

  const addUpdate = useCallback(
    (id: string, update: ProjectUpdate): boolean => {
      const ok = patchById(id, (project) => ({
        ...project,
        updates: [{ ...update, kind: update.kind ?? 'General' }, ...project.updates],
        lastUpdated: todayLabel(),
      }));

      if (ok) {
        api.updates.add(id, update).catch(console.warn);
      }
      return ok;
    },
    [patchById],
  );

  const resetProjects = useCallback(async () => {
    try {
      await api.system.reset();
      removeItem(PROJECTS_KEY);
      setProjectState([]);
      await refreshProjects();
      await refreshNotifications();
    } catch {
      // Local fallback reset
      removeItem(PROJECTS_KEY);
      setProjectState([]);
    }
  }, [refreshProjects, refreshNotifications]);

  const value = useMemo<AppStateValue>(
    () => ({
      role,
      user,
      projects: projectState,
      canEdit,
      canEditProject,
      isConnected,
      notifications,
      unreadNotifCount,
      leads,
      refreshLeads,
      createLead,
      allotProject,
      login,
      logout,
      refreshProjects,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      approveMilestone,
      completeMilestone,
      updateProject,
      updatePhase,
      addPhase,
      removePhase,
      movePhase,
      addProject,
      addMilestone,
      addIssue,
      updateIssue,
      addUpdate,
      resetProjects,
    }),
    [
      role,
      user,
      projectState,
      canEdit,
      canEditProject,
      isConnected,
      notifications,
      unreadNotifCount,
      leads,
      refreshLeads,
      createLead,
      allotProject,
      login,
      logout,
      refreshProjects,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      approveMilestone,
      completeMilestone,
      updateProject,
      updatePhase,
      addPhase,
      removePhase,
      movePhase,
      addProject,
      addMilestone,
      addIssue,
      updateIssue,
      addUpdate,
      resetProjects,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
}

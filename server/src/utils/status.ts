export type ProjectStatus = 'Yet to start' | 'In Design' | 'In Tendering' | 'Under Construction' | 'Operational';

export type StageLike = {
  name: string;
  status?: string;
  progress?: number;
};

/**
 * Server-side automatic project status calculation matching client calculations.
 */
export function calculateProjectStatus(progress: number, phases?: StageLike[]): ProjectStatus {
  const cleanProgress = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));

  if (cleanProgress >= 100) return 'Operational';

  const hasStartedPhases = Boolean(
    phases && phases.some((p) => (Number(p.progress) || 0) > 0 || p.status === 'complete' || p.status === 'active'),
  );
  if (cleanProgress <= 0 && !hasStartedPhases) {
    return 'Yet to start';
  }

  if (phases && phases.length > 0) {
    const activePhase =
      phases.find((p) => p.status === 'active') ||
      phases.find((p) => p.status !== 'complete' && (Number(p.progress) || 0) < 100) ||
      phases[phases.length - 1];

    if (activePhase) {
      const name = (activePhase.name || '').toLowerCase();
      if (/procure|tender|vendor|contract|sourcing|supplier|award/.test(name)) {
        return 'In Tendering';
      }
      if (/build|construct|install|fit-out|civil|interior|mep|delivery|integration/.test(name)) {
        return 'Under Construction';
      }
      if (/handover|launch|opening|operational|readiness|trial|commissioning/.test(name)) {
        return cleanProgress >= 90 || activePhase.status === 'complete' ? 'Operational' : 'Under Construction';
      }
      if (/design|concept|brief|feasibility|planning|scope|journey|clearance|statutory|approval/.test(name)) {
        return 'In Design';
      }
    }
  }

  // Progress tier fallback
  if (cleanProgress === 0) return 'Yet to start';
  if (cleanProgress <= 25) return 'In Design';
  if (cleanProgress <= 50) return 'In Tendering';
  if (cleanProgress < 100) return 'Under Construction';
  return 'Operational';
}

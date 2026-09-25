export type ProjectStatus = 'Yet to start' | 'In Design' | 'In Tendering' | 'Under Construction' | 'Operational';

export type StageLike = {
  name: string;
  status?: string;
  progress?: number;
};

export type AutoStatusResult = {
  status: ProjectStatus | null;
  isAutomatic: boolean;
  matchedStageName?: string;
  reason: 'progress_complete' | 'progress_zero' | 'keyword_matched' | 'no_phases' | 'no_keyword_match';
};

export function matchStageKeyword(stageName: string, progress: number = 0, isComplete: boolean = false): ProjectStatus | null {
  const name = (stageName || '').trim().toLowerCase();
  if (!name) return null;
  if (/procure|tender|vendor|contract|sourcing|supplier|award|rfp|commercial/.test(name)) {
    return 'In Tendering';
  }
  if (/execution|build|construct|install|fit-out|civil|interior|mep|delivery|integration/.test(name)) {
    return 'Under Construction';
  }
  if (/handover|launch|opening|operational|readiness|trial|commissioning/.test(name)) {
    return progress >= 90 || isComplete ? 'Operational' : 'Under Construction';
  }
  if (/design|concept|brief|feasibility|planning|scope|journey|clearance|statutory|approval/.test(name)) {
    return 'In Design';
  }
  return null;
}

/**
 * Server-side automatic project status calculation matching client calculations.
 */
export function getAutoProjectStatus(progress: number, phases?: StageLike[]): AutoStatusResult {
  const cleanProgress = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));

  if (cleanProgress >= 100) {
    return { status: 'Operational', isAutomatic: true, reason: 'progress_complete' };
  }

  const hasStartedPhases = Boolean(
    phases && phases.some((p) => (Number(p.progress) || 0) > 0 || p.status === 'complete' || p.status === 'active'),
  );
  if (cleanProgress <= 0 && !hasStartedPhases) {
    return { status: 'Yet to start', isAutomatic: true, reason: 'progress_zero' };
  }

  if (!phases || phases.length === 0) {
    return { status: null, isAutomatic: false, reason: 'no_phases' };
  }

  const activePhase =
    phases.find((p) => p.status === 'active') ||
    phases.find((p) => p.status !== 'complete' && (Number(p.progress) || 0) < 100) ||
    phases[phases.length - 1];

  if (!activePhase) {
    return { status: null, isAutomatic: false, reason: 'no_phases' };
  }

  const matched = matchStageKeyword(activePhase.name, cleanProgress, activePhase.status === 'complete');
  if (matched) {
    return {
      status: matched,
      isAutomatic: true,
      matchedStageName: activePhase.name,
      reason: 'keyword_matched',
    };
  }

  return {
    status: null,
    isAutomatic: false,
    matchedStageName: activePhase.name,
    reason: 'no_keyword_match',
  };
}

export function calculateProjectStatus(progress: number, phases?: StageLike[], currentStatus?: ProjectStatus): ProjectStatus {
  const autoResult = getAutoProjectStatus(progress, phases);
  if (autoResult.isAutomatic && autoResult.status) {
    return autoResult.status;
  }
  return currentStatus || 'Yet to start';
}

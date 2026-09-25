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
  reason?: string;
};

/**
 * Server-side project status is fully manual and user-controlled.
 * It strictly preserves the user-defined status, defaulting to 'Yet to start' only if undefined.
 */
export function calculateProjectStatus(
  _progress?: number,
  _phases?: StageLike[],
  currentStatus?: ProjectStatus,
): ProjectStatus {
  return currentStatus || 'Yet to start';
}

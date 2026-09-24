import type { Project } from '@/data/projects';
import { parseIsoDate } from '@/lib/date';

/**
 * Centralized calculations.
 *
 * Rule for this file: every number here is derived from real project fields
 * (dates, amounts, counts) — nothing is a fixed placeholder. If a
 * calculation cannot be produced from the data a project actually has, it
 * returns `null` and callers must render an explicit "unavailable" state
 * rather than inventing a number.
 *
 * Any page that needs one of these values should call the function here,
 * not re-derive its own copy of the arithmetic — that duplication is how
 * the dashboard and project-detail pages previously drifted (e.g. two
 * different roundings of the same award percentage).
 */

// ---------------------------------------------------------------------------
// Planned vs. actual progress
// ---------------------------------------------------------------------------

/**
 * Schedule-based planned progress: "if this project is progressing evenly
 * from its start date to its target date, what fraction of it should be
 * done by today?"
 *
 * This replaces the old placeholder `project.progress + 8`, which was not a
 * calculation — it was a fixed offset with no relationship to the project's
 * actual schedule.
 *
 * Returns `null` when there isn't enough real schedule data to compute this
 * (missing or invalid `startDate`/`targetDate`, or a zero/negative span) —
 * callers must show "Planned progress unavailable" in that case, per the
 * product rule that a missing calculation is never replaced with an
 * invented one.
 *
 * This is a linear approximation, not the phase-weighted schedule engine
 * described for Stage 2 (`docs/roadmap.md`). It answers the question
 * honestly with the fields the project actually has today.
 */
export function getPlannedProgress(project: Project, now: Date = new Date()): number | null {
  const start = parseIsoDate(project.startDate);
  const target = parseIsoDate(project.targetDate);
  if (!start || !target) return null;

  const totalSpan = target.getTime() - start.getTime();
  if (totalSpan <= 0) return null;

  const elapsed = now.getTime() - start.getTime();
  const fraction = elapsed / totalSpan;
  return Math.round(Math.max(0, Math.min(1, fraction)) * 100);
}

export type ProgressVariance = {
  actual: number;
  planned: number | null;
  /** `null` whenever `planned` is `null` — there is nothing to compare against. */
  variance: number | null;
};

/** Bundles actual/planned/variance so a component renders all three from one call. */
export function getProgressVariance(project: Project, now: Date = new Date()): ProgressVariance {
  const planned = getPlannedProgress(project, now);
  return {
    actual: project.progress,
    planned,
    variance: planned === null ? null : project.progress - planned,
  };
}

// ---------------------------------------------------------------------------
// Commercial
// ---------------------------------------------------------------------------

export type CommercialSummary = {
  aop: number;
  awarded: number;
  spent: number;
  remaining: number;
  /** Awarded as a % of AOP. `null` when AOP is 0 (nothing to divide by). */
  awardRatePct: number | null;
  /** Spent as a % of awarded. `null` when nothing has been awarded yet. */
  spentRatePct: number | null;
  /** True when awarded exceeds AOP — flagged, never silently allowed. */
  overAwarded: boolean;
};

function ratioPct(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10; // one decimal place
}

/** The one place that turns a project's raw AOP/awarded/spent into display ratios. */
export function getCommercialSummary(project: Project): CommercialSummary {
  const { aop, awarded, spent } = project;
  return {
    aop,
    awarded,
    spent,
    remaining: awarded - spent,
    awardRatePct: ratioPct(awarded, aop),
    spentRatePct: ratioPct(spent, awarded),
    overAwarded: Number.isFinite(aop) && Number.isFinite(awarded) && awarded > aop,
  };
}

export type PortfolioCommercialSummary = {
  totalAop: number;
  totalAwarded: number;
  totalSpent: number;
  awardRatePct: number | null;
  spentRatePct: number | null;
};

/** Portfolio-level roll-up, built from the same per-project fields — never a separate estimate. */
export function getPortfolioCommercialSummary(projects: Project[]): PortfolioCommercialSummary {
  const totalAop = projects.reduce((sum, project) => sum + (Number.isFinite(project.aop) ? project.aop : 0), 0);
  const totalAwarded = projects.reduce((sum, project) => sum + (Number.isFinite(project.awarded) ? project.awarded : 0), 0);
  const totalSpent = projects.reduce((sum, project) => sum + (Number.isFinite(project.spent) ? project.spent : 0), 0);
  return {
    totalAop,
    totalAwarded,
    totalSpent,
    awardRatePct: ratioPct(totalAwarded, totalAop),
    spentRatePct: ratioPct(totalSpent, totalAwarded),
  };
}

/** `x of y` as a percentage string. `null`/zero-denominator renders as "—", never "NaN%" or "Infinity%". */
export function formatRatio(pct: number | null, digits = 1): string {
  return pct === null ? '—' : `${pct.toFixed(digits)}%`;
}

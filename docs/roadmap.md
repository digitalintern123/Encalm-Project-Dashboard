# Roadmap

This tracks the staged plan for turning this prototype into the real
project-control system described in the product spec (Encalm Hospitality
PMO requirements — Stage 1 through Stage 5). Stage 1 is complete as of this
document; Stages 2–5 are not started. Nothing below is implemented yet
except where explicitly marked done.

---

## Stage 1 — Data/logic correction — ✅ done

Goal: the application must never present fabricated management information.
Every number on screen either comes from real project data or a documented
calculation, or it says "unavailable."

| # | Item | Status | Where |
|---|---|---|---|
| 1 | Remove hardcoded metrics | ✅ | `dashboard.tsx` KPI details, health donut, "needs attention" copy are all computed in `stats`/`buildHealthGradient` |
| 2 | Remove hardcoded dates | ✅ | `lib/date.ts` — `todayLabel()`, `todayLongLabel()`, `todayIso()`, `greetingForNow()` replace every fixed date/greeting string |
| 3 | Remove fake planned progress | ✅ | `lib/calculations.ts` → `getPlannedProgress()`. The old `project.progress + 8` fallback is gone; see [§Known limitation](#known-limitation-planned-progress-needs-real-dates) below |
| 4 | Fix My Projects | ✅ | `data/users.ts` gives every user a stable `id`; `Project.leadId` replaces the free-text `lead` field. "My projects" filters on `project.leadId === user.id`, never a name string |
| 5 | Fix dashboard calculations | ✅ | `stats` in `dashboard.tsx` is a single `useMemo` computing every KPI from `projects`; nothing is duplicated or invented |
| 6 | Fix reports | ✅ | `ReportsView` in `workspace.tsx` computes real counts (delayed, at-risk, open milestones, total AOP) and exports them as CSV, no placeholder numbers |
| 7 | Centralize calculations | ✅ | `lib/calculations.ts` is the one place planned progress, variance, and commercial ratios are computed. `project-detail.tsx` and `workspace.tsx` both call it rather than keeping separate copies of the same arithmetic |

Also fixed as part of this stage (found during the audit, not in the
original numbered list, but required by the acceptance criteria):

- Search on both the dashboard and the "All projects" table now matches
  project name, code, **and lead** (resolved through `leadName()`), not just
  name/code.
- `CommercialPanel` (project detail) and `CommercialView` (workspace) used
  to compute award/spend ratios independently, with different zero-handling.
  Both now call `getCommercialSummary()` and render the same numbers.

### Known limitation: planned progress needs real dates

`getPlannedProgress()` is a genuine calculation — it uses each project's own
`startDate` and `targetDate` to work out what fraction of the schedule
should be done by today. It returns `null` (rendered as "Unavailable") when
a project has no `startDate`.

**17 of the 20 seeded projects don't have a `startDate` set.** For those,
"Planned progress" and "Variance" on the project detail page will honestly
show "Unavailable" rather than a number. This is the correct behaviour per
the no-fabrication rule — it is not a bug, and it should not be "fixed" by
inventing plausible-looking dates. If real start dates exist for these
projects, add a `startDate: 'yyyy-mm-dd'` field to the corresponding entries
in `data/projects.ts` and the calculation will start producing real numbers
for them immediately — no other code changes needed.

### Known limitation: the demo Lead account owns no seed projects

`Chinmay Saxena` (`lead@encalm.com`) is the only account that can actually
sign in as a Project Lead, but none of the 20 seeded projects have
`leadId: 'user-chinmay-saxena'` — they're attributed to other named leads
(Anika Sethi, Arjun Mehta, Kabir Bahl, etc.) who exist in `data/users.ts`
as records but have no login. "My projects" for the demo Lead account will
therefore correctly show empty. This was true before this change too — the
old code compared `project.lead === 'Chinmay Saxena'`, which also matched
nothing — but the ID-based fix makes it more obviously intentional rather
than a name typo. Reassigning `leadId` on a few seed projects to
`user-chinmay-saxena` would give the demo account something to manage, if
that's useful for demos; that's a data decision, not something this pass
changed unilaterally.

---

## Stage 2 — Project control (not started)

The larger structural pieces the spec calls for next, in the order it lists
them:

1. **Phase-weighted progress** — give each `Phase` a `weight`, validate
   weights sum to 100 (or normalise them), and make overall project
   progress a calculated `Σ(weight × phase.progress)` rather than a value
   `updateProject` sets directly. This is a bigger change than Stage 1's
   scope: it means `project.progress` becomes derived, not stored, and every
   place that currently writes to it (`saveProgress` in `project-detail.tsx`)
   needs to write to phase progress instead.
2. **Planned vs. actual, properly** — extend `getPlannedProgress()` to use
   per-phase `plannedStart`/`plannedFinish` once phases reliably have them,
   rather than the whole-project linear approximation Stage 1 shipped.
3. **Progress history** — a `ProgressUpdate` record (id, projectId, date,
   authorId, overallProgress, comment, createdAt) preserved on every
   meaningful update, plus a trend chart. Today, updating progress overwrites
   the previous value with no history — only the free-text `ProjectUpdate`
   comment survives.
4. **Health engine** — replace the manually-set `project.health` field with
   one centralized function that derives it from target date, planned vs.
   actual variance, overdue milestones, high-severity issues, and stale
   updates, with the thresholds documented in one place. No page should be
   allowed to compute health its own way.
5. **Milestone lifecycle** — richer `Milestone` fields (`plannedDate` vs.
   `completedDate`, `ownerId`, `approvalStatus` transitions) and the ability
   to mark late/complete/reassign from the UI, not just seed them as static
   data.
6. **Issues vs. risks** — split the current single `ProjectIssue` type
   (something that already happened) from a new `ProjectRisk` type
   (something that might happen), with its own probability/impact/
   mitigation fields, as the spec's §14 describes.
7. **Decisions required** — a first-class `Decision` entity
   (Pending/Approved/Rejected/Deferred/Resolved) surfaced prominently on the
   HOD dashboard, replacing the current free-text `decisionRequired` string
   on a `Phase`.
8. **"What changed since last update"** — once progress history (#3) and a
   real audit trail exist, this becomes a diff over that history rather than
   something to build first.

## Stage 3 — Backend (not started)

PostgreSQL schema, authentication, API endpoints, and RBAC enforced
server-side (today it is UI-only — see `notes.md` §4). The spec's §22–24
lay out the resource list and table shapes; nothing here has been
scaffolded yet, including no server project, no ORM, and no auth tokens.

## Stage 4 — Management features (not started)

Automated "needs attention" beyond the current health-based heuristic, real
notifications derived from data (none exist today), a Gantt view using
actual phase dates instead of the current index-based bar positions in
`TimelineView`, budget variance beyond the flat award/spend ratios Stage 1
centralized, procurement tracking, and richer reporting.

## Stage 5 — Advanced (not started)

Documents, email notifications, mobile update flows, AI-generated project
summaries. Not designed yet.

---

## Working agreement for future stages

Per the spec: implement one stage at a time, run typecheck and build after
every change, verify both roles still work, and report what changed rather
than asking for approval on each small edit. `notes.md` documents the
current architecture; this file tracks what's left.

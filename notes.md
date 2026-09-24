# Engineering notes

Internal reference for anyone (human or AI) picking this codebase up. It
explains *why* things are built the way they are, not just what the code
does — read this before making structural changes.

---

## 1. What this actually is

A **frontend-only prototype** of an Encalm Hospitality project-control
dashboard. There is no server. `src/data/projects.ts` seeds 20 demo projects;
everything a Project Lead edits is persisted to the browser's
`localStorage` and never leaves the machine. Two users can look at the same
URL and see different data. This is fine for a demo and not fine for
production — see [§9 Known gaps](#9-known-gaps-vs-a-real-system) before
promising this to stakeholders as multi-user.

The staged plan for closing that gap (phase-weighted progress, a health
engine, a real backend, and so on) lives in **[`docs/roadmap.md`](./docs/roadmap.md)**,
kept separate from this file because it describes work that hasn't started
rather than the code that exists. Stage 1 of that plan — removing every
fabricated number and hardcoded date — is done; this file reflects that.

---

## 2. Tech stack

React 19 + TypeScript + Vite 7 + Tailwind CSS v4, `wouter` for routing
(not react-router), shadcn/ui primitives in `src/components/ui/`
(generated, not usually hand-edited). No backend, no ORM, no auth server.

---

## 3. Where things live

```
src/
  state/app-state.tsx    ← the single source of truth for role + project data
  data/
    projects.ts          ← domain types, seed data, formatCrore/formatShortDate
    users.ts             ← stable user identity — id/name/role for every lead
  lib/
    storage.ts           ← localStorage wrapper that never throws
    date.ts              ← date parsing/formatting that never throws
    calculations.ts      ← planned progress, variance, commercial ratios — the
                            one place these are computed (see §6)
  pages/
    dashboard.tsx         "/"            portfolio KPIs, health donut, attention list
    workspace.tsx         everything else — one file, nine views selected by a `view` prop
    project-detail.tsx    "/project/:id" tabbed single-project view
    login.tsx             role picker (not real auth — see §5)
    not-found.tsx          catch-all route
  components/
    app-shell.tsx         sidebar, header, settings dialog
    error-boundary.tsx     route-level crash containment
```

`workspace.tsx` is intentionally one file with nine internal components
(`ProjectsView`, `TimelineView`, `MilestonesView`, `IssuesView`,
`CommercialView`, `UpdatesView`, `ReportsView`, `NewProjectView`, dispatched
by the `view` prop from `App.tsx`'s routes). Before splitting it up, check
whether the split earns its complexity — the views share `PageHeader` and
little else.

---

## 4. State management — read this before touching `app-state.tsx`

**Everything mutating goes through two functions:**

```
mutate(updater)        — the only place that checks canEdit. Returns boolean.
patchById(id, fn)       — mutate() specialised to "transform one project by id"
```

Every public mutation (`updateProject`, `addPhase`, `addIssue`, …) is a thin
wrapper around one of these two. **If you add a new mutation, wrap it the
same way** — don't reach into `setProjectState` directly, or the RBAC check
gets bypassed for that one function.

Every mutation returns `boolean` (`true` = applied). Callers use this to
show a toast on rejection instead of pretending the write succeeded — see
`saveProgress` in `project-detail.tsx` for the pattern.

### RBAC

```ts
const EDITOR_ROLES: readonly AppRole[] = ['lead'];
const canEdit = role !== null && EDITOR_ROLES.includes(role);
```

One constant, one derived boolean. HOD is read-only by *not* being in
`EDITOR_ROLES` — there's no separate "can HOD edit X" logic scattered
through the app. If a third role is ever added, decide here whether it can
edit, and every mutation inherits that decision automatically.

**This is a frontend-only gate.** It stops the UI from calling the mutator;
it does **not** stop someone from opening devtools and calling
`useAppState()` mutators directly, or editing `localStorage` by hand. There
is no backend to enforce anything. Do not describe this app as
role-secure to anyone outside the team.

### Persistence & hydration

```ts
function hydrateProjects(): Project[] {
  const saved = readJson<unknown>(PROJECTS_KEY);
  if (!Array.isArray(saved)) return seedState();
  const valid = saved.filter(isProjectLike);
  if (valid.length === 0 || valid.length !== saved.length) return seedState();
  return valid.map(normaliseProject);
}
```

Deliberately all-or-nothing: if *any* record in `localStorage` fails the
structural check (`isProjectLike`), the **whole** payload is discarded and
the seed is used instead. A half-valid state (some projects missing
`issues`, say) is judged more dangerous than losing a session's edits,
because a half-normalised project can crash a page deep in a tab the user
isn't looking at. If you change this trade-off, say so in a commit message
— it's not obvious from a diff.

`normaliseProject()` backfills fields that might be missing from an older
saved payload (phase `id`, issue `status`/`category`/`dateRaised`,
milestone `approvalStatus`). It's applied to **both** the seed and the
hydrated path, so a schema addition (new optional field) only needs a
default written once, here.

`writeJson` / `readJson` (`lib/storage.ts`) probe `localStorage` once and
cache the result — Safari private mode and locked-down webviews throw on
access, and this used to produce a blank white screen before React
rendered anything.

---

## 5. Login is a role picker, not authentication

`src/pages/login.tsx` accepts any non-empty password. The email decides the
role:

| Email | Role | Name shown |
|---|---|---|
| `hod@encalm.com` | `hod` (read-only) | Ruchika Chauhan |
| `lead@encalm.com` | `lead` (can edit) | Chinmay Saxena |

These two are looked up by id from **`src/data/users.ts`**, not defined
inline in `app-state.tsx` — see §6 for why that file exists and what else
is in it. There is no password check, no session, no token. Signing out
just clears `ROLE_KEY` from `localStorage`.

---

## 6. Identity: `users.ts` and `leadId`

Every project has a `leadId: string` pointing at a `User.id` in
`src/data/users.ts`, not a bare name string. That file holds two kinds of
record:

- the **two demo accounts** that can actually sign in (`DEMO_HOD_ID`,
  `DEMO_LEAD_ID`), looked up by `app-state.tsx` when someone logs in
- **other project leads on record** (Anika Sethi, Arjun Mehta, Kabir Bahl,
  etc.) who own seeded projects but have no login in this prototype — they
  exist so those projects have a real `leadId` to point at instead of a
  free-text name

`leadName(project.leadId)` resolves the id to a display name anywhere the
UI needs to show it (`ProjectTable`, the project-detail overview, the CSV
export). **Never compare `project.leadId` to a name string** — "My
projects" (`ProjectsView` in `workspace.tsx`, and `myProjectCount` in
`dashboard.tsx`) both filter on `project.leadId === user?.id`. If you add
another place that needs "does this project belong to the current user,"
use the same comparison.

**Known consequence of this data, not a bug in the mechanism:** the only
login-capable Lead account (Chinmay Saxena) doesn't own any of the 20
seeded projects — they're all attributed to the other named leads above.
"My projects" for that account is correctly empty. See `docs/roadmap.md`
for the reasoning on why this wasn't "fixed" by reassigning ownership.

---

## 7. Centralized calculations — `lib/calculations.ts`

Anything derived from more than one raw field lives here, not recomputed
per-page:

- **`getPlannedProgress(project, now?)`** — a real schedule-based
  calculation: what fraction of the time between `startDate` and
  `targetDate` has elapsed, clamped to 0–100. Returns **`null`** when a
  project has no `startDate`/`targetDate` (or they're inconsistent) —
  callers must render "unavailable," never invent a number. **17 of the 20
  seeded projects have no `startDate`**, so planned progress shows
  "Unavailable" for most of the portfolio today; see `docs/roadmap.md`.
- **`getProgressVariance(project, now?)`** — bundles `actual`/`planned`/
  `variance` from the function above; `variance` is `null` exactly when
  `planned` is `null`.
- **`getCommercialSummary(project)`** / **`getPortfolioCommercialSummary(projects)`**
  — award rate, spend rate, remaining balance, and an `overAwarded` flag,
  all `null`-safe on a zero denominator. `project-detail.tsx`'s
  `CommercialPanel` and `workspace.tsx`'s `CommercialView` both call these
  — before this existed, they computed the same ratios independently with
  different rounding, which is exactly the kind of drift this file exists
  to prevent.
- **`formatRatio(pct, digits?)`** — turns a `number | null` into a display
  string, `'—'` for `null`. Don't reintroduce a local
  `(part/whole)*100).toFixed()` anywhere; call `getCommercialSummary` (or
  whatever produces the ratio) and format its output with this.

---

## 8. Things that look like real calculations and aren't (yet)

Worth knowing before quoting any number on this dashboard to a stakeholder.

- **`project.health`** ('On track' / 'At risk' / 'Delayed' / 'Not started')
  is a **manually set field**, editable via `EditProjectForm`. It is not
  derived from progress, overdue milestones, or open issues. Two projects
  in identical trouble can show different health if a Lead forgot to
  update the dropdown. A centralized health engine is Stage 2 (see
  `docs/roadmap.md`).
- **`getPlannedProgress`** (§7) is real, but only as real as the dates it's
  given — see the 17/20-projects caveat above. Don't assume every project
  shows a planned-progress number; check for the "Unavailable" state.
- **"Budget by phase"** (`CommercialPanel` in `project-detail.tsx`) splits
  the awarded amount across the first four phases using a fixed ratio
  `[0.12, 0.24, 0.31, 0.33]`. This is explicitly labelled *"Indicative
  split… not tracked separately yet"* in the UI — per-phase budgets aren't
  a real field on `Phase` yet.
- **Progress has one source of truth today, and it's the overall number,
  not the phases.** `project.progress` is set directly by
  `updateProject`/`saveProgress`; `phase.progress` is set independently per
  phase via `updatePhase`. Nothing currently enforces
  `project.progress === weighted average of phase.progress`. Making phase
  progress the source of truth and deriving the overall number from it is
  Stage 2 item 1 ("phase-weighted progress") — a bigger change than it
  sounds, since every current caller of `updateProject({ progress })`
  would need to change what it writes to.

None of these are bugs exactly — they're documented shortcuts, and the
first two are explicitly staged for Stage 2. The risk is someone building a
new feature on top of `project.health` or the phase/overall progress split
assuming it's already reconciled.

---

## 9. Known gaps vs. "a real system"

In rough order of how much they'd bite in production:

1. **No backend.** Nothing here survives a cleared browser profile or is
   visible to a second user. There's no `audit_logs` or `progress_updates`
   table — this is a UI over one JS array. (`data/users.ts` gives people
   stable ids now, but it's still a hardcoded file, not a `users` table.)
2. **No audit trail.** Editing a project's target date or commercial
   numbers overwrites the old value with no history. `lastUpdated` is
   stamped, but the previous value is gone.
3. **No progress history.** There's no `ProgressUpdate` timeline — only the
   current snapshot plus whatever free-text comment was attached to the
   last edit (stored as a `ProjectUpdate`, not a structured progress
   record).
4. **Issues and risks are one type.** `ProjectIssue` has a `severity` field
   but nothing separates "this already happened" from "this might
   happen" — there's no `ProjectRisk` with `probability`/`impact`.
5. **No "decision required" as a first-class concept.** A Lead can put
   `decisionRequired` text on a `Phase`, but there's no dedicated
   pending/approved/rejected workflow object.
6. **`project.health` and the phase/overall progress split** are the
   shortcuts in §8 — cosmetically fine, not safe to build automation on
   top of until Stage 2's health engine and phase-weighted progress land.

Full detail on all of these, staged into a concrete order, is in
[`docs/roadmap.md`](./docs/roadmap.md).

---

## 10. Safe defaults worth knowing about

- **Dates**: never parse a date string directly. Use `parseIsoDate`,
  `formatFullDate`, `formatDayMonth`, or `isValidIsoDate` from
  `src/lib/date.ts`. They return `null`/`'—'` on bad input instead of
  throwing `RangeError` (which used to crash the edit forms on an empty
  date field).
- **Money**: `formatCrore()` in `data/projects.ts` returns `'₹—'` for
  non-finite input instead of `'₹NaN Cr'`. `CRORE` (`= 10_000_000`) is the
  one place the conversion constant lives — don't hardcode `10000000`
  elsewhere.
- **Ratios and other derived numbers**: use `lib/calculations.ts` (§7).
  `formatRatio(pct, digits?)` takes the `number | null` a calculation
  produces and returns `'—'` for `null` — don't reintroduce a local
  `((part / whole) * 100).toFixed()` anywhere.
- **CSV export** (`ReportsView` in `workspace.tsx`): `csvCell()` prefixes
  any value starting with `= + - @ \t \r` with a `'` to stop spreadsheet
  formula injection from a project name like `=SUM(A1)`. If you add a new
  exportable field, run it through `csvCell`, not through raw
  interpolation.
- **Reduced motion**: `src/index.css` disables the `fade-up`/`stagger-*`
  entry animations and the grain overlay under
  `prefers-reduced-motion: reduce`. Don't add a new CSS animation outside
  that guard.

---

## 11. If you're about to add a feature, check first

- **New mutation on `Project`?** → add it to `app-state.tsx` through
  `mutate`/`patchById`, not by exporting `setProjectState`.
- **New date field?** → store as ISO `yyyy-mm-dd`, format with
  `lib/date.ts`, never with a raw `Intl.DateTimeFormat` call at the call
  site (that's how the old code got `RangeError` crashes on empty dates).
- **New money field?** → store in paise/rupees consistently (currently
  everything is raw rupees, divided by `CRORE` only for display) and format
  with `formatCrore`.
- **New calculated number (a ratio, a variance, anything derived from more
  than one field)?** → put it in `lib/calculations.ts` and have every page
  that needs it call the same function. That file's whole purpose is
  preventing two pages from computing the same thing slightly differently.
- **New reference to "who owns this project" or "is this the current
  user's project"?** → compare `project.leadId` to `user.id`, resolve
  display names with `leadName()` from `data/users.ts`. Never compare a
  name string.
- **New list of projects/issues/updates?** → give it an explicit empty
  state. Every existing list does (`"No projects match this view"`, etc.);
  a silently empty `<div>` reads as a bug.
- **Something that should be role-gated?** → gate on `canEdit` from
  `useAppState()`, not on `role === 'lead'` inline. If the role model ever
  grows a third editor role, `canEdit` is the only place that needs to
  change.

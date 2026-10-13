# Engineering Notes

Internal technical reference for engineers maintaining and extending the Encalm Project Dashboard. This document explains **why** architectural decisions were made, how state and security boundaries are enforced, and how to maintain system integrity.

---

## 1. System Reality & Evolution

The system is a **full-stack, production-ready project controls platform** serving Encalm Hospitality:
- **Backend**: Express 5 on Node.js running TypeScript, listening on port `5000`.
- **Database**: Embedded SQLite engine (`server/data/encalm.db`) running in Write-Ahead Logging (WAL) mode via `better-sqlite3`.
- **Frontend**: React 19 SPA built with Vite 7 and Tailwind CSS v4, utilizing `wouter` for lightweight routing.
- **Data Scope**: 68 real airport lounge, spa, bar, and transit facilities across Indian airports (Delhi, Hyderabad, Goa, Visakhapatnam, etc.).
- **Security**: JWT-based session tokens with strict server-side Role-Based Access Control (RBAC).

---

## 2. Architecture & State Management

### Single Source of Truth (SSOT)
All persistent state resides in the relational SQLite database (`server/data/encalm.db`). The frontend application state (`src/state/app-state.tsx`) maintains an in-memory cache synchronized with the backend via REST API calls.

```
React 19 Components
       │
       ▼
src/state/app-state.tsx (Optimistic UI & Cache)
       │
       ▼  REST / JSON (with Authorization: Bearer <JWT>)
server/src/routes/ (Express 5 + RBAC Middleware)
       │
       ▼
server/src/services/db.ts (better-sqlite3 in WAL Mode)
       │
       ▼
server/data/encalm.db (SQLite Database)
```

### State Mutations
All mutations in the frontend flow through unified handlers:
1. `mutate(updater)`: Checks client-side permissions, performs optimistic UI update, and dispatches HTTP requests to the Express backend.
2. `patchById(id, fn)`: Specialized helper for updating specific projects and their associated entities.

When a server request fails (e.g. network failure or 403 Forbidden), the client reverts the optimistic update and triggers a toast notification to ensure data integrity.

---

## 3. Server-Side RBAC & Authorization Architecture

Client-side permission checks are purely for UI/UX ergonomics (disabling buttons and hiding edit forms). **Security is strictly enforced on the server**:

1. **Authentication Gate (`requireAuth`)**:
   - Rejects unauthenticated requests (`401 Unauthorized`).
   - Verifies JWT signatures and populates `req.user`.

2. **Project Access Gate (`requireProjectAccess`)**:
   - **Project HOD (`hod@encalm.com`)**: Can view all projects; can approve or reject control points (`/milestones/:id/approve`, `/milestones/:id/reject`); blocked from modifying project specs, creating stages, or deleting records (`403 Forbidden`).
   - **Project Lead (`lead@encalm.com`)**: Granted full modification access only to projects where they are assigned as lead (`leadId` match).
   - Prevents unauthorized cross-tenant mutations.

3. **Critical Operations**:
   - `DELETE /api/projects/:id` strictly requires authentication and project ownership verification.

---

## 4. Centralized Calculations (`src/lib/calculations.ts`)

To prevent discrepancies across different dashboard views:
- **No arithmetic in UI views**: Pages never calculate variance, schedule delay, or budget consumption independently.
- **Unified Engine**: `src/lib/calculations.ts` provides canonical formulas:
  - `getPlannedProgress()`: Computes schedule progress based on `startDate` and `targetDate`. Returns `null` if dates are unavailable (no fabrication).
  - `getCommercialSummary()`: Aggregates sanctioned budgets, awarded contracts, spent amounts, and remaining commitments.
  - `calculateVariance()`: Derives actual vs. planned progress deltas.

---

## 5. Media Pipeline & Site Photographs

1. **Uploads**: Dispatched to `/api/photos/upload` as `multipart/form-data`.
2. **Multer Storage**: Validates file size (10 MB max) and whitelisted MIME types (`image/jpeg`, `image/png`, `image/webp`).
3. **Sharp Processing**:
   - Automatically downsizes master images to a maximum width of 1600px with 80% JPEG quality.
   - Generates 300px square thumbnail images for fast grid rendering.
   - Stores files in `server/uploads/` with sanitized timestamp-based filenames.
4. **Metadata Persistence**: Photo records with captions, stage tags, and uploader IDs are saved in SQLite (`photos` table).

---

## 6. Email Notification Pipeline

Automated notifications are managed through a dual-engine architecture in [`server/src/services/email.ts`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/server/src/services/email.ts):
1. **Primary Engine**: Brevo transactional HTTP API (`api.brevo.com/v3/smtp/email`).
2. **Fallback Engine**: Nodemailer SMTP transport for on-premise or secondary relay.
3. **Event Triggers**:
   - Milestone approval or rejection by HOD.
   - Stage completion sign-offs.
   - High-severity issue or risk creation.

---

## 7. SQLite Concurrency & Maintenance

- **WAL Mode**: Enabled upon database initialization (`PRAGMA journal_mode = WAL;`). Allows multiple concurrent read transactions without blocking writes.
- **Foreign Keys**: Enforced via `PRAGMA foreign_keys = ON;`. Cascading deletes protect referential integrity between projects, phases, milestones, issues, and photos.
- **Backup Strategy**: To back up the live database, run SQLite VACUUM INTO or copy `encalm.db` while WAL checkpoints are quiescent. See [`PRODUCTION.md`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/PRODUCTION.md) for automated backup scripts.

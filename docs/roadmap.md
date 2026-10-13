# Product Roadmap

This document tracks the phased evolution of the **Encalm Project Dashboard**, from initial prototype to enterprise production release, as well as future post-v1.0 enhancements.

---

## Stage 1 — Data & Logic Correction — ✅ Completed

**Goal**: Eliminate fabricated data and ensure all metrics derive from real project inputs or calculated models.

| # | Feature / Milestone | Status | Details |
|---|---|:---:|---|
| 1 | Centralized Calculations | ✅ | Canonical calculations in `src/lib/calculations.ts` (schedule variance, planned progress, commercial ratios). |
| 2 | Dynamic Date Handling | ✅ | Standardized date helpers in `src/lib/date.ts` removing all hardcoded time strings. |
| 3 | Planned Progress Engine | ✅ | True schedule calculation based on project start and target dates; returns `null` ("Unavailable") when dates are missing. |
| 4 | User Identity & Lead Assignment | ✅ | Structured user model in `src/data/users.ts` with stable IDs replacing unstructured strings. |
| 5 | Clean Dashboard Metrics | ✅ | Dynamic KPI cards and health breakdowns driven by portfolio data. |
| 6 | Real CSV Report Generation | ✅ | `ReportsView` exports actual milestone counts, budgets, and status data. |

---

## Stage 2 — Project Controls & Site Media — ✅ Completed

**Goal**: Deliver granular stage, milestone, and site evidence capabilities.

| # | Feature / Milestone | Status | Details |
|---|---|:---:|---|
| 1 | Milestone Lifecycle | ✅ | Milestone status progression (`pending`, `completed`, `delayed`, `approved`, `rejected`). |
| 2 | Decision & Control Points | ✅ | HOD governance workflow for approving and rejecting critical project milestones. |
| 3 | Multi-Photo Site Log | ✅ | Multer multipart upload accepting up to 10 photos per batch. |
| 4 | Image Optimization | ✅ | Automated Sharp pipeline generating compressed JPEGs (1600px max) and 300px thumbnails. |
| 5 | Issue & Risk Tracking | ✅ | Issue severity levels (Low, Medium, High, Critical), stage tagging, and resolution logs. |
| 6 | Stage & Phase Budgets | ✅ | Editable phase breakdowns with budget allocation and status toggling. |

---

## Stage 3 — Full-Stack Backend & RBAC — ✅ Completed

**Goal**: Replace browser localStorage with a multi-user relational backend and server-side access control.

| # | Feature / Milestone | Status | Details |
|---|---|:---:|---|
| 1 | Relational SQLite Engine | ✅ | Embedded SQLite database (`server/data/encalm.db`) configured with WAL mode and foreign key constraints. |
| 2 | Express 5 REST API | ✅ | 29 REST endpoints covering auth, projects, phases, milestones, issues, photos, updates, and notifications. |
| 3 | JWT Authentication | ✅ | Secure sign-in issuing signed JWT tokens (`/api/auth/login`). |
| 4 | Server-Side RBAC Enforcement | ✅ | Mandatory `requireAuth`, `requireProjectAccess`, and `canUserEditProject` middleware guarding all state mutations. |
| 5 | Mutation Vulnerability Fix | ✅ | Blocked unauthenticated requests from modifying or deleting project records (`401 Unauthorized`). |
| 6 | Role Segregation | ✅ | HOD restricted from modifying project specs; Leads restricted to assigned projects. |

---

## Stage 4 — Enterprise Dataset & PMO Features — ✅ Completed

**Goal**: Populate production database with real facilities and operational tools.

| # | Feature / Milestone | Status | Details |
|---|---|:---:|---|
| 1 | 68 Authentic Facilities | ✅ | Database seeded with complete Encalm airport lounge, spa, bar, and pod network. |
| 2 | In-App Notification Center | ✅ | Persistent notification store with unread counts and mark-all-read functionality. |
| 3 | Commercial Financial Analytics | ✅ | Real-time budget tracking (Sanctioned, Awarded, Paid-to-date, Commitments, Variance). |
| 4 | Schedule & Timeline Views | ✅ | Interactive Gantt timeline visualization showing phase sequences. |
| 5 | Audit Feed | ✅ | Chronological project updates feed tracking lead notes and stage milestones. |

---

## Stage 5 — Production Hardening & Operations — ✅ Completed

**Goal**: Enterprise reliability, security headers, containerization, and automated verification.

| # | Feature / Milestone | Status | Details |
|---|---|:---:|---|
| 1 | Dual-Engine Email Pipeline | ✅ | Transactional emails via Brevo HTTP API with Nodemailer SMTP fallback. |
| 2 | Security Hardening | ✅ | Helmet headers, CSP rules, and IP rate limiting (`express-rate-limit`). |
| 3 | Docker Containerization | ✅ | Multi-stage Dockerfile and docker-compose orchestration with healthchecks. |
| 4 | Automated API Test Suite | ✅ | End-to-end verification script (`server/src/scripts/test-all-apis.ts`) testing 29 endpoints with 100% pass rate. |
| 5 | Documentation Suite | ✅ | Complete architectural, API, security, operational, and contributing documentation. |

---

## Stage 6 — Future Roadmap (Post-v1.0.0)

Planned enhancements for upcoming minor releases:

| Planned Feature | Target | Description |
|---|:---:|---|
| **Live WebSocket / SSE Sync** | v1.1.0 | Real-time bi-directional synchronization so multiple leads viewing the same facility see updates without manual refreshes. |
| **Mobile PWA Offline Sync** | v1.2.0 | Offline mode for on-site engineers with local photo caching and background sync upon reconnecting to airport Wi-Fi. |
| **Cloud Storage S3/GCS Driver** | v1.3.0 | Optional storage adapter to offload site photos from local disk to AWS S3 or Google Cloud Storage. |
| **Automated S3 Database Backups** | v1.3.0 | Scheduled cron job streaming SQLite VACUUM snapshots to remote object storage. |
| **AI Project Intelligence** | v1.4.0 | Executive AI summaries predicting schedule delays and cost overruns based on historical stage duration trends. |

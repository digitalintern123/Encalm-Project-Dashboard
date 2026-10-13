# Changelog

All notable changes to the Encalm Project Dashboard are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-12

### Enterprise Production Release

This milestone promotes the Encalm Project Dashboard from a development prototype to an enterprise-grade, full-stack, production-ready project controls system.

#### Added
- **Server-Side Role-Based Access Control (RBAC)**:
  - Enforced strict server-side authorization middleware (`requireAuth`, `requireRole`, `requireProjectAccess`) across all state-mutating endpoints.
  - Protected `DELETE /api/projects/:id` and mutations so unauthenticated requests are strictly rejected (`401 Unauthorized`).
  - Enforced role segregation: Project HOD (`hod@encalm.com`) holds portfolio-wide read-only visibility with milestone approval/rejection authority; Project Leads hold full editing authority over assigned facilities.
- **Enterprise Dataset (68 Facilities)**:
  - Complete master database seeded with 68 authentic Encalm airport lounges, spas, transit pods, and bars (Visakhapatnam, Mopa Goa, Delhi T3/T1, Hyderabad, Ahmedabad, Raipur, etc.).
  - Realistic multi-stage engineering schedules (Civil, MEP, Interior Fit-out, IT/AV, Testing & Handover).
- **Automated Verification Test Suite**:
  - Comprehensive TypeScript test runner ([`server/src/scripts/test-all-apis.ts`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/server/src/scripts/test-all-apis.ts)) verifying 29 distinct API endpoints including RBAC protection tests and auth boundaries with 100% pass rate.
  - Added `npm run test:api` and `npm run test` scripts.
- **Dual-Engine Email Notification Service**:
  - Integrated transactional email system ([`server/src/services/email.ts`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/server/src/services/email.ts)) featuring Brevo HTTP API integration with automatic fallback to Nodemailer SMTP.
  - Email templates for milestone approvals, milestone rejections, stage sign-offs, and critical issue alerts.
- **Multi-Photo Upload & Image Optimization Pipeline**:
  - Secure multi-image upload endpoint via Multer (`multipart/form-data`) supporting up to 10 photos per batch.
  - Automated Sharp image processing: downscaling images to a maximum width of 1600px, 80% JPEG compression, and automatic 300px thumbnail generation.
  - Whitelisted MIME types (`image/jpeg`, `image/png`, `image/webp`) with secure unique filename generation.
- **Production Hardening & Deployment Assets**:
  - Helmet security headers customized for modern SPA Vite and CSP compatibility.
  - Rate limiting via `express-rate-limit` for authentication attempts (15 req/15min) and general API endpoints (300 req/15min).
  - Multi-stage Docker build ([`Dockerfile`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/Dockerfile)) and orchestration configuration ([`docker-compose.yml`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/docker-compose.yml)) with volume mounts and automated healthchecks.
  - Production readiness guide ([`PRODUCTION.md`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/PRODUCTION.md)).
- **Comprehensive Documentation Suite**:
  - [`ARCHITECTURE.md`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/ARCHITECTURE.md) (System architecture, ER diagrams, data flow, WAL concurrency model).
  - [`API.md`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/API.md) (Exhaustive REST API specification covering 29 endpoints).
  - [`SECURITY.md`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/SECURITY.md) (Security architecture, threat model, RBAC policies, and vulnerability disclosure).
  - [`CONTRIBUTING.md`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/CONTRIBUTING.md) (Developer guidelines, branch workflows, coding conventions, and PR requirements).

#### Changed
- Migrated all data mutations from client-side `localStorage` to SQLite Single Source of Truth (SSOT).
- Upgraded Express to Express 5 for enhanced performance and modern middleware handling.
- Optimized frontend queries with real-time optimistic UI updates and backend sync.

#### Security
- Resolved authorization gap where routes accepted unauthenticated requests via permissive `optionalAuth`.
- Enforced project-level isolation ensuring project leads can only mutate projects within their assignment scope.

---

## [0.3.0] - 2026-10-08

### Full-Stack Backend Integration

#### Added
- Node.js + Express backend running TypeScript.
- Embedded SQLite database engine with `better-sqlite3` operating in Write-Ahead Logging (WAL) mode.
- REST API layer exposing CRUD endpoints for projects, phases, milestones, issues, updates, and notifications.
- JWT authentication system (`/api/auth/login`, `/api/auth/me`).

---

## [0.2.0] - 2026-10-05

### Authentic Project Data Ingestion

#### Added
- Real airport lounge and facility metadata sourced from Encalm engineering specifications.
- Project budgeting and commercial data models (Sanctioned budget, awarded amount, paid-to-date, commitments).
- Dynamic phase weighting and milestone tracking models.

---

## [0.1.0] - 2026-09-28

### Initial Prototype

#### Added
- Single-page React 19 application with Vite 7 and Tailwind CSS v4.
- Prototype dashboard UI featuring portfolio health charts, milestones timeline, and issue logs.
- Client-side mock state stored in browser `localStorage`.

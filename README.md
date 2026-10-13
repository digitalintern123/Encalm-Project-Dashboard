# Encalm Project Dashboard

Enterprise-grade project-controls and PMO dashboard for **Encalm Hospitality**: portfolio health, stage progression, milestone governance, risk registers, commercial analytics, multi-photo site logs, and automated notifications across **68 airport lounges, spas, transit pods, and bars**.

**Full-Stack React 19 · Node.js & Express 5 · TypeScript · SQLite WAL (better-sqlite3) · Vite 7 · Tailwind CSS v4 · Docker**

---

## 📚 Technical Documentation Hub

For detailed architectural specifications, API contracts, security models, and developer guides, consult the dedicated documentation:

| Document | Description |
| :--- | :--- |
| **[Architecture Guide](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/ARCHITECTURE.md)** | System architecture, ER diagrams, SQLite WAL concurrency, dual email engine, photo pipeline |
| **[REST API Reference](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/API.md)** | Comprehensive endpoint reference (29 routes), JSON request/response schemas, error codes |
| **[Security Policy](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/SECURITY.md)** | Server-side RBAC, JWT token lifecycle, rate limiting, Helmet headers, upload sanitization |
| **[Production Deployment](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/PRODUCTION.md)** | Containerized deployment, PM2/Systemd setup, backup strategies, environment variables |
| **[Contributing Guidelines](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/CONTRIBUTING.md)** | Developer setup, PR workflows, TypeScript/React guidelines, test commands |
| **[Changelog](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/CHANGELOG.md)** | Semantic release notes tracking changes from prototype to v1.0.0 |
| **[Engineering Notes](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/notes.md)** | Internal engineering decisions, state mutations, and calculation principles |
| **[Product Roadmap](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/docs/roadmap.md)** | Development roadmap tracking completed milestones and future enhancements |

---

## 1. System Overview & Core Capabilities

- **Single Source of Truth (SSOT)**: Powered by an embedded SQLite database (`server/data/encalm.db`) configured with Write-Ahead Logging (WAL) and foreign key enforcement for high-throughput concurrent operations.
- **Server-Side Role-Based Access Control (RBAC)**: Enforced through mandatory JWT authentication middleware (`requireAuth`, `requireProjectAccess`, `canUserEditProject`). Prevents unauthorized mutations and data deletion across all 29 REST endpoints.
- **Dual-Engine Notification System**: Automated transactional email pipeline using the Brevo HTTP API with automatic fallback to Nodemailer SMTP.
- **Multi-Photo Processing Pipeline**: Multer-based multipart photo uploads with automated Sharp processing (JPEG compression, 1600px max width, 300px thumbnail generation).
- **Automated Verification**: End-to-end API test suite ([`server/src/scripts/test-all-apis.ts`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/server/src/scripts/test-all-apis.ts)) verifying 29 endpoints with 100% test pass rate.

---

## 2. Default User Accounts & Roles

| Email | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| `hod@encalm.com` | `encalm` | **Project HOD** (Ruchika Chauhan) | Portfolio-wide visibility, read-only across projects, milestone approval & rejection authority |
| `lead@encalm.com` | `encalm` | **Project Lead** (Chinmay Saxena) | Full editing rights over assigned projects, stages, milestones, issues, and site photographs |

---

## 3. Prerequisites

| Requirement | Supported Versions | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `20.19+` or `22.12+` | `node -v` |
| **npm** | `10+` | `npm -v` |
| **Docker** *(Optional)* | Docker Engine 24+ & Compose v2 | `docker compose version` |

---

## 4. Quick Start & Local Development

### Native Node.js Setup

```bash
# 1. Install dependencies across root and server
npm install

# 2. Start full-stack development servers concurrently (Backend :5000 + Frontend :5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The Vite dev server proxies `/api` calls directly to the Express backend running on port `5000`.

### Docker Setup

```bash
# Build and run containerized application with SQLite persistence
docker compose up -d --build

# View container logs
docker compose logs -f
```

The application will be accessible at [http://localhost:5000](http://localhost:5000).

---

## 5. NPM Commands

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Runs Express backend (`:5000`) and Vite frontend (`:5173`) concurrently |
| `npm run server` | Starts only the Express TypeScript backend server |
| `npm run seed` | Seeds SQLite database with the full enterprise dataset of 68 facilities |
| `npm run build` | Compiles frontend assets into production bundle (`dist/`) |
| `npm run typecheck` | Executes strict TypeScript type validation across frontend and backend |
| `npm run test` | Executes the complete 29-endpoint backend API test suite |
| `npm run test:api` | Runs automated E2E API verification with detailed step-by-step reporting |

---

## 6. Project Architecture & Directory Layout

```
├── server/                    # Node.js + Express 5 Backend
│   ├── src/
│   │   ├── controllers/      # Request handlers (auth, projects, milestones, etc.)
│   │   ├── middleware/       # JWT auth, RBAC (requireProjectAccess), upload, rate-limit
│   │   ├── routes/           # REST route definitions
│   │   ├── services/         # SQLite DB queries (db.ts), Brevo/SMTP email engine (email.ts)
│   │   └── scripts/          # test-all-apis.ts, seed-db.ts
│   ├── data/                 # SQLite encalm.db & WAL files
│   └── uploads/              # Stored site photographs and thumbnails
├── src/                      # React 19 Frontend
│   ├── components/           # UI primitives (shadcn), app-shell, dialogs, charts
│   ├── data/                 # Seed data fallback & domain TypeScript interfaces
│   ├── hooks/                # use-toast, use-mobile
│   ├── lib/                  # Calculation engine (calculations.ts), date utils, storage
│   ├── pages/                # Dashboard, Workspace, ProjectDetail, Login, NotFound
│   └── state/                # React context & app state provider (app-state.tsx)
├── Dockerfile                # Production multi-stage Docker build
├── docker-compose.yml        # Docker compose service definition with healthcheck
├── package.json              # Root package configuration and scripts
└── vite.config.ts            # Vite 7 build configuration with API reverse proxy
```

---

## 7. Production Deployment & Verification

Before promoting code changes to production or submitting a pull request, run all verification gates:

```bash
# 1. Typecheck
npm run typecheck

# 2. Automated API & RBAC Suite
npm run test

# 3. Production Frontend Build
npm run build
```

See [PRODUCTION.md](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/PRODUCTION.md) for full server configuration, reverse proxy setup with NGINX, SSL certificates, and environment variable references.

---

## 8. License

Internal proprietary software for **Encalm Hospitality Private Limited**. All rights reserved.

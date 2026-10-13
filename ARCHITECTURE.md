# System Architecture: Encalm Project Dashboard

This document details the architectural design, data flow, components, database structure, and integration patterns powering the **Encalm Project Dashboard**.

---

## 1. High-Level System Architecture

The Encalm Project Dashboard is an enterprise-grade full-stack project governance and portfolio management platform built with modern web technologies:

- **Frontend Client**: React 19 Single Page Application (SPA) powered by Vite 7, Tailwind CSS v4, Radix UI primitives, Lucide icons, and Recharts.
- **Backend API Server**: Node.js & Express 5 running with TypeScript, Helmet security headers, Gzip compression, and rate limiting.
- **Database Engine**: Embedded SQLite 3 (`better-sqlite3`) in Write-Ahead Logging (`WAL`) mode with foreign key constraints and memory query caching.
- **Notification Services**: Dual email engine supporting direct SMTP (Office 365 / Exchange) and Azure AD Microsoft Graph API (OAuth 2.0 client credentials).

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 SPA)"]
        UI["UI Layer (Dashboard, Area Sheet, Workspace, Details)"]
        AppState["AppState Provider (State, Cache, Mutations)"]
        APIClient["API Client (JWT Bearer Token, Auto-refresh)"]
        UI --> AppState
        AppState --> APIClient
    end

    subgraph Server["Backend Server (Express 5 + TypeScript)"]
        Helmet["Helmet & Security Headers"]
        Cors["CORS Origin Filter"]
        RateLimit["Rate Limiter (Auth & General)"]
        Compression["Gzip / Deflate Compression"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        StaticServer["Static Asset Server (Cache-Control: immutable)"]
        
        Router["Express Routers"]
        AuthRouter["Auth Router (/api/auth)"]
        ProjRouter["Projects Router (/api/projects)"]
        PhasesRouter["Phases Router (/:id/phases)"]
        MilestonesRouter["Milestones Router (/:id/milestones)"]
        IssuesRouter["Issues Router (/:id/issues)"]
        PhotosRouter["Photos Router (/api/photos)"]
        EmailRouter["Email Router (/api/email)"]
        SystemRouter["System Router (/api/system)"]
    end

    subgraph Storage["Persistent Storage Layer"]
        SQLite[("SQLite Master (server/data/encalm.db)<br/>WAL Mode + Foreign Keys")]
        Uploads[("Uploaded Site Photos<br/>server/data/uploads")]
        Snapshot[("Disaster Recovery Snapshot<br/>server/data/portfolio-database.json")]
    end

    subgraph External["External Services"]
        AzureGraph["Microsoft Graph API (Azure AD OAuth)"]
        SMTPRelay["SMTP Gateway (Office 365 / Outlook)"]
    end

    APIClient -->|HTTPS / REST| Helmet
    Helmet --> Cors
    Cors --> RateLimit
    RateLimit --> Compression
    Compression --> AuthMiddleware
    AuthMiddleware --> Router

    Router --> AuthRouter
    Router --> ProjRouter
    Router --> PhasesRouter
    Router --> MilestonesRouter
    Router --> IssuesRouter
    Router --> PhotosRouter
    Router --> EmailRouter
    Router --> SystemRouter

    ProjRouter --> SQLite
    PhasesRouter --> SQLite
    MilestonesRouter --> SQLite
    IssuesRouter --> SQLite
    PhotosRouter --> SQLite
    PhotosRouter --> Uploads
    SystemRouter --> SQLite
    SystemRouter --> Snapshot
    SQLite -.->|Auto-Export on Mutation| Snapshot

    EmailRouter --> AzureGraph
    EmailRouter --> SMTPRelay
```

---

## 2. Architectural Single Source of Truth (SSOT)

> [!IMPORTANT]
> **Authoritative Master**: The SQLite database file (`server/data/encalm.db`) is the canonical, live single source of truth for all project records, stages, milestones, issues, photos, updates, email logs, and authentic user identities.

### Secondary Artifacts
- **Disaster Recovery Snapshot (`server/data/portfolio-database.json`)**:
  - An asynchronous, point-in-time JSON snapshot generated automatically upon data-mutating operations.
  - Used strictly for cold-start disaster recovery (if the SQLite DB file is ever missing) or offline data export.
  - Snapshot files never overwrite live database records during normal server operations.
- **Client Cache**:
  - Browser memory and query caches are treated strictly as read-through caches. All data writes must commit synchronously to the SQLite database.

---

## 3. Database Schema (Entity-Relationship Diagram)

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "leads"
    PROJECTS ||--|{ PHASES : "contains"
    PROJECTS ||--o{ MILESTONES : "tracks"
    PROJECTS ||--o{ ISSUES : "registers"
    PROJECTS ||--o{ UPDATES : "logs"
    PROJECTS ||--o{ PHOTOS : "documents"
    PROJECTS ||--o{ EMAIL_LOGS : "references"

    USERS {
        string id PK
        string name
        string email UK
        string password_hash
        string role "hod | lead | coordinator | stakeholder"
        string title
        string initials
        datetime created_at
    }

    PROJECTS {
        string id PK
        string name
        string location
        string category
        string code
        string health "On track | At risk | Delayed | Not started"
        string status "Yet to start | In Design | In Tendering | Under Construction | Operational"
        real progress
        string target_date
        string target_label
        real aop
        real awarded
        real spent
        real projected_cost
        string area
        string pax_keys
        string next_milestone
        string next_milestone_date
        string lead_id FK
        string start_date
        string last_updated
        text specification_json
        string template_id
        datetime created_at
    }

    PHASES {
        string id PK
        string project_id FK
        string name
        string status "upcoming | active | blocked | complete"
        real progress
        real weight
        string owner
        integer order_index
        string planned_start
        string planned_finish
        string actual_finish
        text work_completed
        text next_action
        text decision_required
        real budget
        text tagged_users
        string updated_at
    }

    MILESTONES {
        string id PK
        string project_id FK
        string title
        string date
        string status "upcoming | complete | late"
        string stage
        string owner
        integer approval_required
        string approval_status "Not required | Pending | Approved | Rejected"
        string completed_date
        text tagged_users
        integer order_index
    }

    ISSUES {
        string id PK
        string project_id FK
        string title
        text detail
        string severity "High | Medium | Low"
        string owner
        string category
        string status "Open | In Progress | Resolved | Closed"
        string stage
        string date_raised
        string due_date
        string impact_cost
        string impact_schedule
        string impact_scope
        text action
        text resolution
        integer order_index
    }

    PHOTOS {
        string id PK
        string project_id FK
        string url
        string caption
        string stage
        string category "Progress | Inspection | Safety | Handover"
        string taken_date
        string uploaded_by
        string role
        integer file_size
        datetime created_at
    }

    UPDATES {
        string id PK
        string project_id FK
        string date
        string author
        string role
        text text
        string stage
        string kind
        datetime created_at
    }

    NOTIFICATIONS {
        string id PK
        string type "system | tag | milestone | issue"
        string title
        text message
        string project_id
        string link
        integer read
        datetime created_at
    }

    EMAIL_LOGS {
        string id PK
        string recipient_email
        string recipient_name
        string subject
        string template_type
        string project_id FK
        string status "sent | failed | outbox"
        text html_content
        text error
        datetime created_at
    }
```

---

## 4. Role-Based Access Control (RBAC) Architecture

The authorization model separates responsibilities across four distinct tiers:

```mermaid
flowchart TD
    subgraph Roles["System Roles"]
        Coord["Coordinator<br/>(Full Supervisor)"]
        Lead["Project Lead<br/>(Execution Lead)"]
        HOD["Project HOD<br/>(Executive Oversight)"]
        Stakeholder["Stakeholder / User<br/>(Viewer)"]
    end

    subgraph Scope["Access Scope & Permissions"]
        AllProjectsRW["Full Read / Write across ALL Projects"]
        AllottedRW["Read / Write ONLY on Allotted Projects"]
        ReadOnly["Global View-Only across Portfolio"]
        AdminOnly["System Config, Allotment, Deletions, SMTP"]
        Approval["Governance Approval / Sign-off"]
    end

    Coord --> AllProjectsRW
    Coord --> AdminOnly
    Coord --> Approval
    Lead --> AllottedRW
    HOD --> ReadOnly
    Stakeholder --> ReadOnly
```

### Authorization Rules Matrix
1. **Coordinator**:
   - Create, allot, edit, and delete any project.
   - Configure email gateways (SMTP & Azure Graph credentials).
   - Sign off or reject governance milestones.
   - Run system data imports/exports.
2. **Project Lead**:
   - Create new projects (automatically allotted to the creating Lead).
   - Add/edit/delete stages, milestones, issues, photos, and updates within their own allotted projects.
   - Cross-project modifications to other Leads' projects are blocked (`403 Forbidden`).
   - Project deletion and allotment changes are prohibited.
3. **Project HOD**:
   - Global read-only portfolio access.
   - All server mutations (`POST`, `PATCH`, `DELETE`) are strictly forbidden (`403 Forbidden`).
4. **Stakeholder / Directory Users**:
   - Read-only viewing and inclusion in notification mention tags.

---

## 5. Email Notification & Dispatch Engine

The email system employs a dual-provider architecture configured in [`server/src/services/email.ts`](file:///c:/Users/DigitalIntern/Downloads/Project-Dashboard-main%20(3)/Project-Dashboard-main/server/src/services/email.ts):

1. **Microsoft Graph API (Azure AD OAuth 2.0)**:
   - Uses client credentials flow (`tenantId`, `clientId`, `clientSecret`) to acquire bearer tokens from `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`.
   - Sends HTML emails via `https://graph.microsoft.com/v1.0/users/{senderEmail}/sendMail`.
   - Enables live enterprise directory auto-completion (`/api/email/directory?q=`).
2. **Standard SMTP**:
   - Nodemailer transport targeting Office 365 (`smtp-mail.outlook.com:587`, STARTTLS) or internal SMTP relays.
3. **Offline / Unconfigured Fallback (Email Outbox)**:
   - If neither provider has valid credentials, email notifications are not dropped.
   - They are recorded in the `email_logs` table with status `outbox` for audit trail inspection and manual resend once credentials are saved.

---

## 6. Photo Storage & Processing Pipeline

1. **Upload Input**: Client accepts multiple images (drag-and-drop or file picker) and converts them to base64 Data URIs.
2. **MIME Validation & Extension Whitelisting**:
   - The server validates the format against `ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']`.
   - Rejects non-image files, executable extensions, and unvalidated blobs.
3. **Storage**:
   - Photos are written to disk under `server/data/uploads/{projectId}_{timestamp}_{randomSuffix}.{ext}`.
   - Paths are stored relationally in SQLite `photos` table.
4. **Delivery & Caching**:
   - Express static handler serves `/uploads` with 1-day browser cache headers (`maxAge: 86400000`).
   - On project deletion, all associated disk files in `uploads/` are unlinked automatically to avoid orphaned disk consumption.

---

## 7. Resilience, Lifecycle & Graceful Shutdown

The backend process implements signal management:

1. **`SIGTERM` / `SIGINT` Handling**:
   - Stops HTTP server from accepting new incoming connections.
   - Allows in-flight HTTP requests to complete cleanly.
   - Executes `PRAGMA wal_checkpoint(TRUNCATE)` to flush WAL journal files into the main database file.
   - Exports a disaster-recovery JSON snapshot to `server/data/portfolio-database.json`.
   - Safely closes the SQLite database connection (`db.close()`).
   - Exits process with code 0.
2. **Fatal Exception Containment**:
   - `uncaughtException` and `unhandledRejection` handlers log structured diagnostic traces and initiate graceful cleanup to prevent data corruption.

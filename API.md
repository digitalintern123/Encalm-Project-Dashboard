# REST API Reference: Encalm Project Dashboard

This document provides the complete API specification for the **Encalm Project Dashboard** backend.

---

## 1. Conventions & Standards

- **Base URL**: `http://localhost:5000/api` (or `/api` when served behind reverse proxy / same-origin)
- **Content-Type**: `application/json`
- **Authentication**: Bearer token via HTTP header:
  ```http
  Authorization: Bearer <jwt-token>
  ```
- **Standard HTTP Status Codes**:
  - `200 OK`: Request succeeded.
  - `201 Created`: Resource created successfully.
  - `400 Bad Request`: Validation failure or missing required fields.
  - `401 Unauthorized`: Missing, invalid, or expired JWT token.
  - `403 Forbidden`: Action restricted by role permissions or project allotment.
  - `404 Not Found`: Target entity does not exist.
  - `429 Too Many Requests`: Rate limit threshold exceeded.
  - `500 Internal Server Error`: Server error.

---

## 2. Authentication & Users (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user and returns a signed JWT token and user profile.
- **Access**: Public (rate-limited: 30 attempts per 15 min).
- **Request Body**:
  ```json
  {
    "email": "chinmay.saxena@encalm.com",
    "password": "encalm"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-chinmay-saxena",
      "name": "Chinmay Saxena",
      "email": "chinmay.saxena@encalm.com",
      "role": "lead",
      "title": "Project Lead",
      "initials": "CS"
    }
  }
  ```

### `GET /api/auth/me`
Fetches the currently authenticated user's session profile.
- **Access**: Authenticated (`requireAuth`).
- **Response `200 OK`**: Returns `{ "user": { ... } }`.

### `GET /api/auth/users`
Lists all registered users (local accounts + Azure directory stakeholders).
- **Access**: Public / `optionalAuth`.
- **Response `200 OK`**:
  ```json
  {
    "users": [
      {
        "id": "user-chinmay-saxena",
        "name": "Chinmay Saxena",
        "email": "chinmay.saxena@encalm.com",
        "role": "lead",
        "title": "Project Lead",
        "initials": "CS"
      }
    ]
  }
  ```

### `GET /api/auth/leads`
Lists all users with the `lead` role.
- **Access**: Public / `optionalAuth`.

### `POST /api/auth/create-lead`
Registers a new project lead account.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator'])`).
- **Request Body**: `{ "name": "...", "email": "...", "password": "...", "title": "..." }`.

---

## 3. Projects (`/api/projects`)

### `GET /api/projects`
Retrieves all projects with complete nested stages, milestones, issues, photos, and updates.
- **Access**: Public / `optionalAuth`.
- **Response `200 OK`**:
  ```json
  {
    "projects": [ ... ]
  }
  ```

### `GET /api/projects/:id`
Retrieves a single project by ID with full details.
- **Access**: Public / `optionalAuth`.

### `POST /api/projects`
Creates a new project record.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator', 'lead'])`).
- **Request Body**:
  ```json
  {
    "name": "Hyderabad Premium Lounge",
    "location": "Hyderabad",
    "category": "Lounge",
    "code": "HYD-NEW-26",
    "aop": 4.5,
    "targetDate": "2026-12-15",
    "targetLabel": "Dec 2026",
    "lead_id": "user-chinmay-saxena"
  }
  ```
- **Response `201 Created`**: Returns the created project object.

### `PATCH /api/projects/:id`
Updates project attributes (progress, status, health, budget, metadata).
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Response `200 OK`**: Returns updated project.

### `PATCH /api/projects/:id/allot`
Allots or reassigns a project to a specific project lead.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator'])`).
- **Request Body**: `{ "leadId": "user-chinmay-saxena" }`.
- **Response `200 OK`**: Returns updated project.

### `DELETE /api/projects/:id`
Deletes a project and unlinks all associated photos from disk.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator'])`).
- **Response `200 OK`**: `{ "message": "Project deleted successfully" }`.

### `POST /api/projects/sync`
Performs bulk sync/restore of multiple project records.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator'])`).

---

## 4. Stages & Phases (`/api/projects/:id/phases`)

### `POST /api/projects/:id/phases`
Appends a new stage/phase to a project.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Request Body**:
  ```json
  {
    "name": "Interior Fitout",
    "owner": "Fitout Contractor",
    "status": "upcoming",
    "plannedStart": "2026-05-01",
    "plannedFinish": "2026-08-30",
    "weight": 25
  }
  ```
- **Response `201 Created`**: Returns updated project.

### `PATCH /api/projects/:id/phases/:phaseId`
Updates progress, status, dates, notes, or tagged users on a stage.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Response `200 OK`**: Returns updated project.

### `DELETE /api/projects/:id/phases/:phaseId`
Removes a stage from the project (projects must retain at least one stage).
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).

### `POST /api/projects/:id/phases/move`
Reorders stages within a project.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Request Body**: `{ "phaseIndex": 1, "direction": 1 }`.

---

## 5. Milestones (`/api/projects/:id/milestones`)

### `POST /api/projects/:id/milestones`
Creates a project milestone.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Request Body**:
  ```json
  {
    "title": "Civil Structure Handover",
    "date": "2026-11-15",
    "status": "upcoming",
    "stage": "Execution",
    "owner": "Civil Lead",
    "approvalRequired": true
  }
  ```

### `PATCH /api/projects/:id/milestones/:milestoneId`
Updates milestone details.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Note**: Changing `approvalStatus` (`Approved` / `Rejected`) strictly requires `role === 'coordinator'`.

### `DELETE /api/projects/:id/milestones/:milestoneId`
Removes a milestone.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).

---

## 6. Issues & Risks (`/api/projects/:id/issues`)

### `POST /api/projects/:id/issues`
Logs a new issue or risk on the project.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Request Body**:
  ```json
  {
    "title": "HVAC Chiller Delivery Delay",
    "detail": "Vendor delayed chiller unit shipment by 3 weeks.",
    "severity": "High",
    "owner": "MEP Lead",
    "category": "Procurement",
    "dueDate": "2026-10-30"
  }
  ```
- **Response `201 Created`**: Returns updated project.

### `PATCH /api/projects/:id/issues/:issueId`
Updates issue status (`Open`, `In Progress`, `Resolved`, `Closed`), resolution, or impact.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).

### `DELETE /api/projects/:id/issues/:issueId`
Deletes an issue.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).

---

## 7. Site Photos (`/api/projects/:id/photos` & `/api/photos`)

### `POST /api/projects/:id/photos`
Uploads a single site progress photo.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Request Body**:
  ```json
  {
    "fileData": "data:image/jpeg;base64,...",
    "fileName": "lounge_progress.jpg",
    "caption": "Flooring installation complete",
    "stage": "Execution",
    "category": "Progress"
  }
  ```

### `POST /api/projects/:id/photos/batch`
Uploads multiple site photos simultaneously.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Request Body**:
  ```json
  {
    "photos": [ { "fileData": "...", "fileName": "...", "caption": "..." } ]
  }
  ```

### `DELETE /api/projects/:id/photos/:photoId`
Deletes a photo record and removes the file from disk.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).

### `GET /api/photos`
Lists all site photographs across the entire portfolio.
- **Access**: Public / `optionalAuth`.

---

## 8. Updates & Notifications

### `POST /api/projects/:id/updates`
Posts a progress update entry to the project log.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('id')`).
- **Request Body**: `{ "text": "...", "kind": "Progress", "stage": "Execution" }`.

### `GET /api/notifications`
Fetches user notifications.
- **Access**: Public / `optionalAuth`.

### `PATCH /api/notifications/:id/read`
Marks a notification as read.
- **Access**: Authenticated (`requireAuth`).

### `POST /api/notifications/read-all`
Marks all notifications as read.
- **Access**: Authenticated (`requireAuth`).

---

## 9. Email & Notifications Engine (`/api/email`)

### `GET /api/email/settings`
Returns current email provider configuration (passwords and secrets masked).
- **Access**: Public / `optionalAuth`.

### `POST /api/email/settings`
Saves SMTP credentials or Azure AD Microsoft Graph credentials.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator'])`).

### `POST /api/email/test`
Sends a delivery test email via the active provider.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator'])`).

### `POST /api/email/tag-and-comment`
Tags team members on a stage/milestone/issue and dispatches email notifications.
- **Access**: Authenticated (`requireAuth`, `requireProjectAccess('projectId')`).
- **Request Body**:
  ```json
  {
    "projectId": "vizag-hotel-suites",
    "entityType": "Stage",
    "entityId": "stage-1",
    "entityTitle": "Concept Drawings",
    "taggedUserIds": [ "user-ruchika-chauhan" ],
    "comment": "Drawings are ready for your review."
  }
  ```

### `GET /api/email/directory?q={query}`
Searches live Microsoft Graph Azure AD corporate directory for employee names and emails.
- **Access**: Public / `optionalAuth`.

---

## 10. System Health & Probes (`/api/system`)

### `GET /api/system/health`
Liveness probe returning uptime, memory usage, and database entity counts.
- **Access**: Public.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "database": "connected (SQLite WAL)",
    "counts": {
      "projects": 68,
      "users": 105,
      "phases": 340,
      "milestones": 272,
      "issues": 136
    },
    "uptimeSeconds": 1420,
    "memory": { "rssMb": 85, "heapUsedMb": 42 }
  }
  ```

### `GET /api/system/ready`
Readiness probe testing SQLite read/write responsiveness.
- **Access**: Public.
- **Response `200 OK`**: `{ "status": "ready", "uptime": 1420 }`.

### `GET /api/system/export`
Exports complete portfolio data as a JSON document.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator', 'lead'])`).

### `POST /api/system/reset`
Wipes database clean.
- **Access**: Authenticated (`requireAuth`, `requireRole(['coordinator'])`).
- **Production Guard**: Requires `ALLOW_SYSTEM_RESET=true` in environment when `NODE_ENV=production`.

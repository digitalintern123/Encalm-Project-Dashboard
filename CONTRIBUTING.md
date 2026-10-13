# Contributing to Encalm Project Dashboard

Thank you for contributing to the **Encalm Project Dashboard**. This guide outlines development standards, local environment setup, testing procedures, and the pull request workflow.

---

## 1. Development Prerequisites

- **Node.js**: `v20.19+` or `v22.12+` LTS
- **npm**: `10+` (bundled with Node)
- **Git**: Latest version
- **Operating System**: Windows, macOS, or Linux

---

## 2. Local Setup & Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/digitalintern123/Encalm-Project-Dashboard.git
cd Encalm-Project-Dashboard

# 2. Install dependencies
npm install

# 3. Copy environment configuration
cp .env.example .env

# 4. Start full-stack development environment
# (Runs Express API on :5000 and Vite dev server on :5173 concurrently)
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 3. NPM Script Reference

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Runs backend Express server (`:5000`) and Vite frontend (`:5173`) concurrently |
| `npm run dev:web` | Runs frontend Vite dev server only |
| `npm run server` | Runs backend Express server in watch mode (`tsx watch`) |
| `npm run build` | Builds production frontend assets to `dist/` and runs full typecheck |
| `npm run build:client` | Builds Vite frontend bundle only |
| `npm run typecheck` | Validates TypeScript types across both frontend and server |
| `npm run test` | Executes full automated API and RBAC test suite (29 endpoints) |
| `npm run start` | Starts Express server in production mode |
| `npm run seed` | Seeds SQLite database with baseline sample projects |
| `npm run restore:all` | Restores authentic master datasets (Vizag, Mopa Goa, Master Area Sheet) |

---

## 4. Coding Conventions & Best Practices

### TypeScript & Linting
- **Strict Typing**: All new functions, components, and API endpoints must have explicit TypeScript types. Avoid using `any` where a union or interface can be written.
- **Typecheck Gate**: Always run `npm run typecheck` before committing. PRs with type errors will be rejected by CI.

### Backend Architecture
- **Single Source of Truth**: The SQLite database (`server/data/encalm.db`) is the canonical master. Do not create parallel storage mechanisms.
- **Route Authorization**: All new data-changing routes (`POST`, `PATCH`, `DELETE`) **must** enforce `requireAuth` and either `requireRole` or `requireProjectAccess`. Never expose open mutating endpoints.
- **Transactions & Performance**: For multi-step database updates, wrap queries in `db.transaction(() => { ... })()`.

### Frontend Guidelines
- **UI Components**: Use Radix UI primitives and Tailwind CSS v4 design tokens.
- **State Mutations**: Mutating operations in the frontend must go through the centralized mutators in `src/state/app-state.tsx`.
- **API Requests**: All client API requests must route through `src/lib/api.ts` so authentication headers and error handling remain uniform.

---

## 5. Testing Requirements

Before opening a pull request, ensure all tests and build checks pass locally:

```bash
# 1. Verify TypeScript types
npm run typecheck

# 2. Run automated test suite
npm run test

# 3. Verify production build
npm run build
```

If adding new API endpoints, add corresponding test cases to `server/src/scripts/test-all-apis.ts`.

---

## 6. Git Workflow & Commit Guidelines

1. **Branch Naming**:
   - `feat/feature-name` for new features
   - `fix/bug-description` for bug fixes
   - `refactor/component-name` for refactoring
   - `docs/documentation-update` for documentation changes
2. **Commit Messages**:
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(api): add project export endpoint`
   - `fix(auth): correct lead project allotment validation`
   - `docs(readme): update deployment instructions`

---

## 7. Submitting a Pull Request

1. Ensure your branch is rebased onto the latest `main`.
2. Push your branch to GitHub.
3. Open a Pull Request with a clear title and description of:
   - What changed
   - Why the change was made
   - Verification steps taken
4. Ensure CI checks pass.

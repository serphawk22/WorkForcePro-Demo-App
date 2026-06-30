# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

---

## Development Commands

### Start everything (recommended)
```bash
npm run dev          # from repo root — starts FastAPI + Next.js together
```

### Start individually
```bash
npm run dev:api      # FastAPI only (port 8000)
npm run dev:web      # Next.js only (port 3000)
```

### Frontend only
```bash
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint
```

### Backend only
```bash
cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Backend migrations (run as scripts, not Alembic)
```bash
cd backend && python migrate_add_columns.py   # example — check script names in backend/
```

## Environment Setup

**Backend** requires `backend/.env` with at minimum:
```
DATABASE_URL=postgresql://...
SECRET_KEY=...
```

**Frontend** uses `frontend/.env.local`:
- `NEXT_PUBLIC_API_URL` — set to backend URL in production; omit in local dev (proxy handles it)
- `BACKEND_API_URL` — used by Next.js rewrites on the server side

In local dev, the browser always calls `/api/...` which Next.js proxies to `http://127.0.0.1:8000` — no CORS issues. In production (Railway), `BACKEND_API_URL` points to the FastAPI service.

## Architecture

### Two-service monorepo
```
/
├── frontend/       Next.js 14 (App Router, TypeScript, Tailwind CSS)
├── backend/        FastAPI (Python, SQLModel, PostgreSQL)
├── scripts/        Node.js scripts for starting dev/prod
└── package.json    Root orchestrator — runs both services
```

### Frontend (`frontend/src/`)
- **`app/`** — Next.js App Router pages. Top-level routes: `login`, `signup`, `dashboard`, `admin`, `employee-dashboard`, `employees`, `attendance`, `tasks`, `payroll`, `requests`, `project-management`, `my-space`, `my-day`, `profile`
- **`components/`** — Shared components. `ui/` contains shadcn/ui primitives (Radix UI based). Feature-specific components live in subdirectories (`admin/`, `employee/`, `dashboard/`, etc.)
- **`lib/api.ts`** — Central API client. All fetch calls go through here. Auth uses both localStorage (access token) and HTTP-only cookies.
- **`hooks/useAuth.ts`** — Auth state hook used across the app
- **`lib/utils.ts`** — Tailwind `cn()` helper and general utilities

### Backend (`backend/app/`)
- **`main.py`** — FastAPI app, CORS, router registration, lifespan (DB init + scheduler)
- **`database.py`** — SQLModel engine, session factory; requires `DATABASE_URL` env var
- **`models.py`** — All SQLModel table definitions in one file
- **`schemas.py`** — Pydantic request/response schemas
- **`auth.py`** — JWT token logic and password hashing
- **`routers/`** — One file per domain: `auth`, `admin`, `users`, `attendance`, `tasks`, `leave`, `payroll`, `dashboard`, `notifications`, `comments`, `subtasks`, `myspace`, `teams`, `workspaces`, `organizations`, `payroll`, `weekly_sheet`, etc.
- **`services/`** — Background jobs and AI: `email_service`, `recurring_tasks`, `sheet_reminder_service`, `vector_indexing`, `workspace_ai_tools`, `workspace_executor`, `workspace_nlu`

### Auth flow
JWT access token stored in localStorage; refresh token in HTTP-only cookie. The frontend `AuthProvider` (`components/AuthProvider.tsx`) wraps the app and exposes auth context. `ProtectedRoute.tsx` guards pages by role (`admin` vs employee).

### Roles
Two roles: `admin` and `employee`. Admin routes live under `app/admin/`, employee views under `app/employee-dashboard/`. Role is encoded in the JWT and checked both client-side (route guards) and server-side (FastAPI dependencies in routers).

## UI Conventions
- Component library: shadcn/ui (Radix UI primitives + Tailwind). Add new components via the shadcn CLI pattern into `frontend/src/components/ui/`.
- Theme: clean white light / true-black dark. No glow effects, no skin-tone palette, no emojis in UI.
- Charts: Recharts. Icons: Lucide React.
- Forms: React Hook Form + Zod validation.
- Data fetching: TanStack Query (`QueryProvider` wraps the app).

# WorkForce Pro — Detailed Feature Reference

WorkForce Pro is a full-stack workforce management platform built for small-to-mid-size teams. It is branded under **SerpHawk** and deployed on Railway (FastAPI backend) + Vercel (Next.js frontend). The platform handles the entire employee lifecycle: onboarding, daily attendance, task tracking, leave management, payroll, and a suite of team culture tools. Two roles — **Admin** and **Employee** — see entirely different views and have different permissions throughout.

---

## 1. Authentication & Account Management

### Registration
New users sign up at `/signup` by providing their name, email, password, and desired role (admin or employee). After submission the account is placed in a `PENDING` state. **No login is possible until an admin manually approves the account.** This prevents unauthorized access to the platform.

### Login
The `/login` page authenticates with email and password. On success the backend issues a JWT access token (stored in `localStorage`) and a refresh token (HTTP-only cookie). The frontend automatically detects the user's role from the token and redirects admins to `/admin/dashboard` and employees to `/employee-dashboard`. The login page also pings the backend on mount to wake the Railway server before the user even clicks the button, reducing perceived cold-start latency.

### Session & Route Protection
`AuthProvider` wraps the entire app and exposes user context. `ProtectedRoute` gates every page — unauthenticated users are sent to `/login`; users who try to access a route outside their role are redirected to their own dashboard.

### Profile (`/profile`)
Every user can view and edit their own profile. Fields include name, age, date joined, GitHub URL, and LinkedIn URL. A profile picture can be uploaded directly from the page. The profile page also shows the user's most recent payroll record so employees always have their salary information at hand without navigating elsewhere. Admins can additionally see the same page when viewing any employee's detail record.

---

## 2. Admin Panel

### Admin Dashboard (`/admin/dashboard`)
The central command center for administrators. It loads in two phases: first the core stat cards appear (total employees, tasks due today, pending leave requests, attendance counts), then secondary widgets populate in the background.

**Widgets on the admin dashboard:**
- **Stat cards** — headcount, active users today, pending tasks, open leave requests
- **Task overview** — breakdown by status (to-do, in-progress, submitted, approved) and priority (high/medium/low)
- **Pending leave requests** — quick list with approve/reject actions directly from the dashboard
- **Team Happy Sheet snapshot** — a glance at the most recent happiness entries from all team members
- **Teams Meeting link** — the admin can paste a Microsoft Teams (or any video call) meeting URL with a title and share it to the entire team. The link then appears on every employee's dashboard until the admin removes it, making it easy to broadcast standups or all-hands calls
- **Personal projects** — admin's own personal projects from Learning Canvas are surfaced here

### Employee Directory (`/employees`)
Full list of all employees with profile pictures, email addresses, join dates, GitHub and LinkedIn links, and active/inactive status. Admins can:
- **Search** employees by name or email in real time
- **Add a new employee** via a modal form (name, email, password, role) — this creates the account directly without the approval step
- **Delete an employee** permanently, which cascades and removes all associated attendance records, tasks, and other data
- Click any employee card to navigate to that employee's detailed profile page at `/admin/users/[id]`

### User Approvals (`/admin/approvals`)
Lists all registered accounts with a status filter (All / Pending / Approved / Rejected). Admins approve or reject accounts one at a time. Approved employees immediately gain login access. Rejected accounts are denied entry. This page is the mandatory gate between self-registration and active platform access.

### Admin Ticket Center (`/admin/queries`)
Employees can raise support tickets (called "queries") to admins. This page shows all incoming tickets across the organization. Admins can view the description and priority of each ticket, start working on it (status moves to "in progress"), and mark it as resolved. This creates a lightweight internal help-desk without needing an external tool.

---

## 3. Employee Dashboard (`/employee-dashboard`)

The employee's home screen. It is personalized with a time-aware greeting ("Good Morning / Afternoon / Evening, [First Name]").

**Sections on the employee dashboard:**
- **Attendance punch card** — the same clock-in/clock-out control that exists on the Attendance page is embedded here, complete with a live running timer so the employee never loses track of their work hours
- **My tasks** — all tasks assigned to the employee, showing title, priority badge, due date, and status. Employees can update status inline with a dropdown (To Do → In Progress → Done). Expanding a task reveals its subtasks with their own status controls
- **Recurring task instances** — any recurring task shows the current period's instance with its own status dropdown separate from the parent task
- **Stat cards** — total tasks, completed tasks, pending tasks, and a clock showing time worked today
- **Active meeting link** — if the admin has shared a Teams meeting URL, it appears here as a prominent button so the employee can join with one click
- **Happy Sheet streak** — shows the employee's current consecutive-day Happy Sheet submission streak
- **Personal projects** — a compact view of the employee's own personal projects from Learning Canvas
- **Employee Ticket Center** — embedded widget where the employee can raise a new support ticket to the admin (specifying workspace, related task, title, description, and priority). All previously submitted tickets are listed with their current status

---

## 4. Attendance Tracking (`/attendance`)

### Clock In / Clock Out
A persistent timer runs in `AttendanceTimerProvider` at the root layout level, so it survives navigation between pages. Employees click **Punch In** to start their workday and **Punch Out** to end it. The system records the exact timestamp of each action in UTC and displays times in IST (Asia/Kolkata) throughout the UI.

### For Employees
- Live timer showing total hours and minutes worked today
- History table of all past attendance records with date, clock-in time, clock-out time, and total hours
- Date range filter and sort order (ascending / descending) to browse historical records
- A bar chart showing daily hours worked over recent days

### For Admins
- Toggle between **All Employees** view and **Individual Employee** view
- The "All Employees" graph overlays attendance data for every team member on a single chart, making it easy to spot attendance patterns or absences
- The individual view lets admins select a specific employee from a dropdown and inspect just their records
- The admin's own punch-in/out still works from this page

---

## 5. Task & Project Management

This is the largest subsystem in the platform. It is structured around **Workspaces → Projects → Tasks → Subtasks**.

### Workspaces
A Workspace is a top-level organizational container (equivalent to a department, product area, or client). Admins can create, edit, and delete workspaces. Each workspace has a name, optional description, icon, and color. Workspaces appear in the sidebar of every Project Management view and act as a filter throughout the system.

### Projects (root Tasks)
Within a workspace, root-level tasks function as projects. They have:
- Title and description
- Priority (low / medium / high)
- Due date
- Assignee (the employee responsible)
- Assigner (who created/assigned the task)
- Status: To Do → In Progress → Submitted (by employee) → Approved / Rejected (by admin)
- An alphanumeric public ID (e.g., `A7X9K2`) for easy reference
- Optional estimated hours and actual logged hours
- Subtasks (nested under the parent)
- Comments thread
- Voice notes (audio file attached to the task)
- Time log entries

### Subtasks
Each task can have child subtasks, each with their own title, description, assignee, priority, due date, and status. Subtasks follow a review workflow: employee marks it done → admin reviews → Approved or Rejected. Comments can be added to subtasks independently of the parent.

### Task Status Workflow
```
To Do → In Progress → Submitted (employee action)
                            ↓
                    Admin reviews
                  ↙             ↘
             Approved          Rejected (→ employee revises → Submitted again)
```

### Recurring Tasks
A task can be configured as recurring with:
- **Recurrence type**: daily, weekly, or monthly
- **Recurrence interval**: every N days/weeks/months
- **Repeat days** (weekly): specific days of the week (0 = Monday … 6 = Sunday)
- **Monthly day**: specific day of the month
- **Start and end dates** for the recurrence window

For each occurrence the system materializes a `TaskInstance` record with its own status (To Do / In Progress / Completed) that the employee updates independently. The parent task is a template; instances are the actual work units.

### Views in `/project-management`

**Project List (`/project-management`)** — Default landing. Shows all workspaces and the projects within them. Admins can create, edit, and delete workspaces here. Tasks are listed per workspace with status and priority indicators.

**Board View (`/project-management/board`)** — Kanban-style columns by task status (To Do, In Progress, Submitted, Approved). Tasks are cards that can be filtered by workspace. Admins see all tasks; employees see only their own.

**Timeline View (`/project-management/timeline`)** — A Gantt-like horizontal timeline showing tasks plotted against their due dates across a 3-month scrollable window. Each task bar is colored by priority. Clicking a task opens its detail. Admins see all tasks; employees see their own.

**Calendar View (`/project-management/calendar`)** — Tasks displayed on a calendar grid by due date. Allows quick visual scanning of upcoming deadlines.

**Summary View (`/project-management/summary`)** — A high-level summary grouped by workspace, showing completion rates and task counts.

**Reports View (`/project-management/reports`)** — Analytics for the task system:
- Priority breakdown (high/medium/low counts)
- Status breakdown across all statuses
- Per-assignee performance (admin only): each employee's task count, completed count, and overdue count rendered as bar charts
- Task stats fetched from the backend's dedicated stats endpoint

**Team View (`/project-management/team`)** — Shows the team roster alongside workspace-level task distribution. Team members and their assigned task counts.

### Task Detail Page (`/project-management/[id]`)
Clicking a task from any view opens its detail page. Contains the full task description, subtask list with inline status controls, comment thread with reply support, time log, and (for admins) approve/reject controls.

### AI Task Creation (admin-only)
From the task creation flow, admins can use the **AI Assistant** feature. The admin types a natural language prompt (e.g., "Assign a high-priority report to Priya due next Friday") and the backend sends it to OpenAI. The AI parses the prompt and returns structured JSON (title, description, assignee, priority, deadline, recurrence settings). The admin reviews the suggestion in a confirmation dialog, adjusts any fields, and confirms. The task is then created through the normal API pathway — the AI never creates tasks autonomously.

### `/tasks` Route
`/tasks` is a backward-compatible alias that renders the same Project List view. It accepts query params (`workspace`, `status`, `edit`, `create`, and prefill fields) so other parts of the app can deep-link directly into task creation or editing.

---

## 6. Leave Management (`/requests`)

### For Employees
- View all personal leave requests with their status (Pending / Approved / Rejected)
- Submit a new leave request by specifying:
  - Reason (text)
  - Leave type: Personal, Sick, Vacation, or Other
  - Start date and end date
  - Optional supporting document (file attachment)
- Cancel a pending request before it is reviewed
- Color-coded leave type badges and status icons for quick scanning

### For Admins
- See every leave request from all employees
- Click any request to open a review modal
- Add a comment and either **Approve** or **Reject** the request
- The employee is notified of the decision via the notification system

---

## 7. Payroll (`/payroll`)

The Payroll page is admin-only (employees are redirected to `/profile` which shows their own salary).

### Admin View
- Month/year selector to choose which pay period to view
- Table of all employees with their salary amount and current payroll status (Pending / Processing / Paid)
- Summary stat cards: total payroll for the period and average salary
- **Mark as Paid** button per employee
- Inline status dropdown to change an employee's payroll status (Pending → Paid)
- **Export** — download the payroll table as a PDF report for the selected month

### Employee View (on `/profile`)
The most recent payroll record for the logged-in employee is fetched and displayed on the profile page, showing their salary and payment status.

---

## 8. My Day (`/my-day`)

A personal productivity hub for employees and admins alike. It aggregates information from multiple parts of the platform into a single daily overview.

**Sections:**
- **Task overview** — today's tasks with statuses; clicking a task opens its detail or allows inline status change
- **Active meeting** — if the admin shared a Teams meeting link, it appears here prominently with the meeting title and a "Join" button
- **Happy Sheet streak** — the user's current submission streak displayed as a motivational counter
- **Personal projects** — cards for all the user's personal projects from Learning Canvas (stage: old / current / future)
- **Team management** — create a named team and add members from the organization. Once a team exists, a date range can be selected and the team's combined task sheets exported as a downloadable file for reporting
- **GitHub / external links** — if a task sheet entry contains a repo link, it surfaces here

---

## 9. My Space (`/my-space`)

My Space is a structured personal development and team culture section. It has five sub-sections accessible from a sidebar nav.

### 9a. Happy Sheet (`/my-space/happy-sheet`)
A daily mood and values log. Each day an employee fills in up to five prompts:
1. What made you happy today?
2. What did you do to make others happy?
3. Your dreams for the company (SerpHawk)
4. Your dreams with the company
5. Goals without greed — things you want to accomplish for intrinsic reasons

After submission the entry appears in the **Joy Log**, a team-wide chronological feed. The Joy Log supports:
- **Emoji reactions** — any team member can react to any entry with emojis; a custom emoji can be typed in
- **Comments and replies** — threaded comment discussions on each Happy Sheet entry
- **Appreciations** — a separate appreciation system where team members give formal shout-outs to each other
- **Date filtering** — the Joy Log can be filtered to any specific date
- **Streaks** — the system tracks how many consecutive days each user has submitted a Happy Sheet; streaks and leaderboards are displayed
- **Weekly highlights** — auto-generated summary of standout entries for the week
- **Weekly leaderboard** — ranks employees by their Happy Sheet engagement score for the week
- **Admin daily report** — admins can view a structured daily report of all happy sheet entries for any date
- Edit and delete own entries

### 9b. Task Sheet (`/my-space/task-sheet`)
A structured daily work log separate from the task management system. Each day an employee submits:
- Tasks completed (free-text description)
- Work impact (what effect the work had)
- Time taken
- Repository link (optional GitHub or deployment URL)

Entries appear in a team timeline sorted by date. Admins can see all entries; employees see the team timeline but can only edit/delete their own. Features:
- **Weekly progress draft** — a separate form to summarize the full week's work, including a GitHub link and a deployed-app link. This becomes a sharable weekly update
- **Export as PNG** — any task sheet entry can be exported as a formatted image card
- **Admin daily report** — admins can pull a structured report of all task sheet submissions for a given date
- Date range filtering and per-person filtering in the timeline

### 9c. Weekly Sheet (`/my-space/weekly-sheet`)
A freeform weekly summary form where employees manually type out their weekly accomplishments, blockers, and priorities for the coming week. The form is generated as a structured document that can be saved and referenced.

### 9d. Learning Canvas (`/my-space/learning-canvas`)
Two features in one page:
1. **Learning Focus** — Each team member posts what they are currently learning (a technology, concept, or skill). All team members' current learning focuses are displayed together, creating visibility into who is learning what. Entries can be edited and deleted by their author
2. **Personal Projects** — Each employee can log their own side projects with:
   - Title, writeup/description
   - Stage: Old (past project) / Current (in progress) / Future (planned)
   - Tag/category
   - GitHub link
   - Demo/deployment link
   - Optional image URL

Personal projects are visible to the admin on the Admin Dashboard as a team insight.

### 9e. Visionary Canvas (`/my-space/visionary-canvas`)
A dream-project board. Each employee writes a description of an ambitious project they would love to build or see built — no constraints, no immediate deadlines. All team members' aspirations are displayed as a gallery (one entry per person, the most recent). This encourages long-term thinking and helps management understand team ambitions. Entries can be edited and deleted by their author.

---

## 10. Notifications

A bell icon in the navigation bar shows an unread count badge that auto-refreshes every 30 seconds. Clicking it opens a dropdown with recent notifications. Notifications are generated for:
- Task assigned to you
- Task status changed (submitted, approved, rejected)
- Subtask assigned, approved, or rejected
- Comment posted on your task
- Leave request approved or rejected

Each notification links to the relevant entity. Marking individual notifications as read or using "Mark all as read" clears the badge counter.

---

## 11. Teams (within My Day)

Admins and employees can create **teams** — named groups of people pulled from the organization's user list. A team has a name, a project label, and a list of member user IDs. Once created, teams serve as reporting units: selecting a team and a date range fetches all task sheet entries from those members for that period and can export them in bulk.

---

## 12. Organizations

The platform supports a multi-organization model at the data layer. Each user belongs to an organization, and cross-organization data access is blocked at the API level (`ensure_same_organization` dependency). This means the platform can host multiple companies simultaneously with full data isolation. In the current deployment there is a single organization (SerpHawk), but the architecture is designed to onboard additional tenants.

---

## 13. Theme

The app supports **light and dark mode** via `next-themes`. A toggle button appears in the navigation bar. The light theme uses a clean white background; the dark theme uses true black. User preference is persisted across sessions.

---

## 14. Email Notifications (Backend Service)

The backend includes an email service (`services/email_service.py`) that sends notification emails for key events:
- Task assignment — the assigned employee receives an email with the task title, description, priority, due date, and a deep link to the task
- Weekly sheet reminders — a scheduler (`sheet_reminder_service.py`) runs as a background job using APScheduler and sends reminder emails to employees who have not submitted their weekly sheet by a configured time

Emails are sent via `nodemailer`-equivalent Python (using SMTP configuration from environment variables).

---

## 15. AI Assistant (Admin Tool)

Accessible from the task creation flow. The admin types a natural language instruction. The backend calls OpenAI's chat completions API with a system prompt that instructs the model to return only structured JSON. The JSON includes all task fields (title, description, assignee name, priority, deadline, and full recurrence configuration). If the request is ambiguous, the AI sets `needs_clarification: true` and returns a clarification question instead of task data. The admin sees the parsed result in a preview card, can edit any field, and then confirms to create the task. The AI integration never bypasses the normal task creation validation.

---

## 16. Search (`/search`)

A backend search router (`routers/search.py`) provides full-text search across tasks, employees, and other entities. The search is available in the UI's global navigation bar.

---

## Summary of Roles

| Capability | Admin | Employee |
|---|---|---|
| Approve / reject new accounts | Yes | No |
| View and manage all employees | Yes | No |
| Create / delete workspaces | Yes | No |
| Create and assign tasks | Yes | No |
| Update own task status | Yes | Yes |
| View all team's tasks | Yes | No (own only) |
| Approve / reject submitted tasks | Yes | No |
| View all attendance records | Yes | No (own only) |
| View and process payroll | Yes | No (own salary on profile) |
| Approve / reject leave requests | Yes | No |
| Submit leave requests | Yes | Yes |
| Share Teams meeting link | Yes | No |
| Raise support tickets | Yes | Yes |
| Resolve support tickets | Yes | No |
| Submit Happy Sheet / Task Sheet | Yes | Yes |
| View team Joy Log | Yes | Yes |
| Admin daily report (sheets) | Yes | No |
| AI task creation | Yes | No |

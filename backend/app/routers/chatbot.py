"""
Deterministic AI Chatbot router for WorkForce Pro.
Provides contextual page explanations and quick navigation actions.
"""
import os
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import get_current_user
from app.models import User, UserRole, Task
from app.database import get_session

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])

# --- OpenAI Integration ---

AI_SYSTEM_PROMPT = """You are a helpful AI Assistant for WorkForce Pro — an HR & Project Management platform.
You can help with navigation, task creation, AND subtask creation.

CONVERSATION CONTEXT:
Always maintain context from previous messages. If the user refers to "it", "this", or "that", use the context to determine what they mean.
Example: If the user previously mentioned a task, "assign it" refers to that task.

─── NAVIGATION ────────────────────────────────────────────────
When the user asks to open / go to / take me to / show / navigate to any section, ALWAYS set navigate_to.
Never say "you don't have access" unless the section is admin-only AND the user is an employee.

Routes available to EVERYONE (admin + employee):
  attendance            → /attendance
  project management    → /project-management/projects
  projects              → /project-management/projects
  tasks / my tasks      → /tasks
  requests / leave      → /requests
  profile               → /profile
  my space              → /my-space/task-sheet
  task sheet            → /my-space/task-sheet
  learning canvas       → /my-space/learning-canvas
  happy sheet           → /my-space/happy-sheet
  visionary canvas      → /my-space/visionary-canvas

Routes available to ADMIN only:
  dashboard / home      → /dashboard
  admin dashboard       → /dashboard
  payroll               → /payroll
  employees             → /employees

Routes available to EMPLOYEE only:
  dashboard / home      → /employee-dashboard
  employee dashboard    → /employee-dashboard

If an employee asks for an admin-only route (payroll, employees), politely explain it is admin-only
and do NOT set navigate_to.

If the user mentions a section that does not exist in the app at all, say so — do not fabricate routes.

─── TASK/SUBTASK PERMISSIONS ─────────────────────────────────
1. ADMINS: Can create MAIN TASKS and SUBTASKS.
2. EMPLOYEES: Can ONLY create SUBTASKS. They CANNOT create main tasks.
   - If an employee tries to create a main task, politely explain they can only create subtasks.
   - If they say "create a subtask for [Project]", set is_subtask_intent=true.
3. BOTH ADMINS AND EMPLOYEES: Can submit leave requests.

─── LEAVE REQUEST HANDLING ───────────────────────────────────
When a user wants to apply for leave / request time off / take sick leave / go on vacation:
- Set is_leave_intent=true
- Extract leave_data: reason, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), leave_type
- leave_type must be one of: "sick", "personal", "vacation", "other"
- If start_date or end_date is missing, set needs_clarification=true and ask for the missing dates.
- Use today's date as reference for relative expressions like "tomorrow", "next Monday", "this Friday".
- If the user says "take a day off tomorrow", set both start_date and end_date to tomorrow's date.
- Reason can be inferred if not given (e.g. "not feeling well" → reason = "Sick leave").

─── SMART FLOW ───────────────────────────────────────────────
- Do NOT ask repetitive questions.
- If you have 70% confidence in a field (title, assignee, deadline), fill it automatically.
- Default priority to 'medium' if not specified.
- If a user says "create a subtask for [Task Name]", set is_subtask_intent=true and parent_task_name=[Task Name].
- If they follow up with "assign it to [Name] by [Date]", update task_data while KEEPING parent_task_name.

─── RESPONSE FORMAT ──────────────────────────────────────────
Return a JSON object:
{
  "reply": "A friendly, concise response.",
  "navigate_to": "/exact-route-from-table-above" or null,
  "is_task_intent": true/false,
  "is_subtask_intent": true/false,
  "is_leave_intent": true/false,
  "task_data": {
    "title": "...",
    "description": "...",
    "assignee_name": "...",
    "priority": "low|medium|high",
    "deadline": "YYYY-MM-DD or null",
    "parent_task_name": "..." or null,
    "is_recurring": false,
    "recurrence_type": "daily|weekly|monthly or null",
    "recurrence_interval": 1,
    "repeat_days": [0-6] or null,
    "recurrence_start_date": "YYYY-MM-DD or null",
    "recurrence_end_date": "YYYY-MM-DD or null",
    "monthly_day": null
  } or null,
  "leave_data": {
    "reason": "...",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "leave_type": "sick|personal|vacation|other"
  } or null,
  "needs_clarification": true/false,
  "clarification_question": "..." or null,
  "suggestions": ["...", "..."] or null
}
"""

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

async def call_openai_for_chatbot(
    message: str, 
    role: str, 
    current_page: str, 
    employees: List[dict] = None,
    history: List[ChatMessage] = []
) -> dict:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return None

    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    employee_list_str = ""
    if employees:
        employee_list_str = "Available employees: " + ", ".join([f"{e['name']} (id={e['id']})" for e in employees])

    # Format history for OpenAI
    openai_messages = [{"role": "system", "content": AI_SYSTEM_PROMPT}]
    for msg in history[-10:]: # Last 10 messages for context
        openai_messages.append({"role": msg.role, "content": msg.content})
    
    user_prompt = f"""
    User Role: {role}
    Current Page: {current_page}
    {employee_list_str}
    Current Date: {datetime.now().strftime("%Y-%m-%d")}
    User Message: {message}
    """
    openai_messages.append({"role": "user", "content": user_prompt})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            response_format={"type": "json_object"},
            temperature=0.2
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None


# ---------------------------------------------------------------------------
# Data definitions
# ---------------------------------------------------------------------------

PAGE_EXPLANATIONS: dict[str, str] = {
    "dashboard": (
        "You are on the Dashboard — your central command centre. "
        "Here you can see a live snapshot of workforce activity: active employees, "
        "attendance rates, pending leave requests, open tasks, and recent notifications."
    ),
    "admin/dashboard": (
        "You are on the Admin Dashboard. "
        "Here you can monitor team performance, review workforce KPIs, "
        "manage pending approvals, and access all administrative functions."
    ),
    "attendance": (
        "This is the Attendance page. "
        "You can view daily punch-in / punch-out records, track work hours, "
        "identify late arrivals or absences, and export attendance reports."
    ),
    "payroll": (
        "This is the Payroll section. "
        "Admins can view salary records, employee payroll summaries, payment statuses, "
        "and generate or export payroll reports for any pay period."
    ),
    "project-management": (
        "This is Project Management. "
        "Here you can create and manage projects, assign tasks to team members, "
        "track progress on boards or timelines, and view project reports."
    ),
    "requests": (
        "This is the Requests page. "
        "Employees submit leave or time-off requests here. "
        "Admins can review, approve, or reject pending requests."
    ),
    "employees": (
        "This is the Employees directory. "
        "Browse all employee profiles, view their roles and departments, "
        "manage accounts, and access individual performance data."
    ),
    "tasks": (
        "This is the Tasks page. "
        "View and manage all tasks assigned to you or your team. "
        "You can update status, add comments, and track deadlines."
    ),
    "profile": (
        "This is your Profile page. "
        "Update your personal information, change your password, "
        "and manage your notification preferences."
    ),
    "my-space": (
        "This is My Space — your personal productivity hub. "
        "Access your task sheet, learning canvas, visionary canvas, "
        "and happiness tracker all in one place."
    ),
    "my-space/task-sheet": (
        "This is your Task Sheet inside My Space. "
        "Manage your personal to-do list, set priorities, and track progress on individual tasks."
    ),
    "my-space/learning-canvas": (
        "This is the Learning Canvas inside My Space. "
        "Log your learning goals, track courses, and record professional development milestones."
    ),
    "my-space/happy-sheet": (
        "This is the Happy Sheet inside My Space. "
        "Share how you're feeling at work and provide periodic well-being feedback."
    ),
    "my-space/visionary-canvas": (
        "This is the Visionary Canvas inside My Space. "
        "Set long-term career goals, define your vision, and track progress over time."
    ),
    "employee-dashboard": (
        "You are on your Employee Dashboard. "
        "Here you can see your upcoming tasks, leave balance, attendance record, "
        "and recent notifications — all at a glance."
    ),
}

# Quick navigation actions per page, per role
# Format: {"label": str, "route": str}
ADMIN_ACTIONS: dict[str, list[dict]] = {
    "dashboard": [
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Manage Employees", "route": "/employees"},
        {"label": "Open Payroll", "route": "/payroll"},
        {"label": "Project Management", "route": "/project-management"},
    ],
    "admin/dashboard": [
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Manage Employees", "route": "/employees"},
        {"label": "Open Payroll", "route": "/payroll"},
        {"label": "Project Management", "route": "/project-management"},
    ],
    "attendance": [
        {"label": "View Employees", "route": "/employees"},
        {"label": "Open Payroll", "route": "/payroll"},
        {"label": "Back to Dashboard", "route": "/dashboard"},
    ],
    "payroll": [
        {"label": "View Employee Profiles", "route": "/employees"},
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Back to Dashboard", "route": "/dashboard"},
    ],
    "project-management": [
        {"label": "View Employees", "route": "/employees"},
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Back to Dashboard", "route": "/dashboard"},
    ],
    "requests": [
        {"label": "View Employees", "route": "/employees"},
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Back to Dashboard", "route": "/dashboard"},
    ],
    "employees": [
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Open Payroll", "route": "/payroll"},
        {"label": "Back to Dashboard", "route": "/dashboard"},
    ],
    "tasks": [
        {"label": "View Employees", "route": "/employees"},
        {"label": "Project Management", "route": "/project-management"},
        {"label": "Back to Dashboard", "route": "/dashboard"},
    ],
    "profile": [
        {"label": "Back to Dashboard", "route": "/dashboard"},
        {"label": "View Employees", "route": "/employees"},
    ],
}

EMPLOYEE_ACTIONS: dict[str, list[dict]] = {
    "employee-dashboard": [
        {"label": "My Tasks", "route": "/tasks"},
        {"label": "My Space", "route": "/my-space/task-sheet"},
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Submit Request", "route": "/requests"},
        {"label": "Project Management", "route": "/project-management"},
    ],
    "attendance": [
        {"label": "My Tasks", "route": "/tasks"},
        {"label": "Submit Request", "route": "/requests"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
    "tasks": [
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Project Management", "route": "/project-management"},
        {"label": "My Space", "route": "/my-space/task-sheet"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
    "project-management": [
        {"label": "My Tasks", "route": "/tasks"},
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
    "requests": [
        {"label": "View Attendance", "route": "/attendance"},
        {"label": "My Tasks", "route": "/tasks"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
    "profile": [
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
        {"label": "My Tasks", "route": "/tasks"},
    ],
    "my-space": [
        {"label": "Task Sheet", "route": "/my-space/task-sheet"},
        {"label": "Learning Canvas", "route": "/my-space/learning-canvas"},
        {"label": "Happy Sheet", "route": "/my-space/happy-sheet"},
        {"label": "Visionary Canvas", "route": "/my-space/visionary-canvas"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
    "my-space/task-sheet": [
        {"label": "Learning Canvas", "route": "/my-space/learning-canvas"},
        {"label": "Happy Sheet", "route": "/my-space/happy-sheet"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
    "my-space/learning-canvas": [
        {"label": "Task Sheet", "route": "/my-space/task-sheet"},
        {"label": "Happy Sheet", "route": "/my-space/happy-sheet"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
    "my-space/happy-sheet": [
        {"label": "Task Sheet", "route": "/my-space/task-sheet"},
        {"label": "Visionary Canvas", "route": "/my-space/visionary-canvas"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
    "my-space/visionary-canvas": [
        {"label": "Task Sheet", "route": "/my-space/task-sheet"},
        {"label": "Happy Sheet", "route": "/my-space/happy-sheet"},
        {"label": "Back to Dashboard", "route": "/employee-dashboard"},
    ],
}

# Allow employees to access these shared pages
SHARED_EMPLOYEE_ROUTES = {
    "attendance", "tasks", "project-management", "requests", "profile",
    "my-space", "my-space/task-sheet", "my-space/learning-canvas",
    "my-space/happy-sheet", "my-space/visionary-canvas",
}

# Command aliases → page key that they map to
NAV_COMMANDS: list[tuple[list[str], str]] = [
    (["dashboard", "home", "go to dashboard", "back to dashboard", "open dashboard",
      "take me to dashboard", "show dashboard"], "dashboard"),
    (["admin dashboard", "go to admin", "admin panel", "take me to admin"], "admin/dashboard"),
    (["attendance", "go to attendance", "view attendance", "open attendance", "show attendance",
      "open the attendance", "take me to attendance", "attendance section", "attendance page"], "attendance"),
    (["payroll", "go to payroll", "open payroll", "view payroll", "show payroll", "generate payroll",
      "open the payroll", "take me to payroll", "payroll section", "payroll page"], "payroll"),
    (["project", "projects", "project management", "go to projects", "open projects", "show projects",
      "open project management", "project-management", "take me to projects", "take me to project management",
      "project section", "project management section", "projects section", "project page"], "project-management"),
    (["requests", "go to requests", "open requests", "leave request", "submit request",
      "open the requests", "take me to requests", "request section", "requests section",
      "leave requests", "leave section", "request page", "requests page"], "requests"),
    (["employees", "go to employees", "view employees", "open employees", "show employees",
      "manage employees", "employee list", "take me to employees", "employees section",
      "employee section", "employee directory"], "employees"),
    (["tasks", "my tasks", "go to tasks", "view tasks", "open tasks", "show tasks",
      "open the tasks", "take me to tasks", "task section", "tasks section", "task page"], "tasks"),
    (["profile", "my profile", "go to profile", "open profile", "take me to profile",
      "profile section", "profile page"], "profile"),
    (["my space", "my-space", "go to my space", "open my space", "take me to my space",
      "myspace", "my space section"], "my-space/task-sheet"),
    (["task sheet", "task-sheet", "go to task sheet", "open task sheet"], "my-space/task-sheet"),
    (["learning canvas", "go to learning", "learning-canvas", "open learning canvas"], "my-space/learning-canvas"),
    (["happy sheet", "happy-sheet", "how am i feeling", "open happy sheet"], "my-space/happy-sheet"),
    (["visionary canvas", "visionary-canvas", "my vision", "open visionary canvas"], "my-space/visionary-canvas"),
    (["employee dashboard", "employee-dashboard", "my dashboard", "take me to employee dashboard",
      "take me home", "go home"], "employee-dashboard"),
]

# RBAC: admin-only pages
ADMIN_ONLY_ROUTES = {"payroll", "employees", "admin/dashboard"}


def _normalise_page(pathname: str) -> str:
    """Strip leading slash and lowercase the pathname."""
    return pathname.strip("/").lower()


def _get_explanation(page_key: str) -> str:
    return PAGE_EXPLANATIONS.get(
        page_key,
        f"You are on the {page_key.replace('-', ' ').replace('/', ' › ').title()} page. "
        "Use the quick actions below to navigate to other sections of the platform.",
    )


def _get_actions(page_key: str, role: str) -> list[dict]:
    if role == "admin":
        # Fall back to dashboard actions if page not found
        return ADMIN_ACTIONS.get(page_key, ADMIN_ACTIONS.get("dashboard", []))
    else:
        # Employees
        return EMPLOYEE_ACTIONS.get(page_key, EMPLOYEE_ACTIONS.get("employee-dashboard", []))


def _resolve_nav_command(message: str) -> Optional[str]:
    """Return a page key if the message is a navigation command, else None."""
    msg = message.strip().lower()
    for keywords, page_key in NAV_COMMANDS:
        for kw in keywords:
            if msg == kw or msg.startswith(kw + " ") or msg.endswith(" " + kw) or f" {kw} " in f" {msg} ":
                return page_key
    return None


def _route_for_role(page_key: str, role: str) -> str:
    """Return the canonical frontend route for a page key, respecting RBAC."""
    route_map = {
        "dashboard": "/dashboard",
        "admin/dashboard": "/admin/dashboard",
        "attendance": "/attendance",
        "payroll": "/payroll",
        "project-management": "/project-management",
        "requests": "/requests",
        "employees": "/employees",
        "tasks": "/tasks",
        "profile": "/profile",
        "my-space": "/my-space/task-sheet",
        "my-space/task-sheet": "/my-space/task-sheet",
        "my-space/learning-canvas": "/my-space/learning-canvas",
        "my-space/happy-sheet": "/my-space/happy-sheet",
        "my-space/visionary-canvas": "/my-space/visionary-canvas",
        "employee-dashboard": "/employee-dashboard",
    }
    return route_map.get(page_key, f"/{page_key}")


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ChatbotQueryRequest(BaseModel):
    message: str
    current_page: str  # raw pathname, e.g. "/payroll" or "payroll"
    history: Optional[List[ChatMessage]] = []


class ChatAction(BaseModel):
    label: str
    route: str


class ChatbotQueryResponse(BaseModel):
    reply: str
    actions: list[ChatAction]
    navigate_to: Optional[str] = None
    is_task_intent: bool = False
    is_subtask_intent: bool = False
    is_leave_intent: bool = False
    task_data: Optional[dict] = None
    leave_data: Optional[dict] = None
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    suggestions: Optional[List[str]] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/query", response_model=ChatbotQueryResponse)
async def chatbot_query(
    request: ChatbotQueryRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Enhanced chatbot endpoint with OpenAI support.
    """
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    page_key = _normalise_page(request.current_page)
    message = request.message.strip()

    # Fetch all employees — needed for both admin task assignment AND employee subtask assignment
    employee_stmt = select(User).where(User.role == UserRole.employee)
    employees = [{"id": e.id, "name": e.name} for e in session.exec(employee_stmt).all()]

    # Try OpenAI first
    ai_response = await call_openai_for_chatbot(message, role, page_key, employees, request.history or [])
    
    if ai_response:
        # Resolve assignee_id and parent_task_id if needed
        if (ai_response.get("is_task_intent") or ai_response.get("is_subtask_intent")) and ai_response.get("task_data"):
            task_data = ai_response["task_data"]
            assignee_name = task_data.get("assignee_name")
            found_emp = False
            if assignee_name:
                for emp in employees:
                    if emp["name"].lower() == assignee_name.lower() or assignee_name.lower() in emp["name"].lower() or emp["name"].lower() in assignee_name.lower():
                        task_data["assignee_id"] = emp["id"]
                        task_data["assignee_name"] = emp["name"]
                        found_emp = True
                        break
            
            # Subtask specific: find parent task ID
            if ai_response.get("is_subtask_intent"):
                parent_name = task_data.get("parent_task_name")
                if parent_name:
                    # Search for tasks matching this name
                    task_stmt = select(Task).where(Task.title.ilike(f"%{parent_name}%"))
                    # If employee, they can create subtasks for ANY task? 
                    # User said: "Employees ARE allowed to create subtasks under existing tasks"
                    # Usually they should see all tasks to create subtasks for them, 
                    # but maybe restricted to those they can see. Let's allow matching any task for now.
                    
                    matched_tasks = session.exec(task_stmt).all()
                    
                    if len(matched_tasks) == 1:
                        task_data["parent_task_id"] = matched_tasks[0].id
                        task_data["parent_task_name"] = matched_tasks[0].title
                        ai_response["needs_clarification"] = False
                    elif len(matched_tasks) > 1:
                        ai_response["needs_clarification"] = True
                        ai_response["suggestions"] = [t.title for t in matched_tasks[:3]]
                        ai_response["reply"] = f"I found multiple tasks matching '{parent_name}'. Which one did you mean?"
                        ai_response["clarification_question"] = "Please select the correct parent task."
                    else:
                        # Fallback: find similar tasks
                        fallback_stmt = select(Task).limit(3)
                        similar_tasks = session.exec(fallback_stmt).all()
                        ai_response["needs_clarification"] = True
                        ai_response["suggestions"] = [t.title for t in similar_tasks]
                        ai_response["reply"] = f"I couldn't find a task named '{parent_name}'."
                        ai_response["clarification_question"] = "I couldn't find that task. Here are some active tasks you might be looking for:"

            # Clarify if the named assignee wasn't found — applies to both admin and employee
            if assignee_name and not found_emp:
                ai_response["needs_clarification"] = True
                ai_response["is_task_intent"] = False
                ai_response["is_subtask_intent"] = False
                ai_response["clarification_question"] = f"I couldn't find an employee named '{assignee_name}'. Who should I assign this to?"
                ai_response["suggestions"] = [e["name"] for e in employees[:5]]
                ai_response["reply"] = ai_response["clarification_question"]

        # ── Navigation post-processing ──────────────────────────────
        # 1. If OpenAI didn't set navigate_to, check deterministic nav commands as fallback
        if not ai_response.get("navigate_to"):
            nav_target = _resolve_nav_command(message)
            if nav_target and (role == "admin" or nav_target not in ADMIN_ONLY_ROUTES):
                ai_response["navigate_to"] = _route_for_role(nav_target, role)

        # 2. RBAC: strip navigate_to if it points to an admin-only route for an employee
        raw_nav = ai_response.get("navigate_to") or ""
        if raw_nav and role != "admin":
            nav_key = raw_nav.strip("/").lower()
            if nav_key in ADMIN_ONLY_ROUTES:
                ai_response["navigate_to"] = None
                ai_response["reply"] = (
                    "That section is only available to admins. "
                    "You can access: Attendance, Project Management, Tasks, Requests, My Space, or your Profile."
                )

        # 3. Fix employee home-route: if AI set /dashboard for an employee, redirect to /employee-dashboard
        if ai_response.get("navigate_to") in ("/dashboard",) and role != "admin":
            ai_response["navigate_to"] = "/employee-dashboard"

        actions = _get_actions(page_key, role)
        return ChatbotQueryResponse(
            reply=ai_response.get("reply", "How can I help you?"),
            actions=[ChatAction(**a) for a in actions],
            navigate_to=ai_response.get("navigate_to"),
            is_task_intent=ai_response.get("is_task_intent", False),
            is_subtask_intent=ai_response.get("is_subtask_intent", False),
            is_leave_intent=ai_response.get("is_leave_intent", False),
            task_data=ai_response.get("task_data"),
            leave_data=ai_response.get("leave_data"),
            needs_clarification=ai_response.get("needs_clarification", False),
            clarification_question=ai_response.get("clarification_question"),
            suggestions=ai_response.get("suggestions")
        )

    # --- Fallback to deterministic logic ---

    # --- RBAC guard: employees must not access admin-only pages ---
    if role != "admin" and page_key in ADMIN_ONLY_ROUTES:
        page_key = "employee-dashboard"

    # --- Check if message is a navigation command ---
    nav_target = _resolve_nav_command(message)

    if nav_target is not None:
        # Enforce RBAC on navigation target
        if role != "admin" and nav_target in ADMIN_ONLY_ROUTES:
            reply = (
                "Sorry, you don't have permission to access that section. "
                "Here are the pages available to you:"
            )
            actions = _get_actions(page_key, role)
            return ChatbotQueryResponse(reply=reply, actions=[ChatAction(**a) for a in actions])

        route = _route_for_role(nav_target, role)
        explanation = _get_explanation(nav_target)
        actions = _get_actions(nav_target, role)
        return ChatbotQueryResponse(
            reply=f"Navigating you to {nav_target.replace('-', ' ').replace('/', ' › ').title()}. {explanation}",
            actions=[ChatAction(**a) for a in actions],
            navigate_to=route,
        )

    # --- Generic help / what / how questions ---
    lower_msg = message.lower()
    help_triggers = {"what", "how", "help", "explain", "tell me", "what can", "what is", "what are", "show me", "guide", "?"}
    is_help_query = any(t in lower_msg for t in help_triggers) or lower_msg in {"hi", "hello", "hey", "start", ""}

    if is_help_query or not message:
        explanation = _get_explanation(page_key)
        actions = _get_actions(page_key, role)
        return ChatbotQueryResponse(
            reply=explanation,
            actions=[ChatAction(**a) for a in actions],
        )

    # --- Fallback: return page context ---
    explanation = _get_explanation(page_key)
    actions = _get_actions(page_key, role)
    return ChatbotQueryResponse(
        reply=(
            f"I'm not sure about \"{message}\", but here's what I can tell you about the current page:\n\n"
            f"{explanation}"
        ),
        actions=[ChatAction(**a) for a in actions],
    )


@router.post("/context", response_model=ChatbotQueryResponse)
async def chatbot_context(
    request: ChatbotQueryRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Return page context and quick actions without a user message.
    Called automatically when the chatbot is first opened on a page.
    """
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    page_key = _normalise_page(request.current_page)

    # RBAC guard
    if role != "admin" and page_key in ADMIN_ONLY_ROUTES:
        page_key = "employee-dashboard"

    page_display = page_key.replace("-", " ").replace("/", " › ").title()
    explanation = _get_explanation(page_key)
    actions = _get_actions(page_key, role)

    reply = (
        f"Hi! I can help you navigate this page.\n\n"
        f"You are currently on: **{page_display}**\n\n"
        f"{explanation}"
    )

    return ChatbotQueryResponse(
        reply=reply,
        actions=[ChatAction(**a) for a in actions],
    )

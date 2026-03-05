"""
Deterministic AI Chatbot router for WorkForce Pro.
Provides contextual page explanations and quick navigation actions.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.models import User, UserRole

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


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
    (["dashboard", "home", "go to dashboard", "back to dashboard", "open dashboard"], "dashboard"),
    (["admin dashboard", "go to admin", "admin panel"], "admin/dashboard"),
    (["attendance", "go to attendance", "view attendance", "open attendance", "show attendance"], "attendance"),

    (["payroll", "go to payroll", "open payroll", "view payroll", "show payroll", "generate payroll"], "payroll"),
    (["project", "projects", "project management", "go to projects", "open projects", "show projects", "open project management", "project-management"], "project-management"),
    (["requests", "go to requests", "open requests", "leave request", "submit request"], "requests"),
    (["employees", "go to employees", "view employees", "open employees", "show employees", "manage employees", "employee list"], "employees"),
    (["tasks", "my tasks", "go to tasks", "view tasks", "open tasks", "show tasks"], "tasks"),
    (["profile", "my profile", "go to profile", "open profile"], "profile"),
    (["my space", "my-space", "go to my space", "open my space"], "my-space/task-sheet"),
    (["task sheet", "task-sheet", "go to task sheet", "open task sheet"], "my-space/task-sheet"),
    (["learning canvas", "go to learning", "learning-canvas"], "my-space/learning-canvas"),
    (["happy sheet", "happy-sheet", "how am i feeling"], "my-space/happy-sheet"),
    (["visionary canvas", "visionary-canvas", "my vision"], "my-space/visionary-canvas"),
    (["employee dashboard", "employee-dashboard", "my dashboard"], "employee-dashboard"),
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


class ChatAction(BaseModel):
    label: str
    route: str


class ChatbotQueryResponse(BaseModel):
    reply: str
    actions: list[ChatAction]
    navigate_to: Optional[str] = None  # if the message is purely a nav command


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/query", response_model=ChatbotQueryResponse)
async def chatbot_query(
    request: ChatbotQueryRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Deterministic chatbot endpoint.
    Returns a contextual reply and quick-action buttons for the current page.
    """
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    page_key = _normalise_page(request.current_page)
    message = request.message.strip()

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

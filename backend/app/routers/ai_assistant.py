"""
AI Assistant router — OpenAI-powered natural-language task creation.

Admin-only:  generate structured task data from a prompt, then confirm-create.
Reuses existing Task model, public_id generation, and notification logic.
"""
import os
import json
from datetime import datetime, timezone, date as DateType
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, Task, TaskStatus, TaskPriority, UserRole, Workspace,
    NotificationType,
)
from app.auth import get_current_admin_user
from app.routers.tasks import generate_public_id
from app.routers.notifications import create_notification
from app.services.recurring_tasks import ensure_instances_for_task

router = APIRouter(prefix="/api/ai-assistant", tags=["AI Assistant"])

# ─── Request / Response schemas ────────────────────────────────────────────────

class EmployeeInfo(BaseModel):
    id: int
    name: str

class GenerateTaskRequest(BaseModel):
    prompt: str
    employees: List[EmployeeInfo]

class GeneratedTaskData(BaseModel):
    title: str
    description: str
    assignee_name: Optional[str] = None
    assignee_id: Optional[int] = None
    priority: str = "medium"
    deadline: Optional[str] = None
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    is_recurring: bool = False
    recurrence_type: Optional[str] = None  # daily | weekly | monthly
    recurrence_interval: int = 1
    repeat_days: Optional[List[int]] = None  # 0=Mon .. 6=Sun
    recurrence_start_date: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    monthly_day: Optional[int] = None

class GenerateTaskResponse(BaseModel):
    task: Optional[GeneratedTaskData] = None
    error: Optional[str] = None

class ConfirmTaskRequest(BaseModel):
    title: str
    workspace_id: int
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    is_recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_interval: int = 1
    repeat_days: Optional[List[int]] = None
    recurrence_start_date: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    monthly_day: Optional[int] = None

class ConfirmTaskResponse(BaseModel):
    success: bool
    task_id: Optional[int] = None
    public_id: Optional[str] = None
    message: str

# ─── OpenAI helper ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a task-creation assistant for a workforce management system called WorkForce Pro.

Given a natural language request, extract structured task information and return ONLY a JSON object (no markdown, no extra text) with these fields:

{
  "title": "short task title",
  "description": "1-2 sentence description of what needs to be done",
  "assignee_name": "employee name if mentioned, or null",
  "priority": "low" | "medium" | "high",
  "deadline": "YYYY-MM-DD format if a date/time is mentioned, or null",
  "needs_clarification": false,
  "clarification_question": "",
  "is_recurring": false,
  "recurrence_type": null,
  "recurrence_interval": 1,
  "repeat_days": null,
  "recurrence_start_date": null,
  "recurrence_end_date": null,
  "monthly_day": null
}

Recurrence rules:
- If the user asks for repeating / weekly / daily / monthly / every Friday / until December, set is_recurring=true.
- recurrence_type: "daily" | "weekly" | "monthly".
- recurrence_interval: e.g. every 2 weeks -> interval 2 with weekly.
- repeat_days: for weekly only — array of weekday numbers 0=Monday through 6=Sunday (e.g. Friday only -> [4]).
- recurrence_start_date / recurrence_end_date: YYYY-MM-DD when inferable ("until December" -> end of that month).
- monthly_day: for monthly by date (1-31); omit if unclear.
- deadline can still be the next occurrence or first due date.

Rules:
- If the user mentions an employee name, match it against the provided employee list (case-insensitive, partial match OK).
- If the employee name is ambiguous or not found, set needs_clarification=true and ask in clarification_question.
- For relative dates like "tomorrow", "next Friday", "by end of week", convert to YYYY-MM-DD using the provided current date.
- Priority defaults to "medium" if not specified.
- Always provide a concise title and helpful description.
- Return ONLY the JSON object, nothing else.
"""


async def call_openai(prompt: str, employees: List[EmployeeInfo], current_date: str) -> GeneratedTaskData:
    """Call OpenAI API and parse structured task data."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.",
        )

    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    employee_list_str = ", ".join(f"{e.name} (id={e.id})" for e in employees)

    user_message = (
        f"Current date: {current_date}\n"
        f"Available employees: [{employee_list_str}]\n\n"
        f"User request: {prompt}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=500,
        )

        content = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        data = json.loads(content)

        # Resolve assignee_id from name if provided
        assignee_id = None
        assignee_name = data.get("assignee_name")
        if assignee_name:
            for emp in employees:
                if emp.name.lower() == assignee_name.lower() or assignee_name.lower() in emp.name.lower():
                    assignee_id = emp.id
                    assignee_name = emp.name
                    break

        return GeneratedTaskData(
            title=data.get("title", "Untitled Task"),
            description=data.get("description", ""),
            assignee_name=assignee_name,
            assignee_id=assignee_id,
            priority=data.get("priority", "medium"),
            deadline=data.get("deadline"),
            needs_clarification=data.get("needs_clarification", False),
            clarification_question=data.get("clarification_question", ""),
            is_recurring=bool(data.get("is_recurring", False)),
            recurrence_type=data.get("recurrence_type"),
            recurrence_interval=int(data.get("recurrence_interval") or 1),
            repeat_days=data.get("repeat_days"),
            recurrence_start_date=data.get("recurrence_start_date"),
            recurrence_end_date=data.get("recurrence_end_date"),
            monthly_day=data.get("monthly_day"),
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an invalid response. Please try rephrasing your request.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {str(e)}",
        )


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/generate-task", response_model=GenerateTaskResponse)
async def generate_task(
    request: GenerateTaskRequest,
    admin: User = Depends(get_current_admin_user),
):
    """Generate structured task data from a natural language prompt using OpenAI."""
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    current_date = datetime.now().strftime("%Y-%m-%d")
    task_data = await call_openai(request.prompt, request.employees, current_date)
    return GenerateTaskResponse(task=task_data)


@router.post("/create-task", response_model=ConfirmTaskResponse)
async def create_task_from_ai(
    request: ConfirmTaskRequest,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Create a real task from confirmed AI-generated data.  Reuses existing logic."""

    # Validate assignee exists
    assignee = None

    workspace = session.exec(select(Workspace).where(Workspace.id == request.workspace_id)).first()
    if not workspace:
        raise HTTPException(status_code=400, detail="Workspace not found.")
    if workspace.organization_id != admin.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to use this workspace.")

    if request.assigned_to:
        assignee = session.exec(select(User).where(User.id == request.assigned_to)).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assigned employee not found.")

    # Validate priority
    try:
        priority = TaskPriority(request.priority.lower())
    except ValueError:
        priority = TaskPriority.medium

    # Parse due_date
    due_date = None
    if request.due_date:
        try:
            due_date = datetime.strptime(request.due_date, "%Y-%m-%d").date()
        except ValueError:
            pass  # Ignore unparseable dates

    is_rec = bool(request.is_recurring)
    repeat_days_str = None
    recurrence_type = None
    recurrence_interval = 1
    recurrence_start = None
    recurrence_end = None
    monthly_day_val = None

    if is_rec:
        recurrence_type = request.recurrence_type
        if recurrence_type not in ("daily", "weekly", "monthly"):
            raise HTTPException(status_code=400, detail="recurrence_type must be daily, weekly, or monthly")
        recurrence_interval = max(1, request.recurrence_interval or 1)
        if request.recurrence_start_date:
            try:
                recurrence_start = datetime.strptime(request.recurrence_start_date, "%Y-%m-%d").date()
            except ValueError:
                recurrence_start = due_date or DateType.today()
        else:
            recurrence_start = due_date or DateType.today()
        if request.recurrence_end_date:
            try:
                recurrence_end = datetime.strptime(request.recurrence_end_date, "%Y-%m-%d").date()
            except ValueError:
                recurrence_end = None
        if request.repeat_days:
            repeat_days_str = json.dumps(request.repeat_days)
        elif recurrence_type == "weekly":
            repeat_days_str = json.dumps([recurrence_start.weekday()])
        if recurrence_type == "monthly":
            monthly_day_val = request.monthly_day or recurrence_start.day

    task = Task(
        title=request.title,
        description=request.description,
        priority=priority,
        due_date=due_date,
        workspace_id=request.workspace_id,
        organization_id=admin.organization_id,
        assigned_to=request.assigned_to,
        assigned_by=admin.id,
        public_id=generate_public_id(session, Task),
        is_recurring=is_rec,
        recurrence_type=recurrence_type if is_rec else None,
        recurrence_interval=recurrence_interval if is_rec else 1,
        repeat_days=repeat_days_str,
        recurrence_start_date=recurrence_start if is_rec else None,
        recurrence_end_date=recurrence_end if is_rec else None,
        monthly_day=monthly_day_val,
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    if is_rec:
        ensure_instances_for_task(session, task, horizon_days=120, past_days=7)

    # Notify assigned employee
    if assignee:
        create_notification(
            session=session,
            user_id=assignee.id,
            type=NotificationType.TASK_ASSIGNED,
            message=f"New task assigned: Task #{task.id} - {task.title}",
            task_id=task.id,
        )

    return ConfirmTaskResponse(
        success=True,
        task_id=task.id,
        public_id=task.public_id,
        message=f"Task '{task.title}' created and assigned successfully!",
    )

"""
Task management routes with flat structure and deliverable tracking.
"""
import base64
import io
import json
import os
import random
import string
from datetime import datetime, timezone, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import and_, or_
from sqlmodel import Session, select


def generate_public_id(session: Session, model_class, prefix: str = "", length: int = 6) -> str:
    """Generate a unique alphanumeric public ID like A7X9K2."""
    chars = string.ascii_uppercase + string.digits
    while True:
        suffix = ''.join(random.choices(chars, k=length))
        candidate = f"{prefix}{suffix}" if prefix else suffix
        existing_same_model = session.exec(select(model_class).where(model_class.public_id == candidate)).first()
        existing_task = session.exec(select(Task).where(Task.public_id == candidate)).first()
        existing_subtask = session.exec(select(Subtask).where(Subtask.public_id == candidate)).first()
        if not existing_same_model and not existing_task and not existing_subtask:
            return candidate

from app.database import get_session
from app.models import (
    User, Task, TaskCreate, TaskUpdate, TaskRead, TaskWithAssignee,
    TaskStatus, UserRole, NotificationType, Subtask, TaskComment, Notification, SubtaskStatus,
    SubtaskWithAssignee, TaskCommentWithUser, TaskInstance, TaskInstanceStatus, Workspace,
)
from app.auth import get_current_user, get_current_admin_user, get_current_user_optional, ensure_same_organization
from app.routers.notifications import create_notification
from app.services.recurring_tasks import ensure_instances_for_task, materialize_all_recurring_tasks

router = APIRouter(prefix="/tasks", tags=["Tasks"])

ALLOWED_VOICE_MIME_TYPES = {
    "audio/webm",
    "audio/mp3",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
}

MAX_VOICE_NOTE_BYTES = 8 * 1024 * 1024


def _resolve_voice_content_type(raw_content_type: str, filename: Optional[str]) -> str:
    content_type = (raw_content_type or "").lower().strip().split(";", 1)[0].strip()
    if content_type:
        return content_type

    if not filename:
        return ""

    lowered_name = filename.lower()
    if lowered_name.endswith(".webm"):
        return "audio/webm"
    if lowered_name.endswith(".mp3"):
        return "audio/mpeg"
    if lowered_name.endswith(".wav"):
        return "audio/wav"
    if lowered_name.endswith(".ogg"):
        return "audio/ogg"
    if lowered_name.endswith(".m4a"):
        return "audio/mp4"
    return ""


def _get_openai_client() -> Optional["OpenAI"]:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return None
    try:
        from openai import OpenAI
    except Exception as exc:
        raise RuntimeError(f"OpenAI SDK import failed: {exc}")

    try:
        return OpenAI(api_key=api_key)
    except Exception as exc:
        raise RuntimeError(f"OpenAI client init failed: {exc}")


def _transcribe_voice_with_openai(client: "OpenAI", raw: bytes, filename: Optional[str]) -> Optional[str]:
    file_for_openai = io.BytesIO(raw)
    file_for_openai.name = filename or "voice-note.webm"
    tx = client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=file_for_openai,
    )
    maybe_text = getattr(tx, "text", None)
    if isinstance(maybe_text, str):
        return maybe_text.strip() or None
    return None


def _summarize_transcript_with_openai(client: "OpenAI", transcript: str) -> str:
    prompt = (
        "Transform this task voice note transcript into a clear, detailed project task description. "
        "Output plain text with short sections: Objective, Scope, Deliverables, Constraints, "
        "Acceptance Criteria, and Notes. Keep it concise and actionable."
    )
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        max_tokens=450,
        messages=[
            {"role": "system", "content": "You write crisp, practical task briefs for engineering teams."},
            {"role": "user", "content": f"{prompt}\n\nTranscript:\n{transcript}"},
        ],
    )
    content = (response.choices[0].message.content or "").strip()
    return content


def _task_visibility_clause(user: User):
    """Allow org-scoped tasks and legacy null-org tasks created by this user."""
    return or_(
        Task.organization_id == user.organization_id,
        and_(Task.organization_id.is_(None), Task.assigned_by == user.id),
    )


def _ensure_task_access(user: User, task: Task, resource_name: str = "task") -> None:
    """Back-compat access for legacy tasks that predate organization scoping."""
    if task.organization_id == user.organization_id:
        return
    if task.organization_id is None and task.assigned_by == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Not authorized to access this {resource_name}",
    )


def _recurrence_kwargs(task: Task) -> dict:
    """Fields for TaskRead / TaskWithAssignee (backward compatible if columns missing)."""
    return {
        "is_recurring": bool(getattr(task, "is_recurring", False)),
        "recurrence_type": getattr(task, "recurrence_type", None),
        "recurrence_interval": getattr(task, "recurrence_interval", None) or 1,
        "repeat_days": getattr(task, "repeat_days", None),
        "recurrence_start_date": getattr(task, "recurrence_start_date", None),
        "recurrence_end_date": getattr(task, "recurrence_end_date", None),
        "monthly_day": getattr(task, "monthly_day", None),
    }


def _workspace_kwargs(workspace: Optional[Workspace], task: Task) -> dict:
    return {
        "workspace_id": task.workspace_id,
        "workspace_name": workspace.name if workspace else None,
        "workspace_icon": workspace.icon if workspace else None,
        "workspace_color": workspace.color if workspace else None,
    }

def _task_to_with_assignee(session: Session, task: Task) -> TaskWithAssignee:
    assignee = None
    if task.assigned_to:
        assignee_stmt = select(User).where(User.id == task.assigned_to)
        assignee = session.exec(assignee_stmt).first()

    workspace = None
    if task.workspace_id:
        workspace_stmt = select(Workspace).where(Workspace.id == task.workspace_id)
        workspace = session.exec(workspace_stmt).first()

    assigner = None
    if task.assigned_by:
        assigner_stmt = select(User).where(User.id == task.assigned_by)
        assigner = session.exec(assigner_stmt).first()

    return TaskWithAssignee(
        id=task.id,
        public_id=task.public_id,
        title=task.title,
        description=task.description,
        voice_note_url=task.voice_note_url,
        voice_note_transcript=task.voice_note_transcript,
        priority=task.priority,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        parent_task_id=task.parent_task_id,
        assigned_to=task.assigned_to,
        assigned_by=task.assigned_by,
        status=task.status,
        done_by_employee=task.done_by_employee,
        github_link=task.github_link,
        deployed_link=task.deployed_link,
        **_workspace_kwargs(workspace, task),
        start_date=task.start_date,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee.name if assignee else None,
        assignee_email=assignee.email if assignee else None,
        assigned_by_name=assigner.name if assigner else None,
        progress=calculate_task_progress(task, session),
        **_recurrence_kwargs(task),
    )


def _legacy_subtask_status_to_task_status(status: SubtaskStatus) -> TaskStatus:
    """Map legacy subtask statuses onto task statuses used by Project Management grid."""
    if status == SubtaskStatus.completed:
        return TaskStatus.submitted
    if status == SubtaskStatus.reviewing:
        return TaskStatus.reviewing
    if status == SubtaskStatus.approved:
        return TaskStatus.approved
    if status == SubtaskStatus.rejected:
        return TaskStatus.rejected
    if status == SubtaskStatus.in_progress:
        return TaskStatus.in_progress
    return TaskStatus.todo


def _legacy_subtask_to_task_with_assignee(
    session: Session,
    subtask: Subtask,
    root_task_id: int,
    workspace: Optional[Workspace],
) -> TaskWithAssignee:
    """Convert legacy `subtasks` rows into task-shaped rows for backward-compatible UI rendering."""
    assignee = None
    if subtask.assigned_to:
        assignee = session.exec(select(User).where(User.id == subtask.assigned_to)).first()

    assigner = None
    if subtask.assigned_by:
        assigner = session.exec(select(User).where(User.id == subtask.assigned_by)).first()

    # Use negative ids to avoid collisions with real task ids in the same payload.
    synthetic_id = -subtask.id
    synthetic_parent_id = -subtask.parent_subtask_id if subtask.parent_subtask_id else root_task_id

    return TaskWithAssignee(
        id=synthetic_id,
        public_id=subtask.public_id,
        title=subtask.title,
        description=subtask.description,
        voice_note_url=None,
        voice_note_transcript=None,
        priority=subtask.priority,
        due_date=subtask.due_date,
        estimated_hours=None,
        actual_hours=None,
        parent_task_id=synthetic_parent_id,
        assigned_to=subtask.assigned_to,
        assigned_by=subtask.assigned_by,
        status=_legacy_subtask_status_to_task_status(subtask.status),
        done_by_employee=subtask.status == SubtaskStatus.completed,
        github_link=None,
        deployed_link=None,
        workspace_id=workspace.id if workspace else None,
        workspace_name=workspace.name if workspace else None,
        workspace_icon=workspace.icon if workspace else None,
        workspace_color=workspace.color if workspace else None,
        start_date=subtask.created_at,
        completed_at=None,
        created_at=subtask.created_at,
        updated_at=subtask.updated_at,
        assignee_name=assignee.name if assignee else None,
        assignee_email=assignee.email if assignee else None,
        assigned_by_name=assigner.name if assigner else None,
        progress=None,
        is_recurring=False,
        recurrence_type=None,
        recurrence_interval=1,
        repeat_days=None,
        recurrence_start_date=None,
        recurrence_end_date=None,
        monthly_day=None,
    )


# Helper function to calculate task progress
def calculate_task_progress(task: Task, session: Session) -> int:
    """
    Calculate task completion progress (0-100).
    Recurring tasks: ratio of completed instances to all materialized instances.
    If task has subtasks: (completed subtasks / total subtasks) * 100
    If no subtasks: 100 if approved, 0 otherwise
    """
    if getattr(task, "is_recurring", False):
        inst_stmt = select(TaskInstance).where(TaskInstance.task_id == task.id)
        instances = session.exec(inst_stmt).all()
        if not instances:
            return 0
        done = sum(1 for i in instances if i.status == TaskInstanceStatus.completed)
        return round(100 * done / len(instances))

    # Check if task has subtasks
    subtasks_stmt = select(Subtask).where(Subtask.parent_task_id == task.id)
    subtasks = session.exec(subtasks_stmt).all()
    
    if not subtasks:
        # No subtasks: 100% if approved, 0% otherwise
        return 100 if task.status == TaskStatus.approved else 0
    
    # Has subtasks: calculate based on completed subtasks
    completed_subtasks = sum(1 for s in subtasks if s.status == SubtaskStatus.completed)
    total_subtasks = len(subtasks)
    
    return round((completed_subtasks / total_subtasks) * 100) if total_subtasks > 0 else 0


def build_subtask_tree(subtasks: List[Subtask], session: Session, parent_id: Optional[int] = None) -> List[dict]:
    """
    Build hierarchical subtask tree with assignee information.
    """
    result = []
    for subtask in subtasks:
        if subtask.parent_subtask_id == parent_id:
            # Get assignee info
            assignee = None
            if subtask.assigned_to:
                assignee_stmt = select(User).where(User.id == subtask.assigned_to)
                assignee = session.exec(assignee_stmt).first()
            
            subtask_dict = {
                "id": subtask.id,
                "title": subtask.title,
                "description": subtask.description,
                "status": subtask.status,
                "assigned_to": subtask.assigned_to,
                "assignee_name": assignee.name if assignee else None,
                "assignee_email": assignee.email if assignee else None,
                "parent_task_id": subtask.parent_task_id,
                "parent_subtask_id": subtask.parent_subtask_id,
                "created_at": subtask.created_at,
                "updated_at": subtask.updated_at,
                "children": build_subtask_tree(subtasks, session, subtask.id)
            }
            result.append(subtask_dict)
    return result


# Employee routes
@router.get("/me", response_model=List[TaskWithAssignee])
async def get_my_tasks(
    request: Request,
    status_filter: Optional[TaskStatus] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get tasks assigned to current user."""
    statement = select(Task).where(
        Task.assigned_to == current_user.id,
        _task_visibility_clause(current_user),
    )
    
    if status_filter:
        statement = statement.where(Task.status == status_filter)
    
    statement = statement.order_by(Task.created_at.desc())
    tasks = session.exec(statement).all()
    
    result = []
    for task in tasks:
        assignee = None
        if task.assigned_to:
            assignee_stmt = select(User).where(User.id == task.assigned_to)
            assignee = session.exec(assignee_stmt).first()

        workspace = None
        if task.workspace_id:
            workspace_stmt = select(Workspace).where(Workspace.id == task.workspace_id)
            workspace = session.exec(workspace_stmt).first()
        
        assigner = None
        if task.assigned_by:
            assigner_stmt = select(User).where(User.id == task.assigned_by)
            assigner = session.exec(assigner_stmt).first()
        
        result.append(TaskWithAssignee(
            id=task.id,
            public_id=task.public_id,
            title=task.title,
            description=task.description,
            voice_note_url=task.voice_note_url,
            voice_note_transcript=task.voice_note_transcript,
            priority=task.priority,
            due_date=task.due_date,
            estimated_hours=task.estimated_hours,
            actual_hours=task.actual_hours,
            parent_task_id=task.parent_task_id,
            assigned_to=task.assigned_to,
            assigned_by=task.assigned_by,
            status=task.status,
            done_by_employee=task.done_by_employee,
            github_link=task.github_link,
            deployed_link=task.deployed_link,
            **_workspace_kwargs(workspace, task),
            start_date=task.start_date,
            completed_at=task.completed_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_name=assignee.name if assignee else None,
            assignee_email=assignee.email if assignee else None,
            assigned_by_name=assigner.name if assigner else None,
            progress=calculate_task_progress(task, session),
            **_recurrence_kwargs(task),
        ))
    
    return result


class TaskInstanceStatusBody(BaseModel):
    status: TaskInstanceStatus


@router.get("/recurring/my-summary")
async def get_my_recurring_instances_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Materialize instances for assigned recurring tasks, then return today's,
    upcoming, and recently completed occurrences (employee-centric).
    """
    stmt = select(Task).where(
        Task.is_recurring == True,  # noqa: E712
        Task.assigned_to == current_user.id,
        _task_visibility_clause(current_user),
    )
    recurring_tasks = session.exec(stmt).all()
    for t in recurring_tasks:
        ensure_instances_for_task(session, t, horizon_days=120, past_days=14)

    today = date.today()
    past = today - timedelta(days=30)
    future = today + timedelta(days=60)

    inst_stmt = (
        select(TaskInstance, Task)
        .join(Task, TaskInstance.task_id == Task.id)
        .where(
            Task.is_recurring == True,  # noqa: E712
            Task.assigned_to == current_user.id,
            TaskInstance.instance_date >= past,
            TaskInstance.instance_date <= future,
        )
        .order_by(TaskInstance.instance_date.asc())
    )
    rows = session.exec(inst_stmt).all()

    def row_to_item(inst: TaskInstance, task: Task) -> dict:
        return {
            "id": inst.id,
            "task_id": inst.task_id,
            "instance_date": inst.instance_date,
            "status": inst.status,
            "created_at": inst.created_at,
            "updated_at": inst.updated_at,
            "task_title": task.title,
            "public_id": task.public_id,
            "priority": task.priority,
        }

    today_list, upcoming, completed_recent = [], [], []
    for inst, task in rows:
        item = row_to_item(inst, task)
        if inst.instance_date == today:
            today_list.append(item)
        # Upcoming = future instances that are not done and not skipped.
        elif inst.instance_date > today and inst.status not in (TaskInstanceStatus.completed, TaskInstanceStatus.skipped):
            upcoming.append(item)
        elif inst.status == TaskInstanceStatus.completed and inst.instance_date >= today - timedelta(days=14):
            completed_recent.append(item)

    upcoming.sort(key=lambda x: x["instance_date"])
    completed_recent.sort(key=lambda x: x["instance_date"], reverse=True)

    return {
        "today": today_list,
        "upcoming": upcoming[:25],
        "completed_recent": completed_recent[:25],
    }


@router.get("/recurring/tasks/{task_id}/instances")
async def get_recurring_task_instances(
    task_id: int,
    upcoming_limit: int = 10,
    history_limit: int = 10,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch recurring task instances for a single task (employee-centric + admin allowed).

    - upcoming: next N instances with status todo/in_progress (not completed/skipped)
    - history: last N items that are completed, skipped, or missed (overdue pending)
    """
    # Verify task exists + permission
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    _ensure_task_access(current_user, task, "task")

    if not getattr(task, "is_recurring", False):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task is not recurring")

    if task.assigned_to != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this task")

    # Ensure instances exist around today
    ensure_instances_for_task(session, task, horizon_days=120, past_days=60)

    today = date.today()
    past_from = today - timedelta(days=60)
    future_to = today + timedelta(days=120)

    inst_stmt = (
        select(TaskInstance)
        .where(
            TaskInstance.task_id == task.id,
            TaskInstance.instance_date >= past_from,
            TaskInstance.instance_date <= future_to,
        )
        .order_by(TaskInstance.instance_date.asc())
    )
    instances = session.exec(inst_stmt).all()

    assignee_name = None
    if task.assigned_to:
        assignee = session.exec(select(User).where(User.id == task.assigned_to)).first()
        assignee_name = assignee.name if assignee else None

    def to_item(inst: TaskInstance) -> dict:
        return {
            "id": inst.id,
            "task_id": inst.task_id,
            "instance_date": inst.instance_date,
            "status": inst.status,
            "created_at": inst.created_at,
            "updated_at": inst.updated_at,
            "assigned_to": task.assigned_to,
            "assignee_name": assignee_name,
        }

    upcoming = []
    history = []

    for inst in instances:
        item = to_item(inst)
        # Upcoming: pending instances from today onwards
        if inst.instance_date >= today and inst.status in (TaskInstanceStatus.todo, TaskInstanceStatus.in_progress):
            upcoming.append(item)
            continue

        # History: completed/skipped always show; overdue pending show as missed.
        if inst.status in (TaskInstanceStatus.completed, TaskInstanceStatus.skipped):
            history.append(item)
        elif inst.instance_date < today and inst.status in (TaskInstanceStatus.todo, TaskInstanceStatus.in_progress):
            history.append(item)

    # Upcoming sorted ascending, history descending
    upcoming.sort(key=lambda x: x["instance_date"])
    history.sort(key=lambda x: x["instance_date"], reverse=True)

    next_occurrence_date = upcoming[0]["instance_date"] if len(upcoming) > 0 else None

    return {
        "upcoming": upcoming[: max(0, upcoming_limit)],
        "history": history[: max(0, history_limit)],
        "next_occurrence_date": next_occurrence_date,
    }


@router.patch("/recurring/instances/{instance_id}/status")
async def update_task_instance_status(
    instance_id: int,
    body: TaskInstanceStatusBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update status on a single recurring occurrence (assignee or admin)."""
    inst = session.exec(select(TaskInstance).where(TaskInstance.id == instance_id)).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Task instance not found")
    task = session.exec(select(Task).where(Task.id == inst.task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Parent task not found")
    _ensure_task_access(current_user, task, "task")
    if current_user.role != UserRole.admin and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this instance")

    inst.status = body.status
    inst.updated_at = datetime.now(timezone.utc)
    session.add(inst)
    session.commit()
    session.refresh(inst)
    return {
        "id": inst.id,
        "task_id": inst.task_id,
        "instance_date": inst.instance_date,
        "status": inst.status,
        "created_at": inst.created_at,
        "updated_at": inst.updated_at,
    }


@router.post("/recurring/materialize")
async def materialize_recurring_instances(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_cron_secret: Optional[str] = Header(default=None, alias="X-Cron-Secret"),
):
    """
    Generate missing TaskInstance rows for all recurring tasks.
    Callable by admin (JWT), or by cron with header X-Cron-Secret matching CRON_SECRET.
    """
    import os
    secret = os.getenv("CRON_SECRET", "")
    cron_ok = bool(secret and x_cron_secret == secret)
    admin_ok = current_user is not None and current_user.role == UserRole.admin
    if not cron_ok and not admin_ok:
        raise HTTPException(status_code=403, detail="Not authorized")
    n = materialize_all_recurring_tasks(session, horizon_days=180)
    return {"materialized_new_rows": n, "message": "Recurring instances ensured"}


@router.patch("/{task_id}/status", response_model=TaskRead)
async def update_task_status(
    task_id: int,
    new_status: TaskStatus,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update task status with role-based restrictions.
    
    Employee workflow: To Do → In Progress → Done (submits for review)
    Admin workflow: Can set any status including Approved/Rejected
    """
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    _ensure_task_access(current_user, task, "task")
    
    # Check permission: must be assigned to task or be admin
    if task.assigned_to != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this task"
        )
    
    # Role-based status restrictions
    if current_user.role == UserRole.employee:
        # Employees can only set to todo, in_progress, or submitted (when marking done)
        allowed_statuses = [TaskStatus.todo, TaskStatus.in_progress, TaskStatus.submitted]
        if new_status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees can only change status to 'To Do', 'In Progress', or 'Done'"
            )
        
        # When employee marks task as "Done" (submitted), notify all admins
        if new_status == TaskStatus.submitted:
            task.done_by_employee = True
            
            # Notify all admins
            admin_stmt = select(User).where(
                User.role == UserRole.admin,
                User.organization_id == current_user.organization_id,
            )
            admins = session.exec(admin_stmt).all()
            
            for admin in admins:
                create_notification(
                    session=session,
                    user_id=admin.id,
                    type=NotificationType.TASK_SUBMITTED,
                    message=f"Task #{task.id} - {task.title} has been submitted for review by {current_user.name}",
                    task_id=task.id
                )
    
    elif current_user.role == UserRole.admin:
        # Admin can only set: reviewing, approved, rejected
        allowed_statuses = [TaskStatus.reviewing, TaskStatus.approved, TaskStatus.rejected]
        if new_status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins can only change status to 'Reviewing', 'Approved', or 'Rejected'"
            )
        
        # Notify assigned employee when admin changes status
        if task.assigned_to and new_status != task.status:
            if new_status == TaskStatus.reviewing:
                create_notification(
                    session=session,
                    user_id=task.assigned_to,
                    type=NotificationType.TASK_COMMENT,
                    message=f"Admin is reviewing your task #{task.id} - {task.title}",
                    task_id=task.id
                )
            elif new_status == TaskStatus.approved:
                create_notification(
                    session=session,
                    user_id=task.assigned_to,
                    type=NotificationType.TASK_APPROVED,
                    message=f"Your task #{task.id} - {task.title} has been approved!",
                    task_id=task.id
                )
            elif new_status == TaskStatus.rejected:
                # Reset done_by_employee so employee can resubmit
                task.done_by_employee = False
                create_notification(
                    session=session,
                    user_id=task.assigned_to,
                    type=NotificationType.TASK_REJECTED,
                    message=f"Task #{task.id} - {task.title} needs changes. Please review and resubmit.",
                    task_id=task.id
                )
    
    task.status = new_status
    if new_status == TaskStatus.approved:
        task.completed_at = task.completed_at or datetime.now(timezone.utc)
    elif new_status in [TaskStatus.todo, TaskStatus.in_progress, TaskStatus.submitted, TaskStatus.reviewing, TaskStatus.rejected]:
        task.completed_at = None
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)
    
    return task


@router.patch("/{task_id}/links", response_model=TaskRead)
async def update_task_links(
    task_id: int,
    github_link: Optional[str] = None,
    deployed_link: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update task GitHub and deployed links (employee or admin)."""
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    _ensure_task_access(current_user, task, "task")
    
    # Check permission: must be assigned to task or be admin
    if task.assigned_to != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this task"
        )
    
    # Update links
    if github_link is not None:
        task.github_link = github_link if github_link.strip() else None
    if deployed_link is not None:
        task.deployed_link = deployed_link if deployed_link.strip() else None
    
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)
    
    return task


# Admin routes
@router.post("/voice-note")
async def upload_task_voice_note(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin_user),
):
    """Upload a task voice note and return a data URL + optional AI transcript."""
    del admin  # Authorization is enforced by dependency.

    content_type = _resolve_voice_content_type(file.content_type or "", file.filename)

    if content_type not in ALLOWED_VOICE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported voice note format. Use webm, mp3, wav, ogg, or m4a.",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice note file is empty.",
        )
    if len(raw) > MAX_VOICE_NOTE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice note is too large. Keep it under 8MB.",
        )

    encoded_audio = base64.b64encode(raw).decode("utf-8")
    voice_note_url = f"data:{content_type};base64,{encoded_audio}"

    transcript: Optional[str] = None
    client = None
    try:
        client = _get_openai_client()
    except Exception as exc:
        # Upload should still succeed even if AI client is unavailable.
        print(f"Voice transcription disabled: {exc}")
    if client:
        try:
            transcript = _transcribe_voice_with_openai(client, raw, file.filename)
        except Exception as exc:
            print(f"Voice transcription skipped: {exc}")

    return {
        "voice_note_url": voice_note_url,
        "voice_note_transcript": transcript,
    }


@router.post("/voice-note/summarize")
async def summarize_task_voice_note(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Transcribe a task voice note and generate an AI summary for task description drafting."""
    del current_user

    try:
        client = _get_openai_client()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OpenAI client unavailable: {str(exc)}",
        )
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured on the backend.",
        )

    content_type = _resolve_voice_content_type(file.content_type or "", file.filename)
    if content_type not in ALLOWED_VOICE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported voice note format. Use webm, mp3, wav, ogg, or m4a.",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice note file is empty.",
        )
    if len(raw) > MAX_VOICE_NOTE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice note is too large. Keep it under 8MB.",
        )

    try:
        transcript = _transcribe_voice_with_openai(client, raw, file.filename)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Transcription failed: {str(exc)}",
        )

    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not transcribe this voice note clearly. Please retry with clearer audio.",
        )

    try:
        summary = _summarize_transcript_with_openai(client, transcript)
    except Exception as exc:
        # Graceful fallback: still return a useful draft from transcript.
        summary = (
            "Objective:\n"
            "Create a task based on the attached voice note.\n\n"
            "Scope:\n"
            f"{transcript}\n\n"
            "Deliverables:\n"
            "- Implement the requested changes\n"
            "- Validate behavior after update\n\n"
            "Constraints:\n"
            "- Keep changes minimal and safe\n\n"
            "Acceptance Criteria:\n"
            "- Requested outcome is visible in UI and behavior is verified\n\n"
            "Notes:\n"
            f"AI summarization fallback used due to model error: {str(exc)}"
        )

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI could not generate a summary right now. Please try again.",
        )

    encoded_audio = base64.b64encode(raw).decode("utf-8")
    voice_note_url = f"data:{content_type};base64,{encoded_audio}"

    return {
        "voice_note_url": voice_note_url,
        "voice_note_transcript": transcript,
        "summary": summary,
    }


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_task(
    task_data: TaskCreate,
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Create a new task with deliverable tracking (admin only)."""
    if not task_data.workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace is required",
        )

    workspace = session.exec(select(Workspace).where(Workspace.id == task_data.workspace_id)).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace not found",
        )
    ensure_same_organization(admin, workspace.organization_id, "workspace")

    parent_task = None
    if task_data.parent_task_id:
        parent_task = session.exec(select(Task).where(Task.id == task_data.parent_task_id)).first()
        if not parent_task:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent task not found",
            )
        ensure_same_organization(admin, parent_task.organization_id, "parent task")
        if parent_task.workspace_id != task_data.workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Child task must belong to the same workspace as the parent task",
            )

    # Verify assignee exists if provided
    assignee = None
    if task_data.assigned_to:
        assignee_stmt = select(User).where(User.id == task_data.assigned_to)
        assignee = session.exec(assignee_stmt).first()
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user not found"
            )
    
    # Validate GitHub and deployed links if provided
    if task_data.github_link and not (task_data.github_link.startswith("http://") or task_data.github_link.startswith("https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub link must be a valid URL starting with http:// or https://"
        )
    
    if task_data.deployed_link and not (task_data.deployed_link.startswith("http://") or task_data.deployed_link.startswith("https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deployed link must be a valid URL starting with http:// or https://"
        )

    is_rec = bool(getattr(task_data, "is_recurring", False))
    repeat_days_str = None
    recurrence_type = None
    recurrence_interval = 1
    recurrence_start = None
    recurrence_end = None
    monthly_day_val = None

    if is_rec:
        recurrence_type = task_data.recurrence_type
        if recurrence_type not in ("daily", "weekly", "monthly"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="recurrence_type must be daily, weekly, or monthly",
            )
        recurrence_interval = max(1, task_data.recurrence_interval or 1)
        recurrence_start = task_data.recurrence_start_date or task_data.due_date or date.today()
        recurrence_end = task_data.recurrence_end_date
        if task_data.repeat_days:
            repeat_days_str = json.dumps(task_data.repeat_days)
        elif recurrence_type == "weekly":
            repeat_days_str = json.dumps([recurrence_start.weekday()])
        if recurrence_type == "monthly":
            monthly_day_val = task_data.monthly_day or recurrence_start.day

    task = Task(
        title=task_data.title,
        organization_id=admin.organization_id,
        description=task_data.description,
        voice_note_url=task_data.voice_note_url,
        voice_note_transcript=task_data.voice_note_transcript,
        priority=task_data.priority,
        due_date=task_data.due_date,
        estimated_hours=task_data.estimated_hours,
        actual_hours=task_data.actual_hours,
        workspace_id=task_data.workspace_id,
        parent_task_id=task_data.parent_task_id,
        assigned_to=task_data.assigned_to,
        assigned_by=task_data.assigned_by or admin.id,
        github_link=task_data.github_link,
        deployed_link=task_data.deployed_link,
        public_id=generate_public_id(session, Task),
        start_date=task_data.start_date or datetime.now(timezone.utc),
        completed_at=task_data.completed_at,
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

    # Send notification to assigned employee
    if assignee:
        create_notification(
            session=session,
            user_id=assignee.id,
            type=NotificationType.TASK_ASSIGNED,
            message=f"New task assigned: Task #{task.id} - {task.title}",
            task_id=task.id
        )
    
    return task


@router.get("", response_model=List[TaskWithAssignee])
@router.get("/", response_model=List[TaskWithAssignee], include_in_schema=False)
async def get_all_tasks(
    request: Request,
    status_filter: Optional[TaskStatus] = None,
    assigned_to: Optional[int] = None,
    workspace_id: Optional[int] = None,
    parent_task_id: Optional[int] = None,
    roots_only: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all organization tasks visible to every authenticated user."""
    statement = select(Task).where(_task_visibility_clause(current_user))
    
    if status_filter:
        statement = statement.where(Task.status == status_filter)
    if assigned_to:
        statement = statement.where(Task.assigned_to == assigned_to)
    if workspace_id:
        statement = statement.where(Task.workspace_id == workspace_id)
    if parent_task_id is not None:
        statement = statement.where(Task.parent_task_id == parent_task_id)
    elif roots_only:
        statement = statement.where(Task.parent_task_id.is_(None))
    
    statement = statement.order_by(Task.created_at.desc())
    tasks = session.exec(statement).all()
    
    result = []
    for task in tasks:
        assignee = None
        if task.assigned_to:
            assignee_stmt = select(User).where(User.id == task.assigned_to)
            assignee = session.exec(assignee_stmt).first()

        workspace = None
        if task.workspace_id:
            workspace_stmt = select(Workspace).where(Workspace.id == task.workspace_id)
            workspace = session.exec(workspace_stmt).first()
        
        assigner = None
        if task.assigned_by:
            assigner_stmt = select(User).where(User.id == task.assigned_by)
            assigner = session.exec(assigner_stmt).first()
        
        result.append(TaskWithAssignee(
            id=task.id,
            public_id=task.public_id,
            title=task.title,
            description=task.description,
            voice_note_url=task.voice_note_url,
            voice_note_transcript=task.voice_note_transcript,
            priority=task.priority,
            due_date=task.due_date,
            estimated_hours=task.estimated_hours,
            actual_hours=task.actual_hours,
            parent_task_id=task.parent_task_id,
            assigned_to=task.assigned_to,
            assigned_by=task.assigned_by,
            status=task.status,
            done_by_employee=task.done_by_employee,
            github_link=task.github_link,
            deployed_link=task.deployed_link,
            **_workspace_kwargs(workspace, task),
            start_date=task.start_date,
            completed_at=task.completed_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_name=assignee.name if assignee else None,
            assignee_email=assignee.email if assignee else None,
            assigned_by_name=assigner.name if assigner else None,
            progress=calculate_task_progress(task, session),
            **_recurrence_kwargs(task),
        ))
    
    return result


@router.get("/{task_id}/children", response_model=List[TaskWithAssignee])
async def get_task_children(
    task_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get direct children (subtasks/sub-subtasks) for a parent task."""
    parent_task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not parent_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    _ensure_task_access(current_user, parent_task, "task")

    children = session.exec(
        select(Task)
        .where(
            _task_visibility_clause(current_user),
            Task.parent_task_id == task_id,
        )
        .order_by(Task.created_at.asc())
    ).all()

    workspace = None
    if parent_task.workspace_id:
        workspace = session.exec(select(Workspace).where(Workspace.id == parent_task.workspace_id)).first()

    legacy_subtasks = session.exec(
        select(Subtask)
        .where(
            Subtask.parent_task_id == task_id,
            Subtask.organization_id == current_user.organization_id,
        )
        .order_by(Subtask.created_at.asc())
    ).all()

    task_children_payload = [_task_to_with_assignee(session, child) for child in children]
    legacy_children_payload = [
        _legacy_subtask_to_task_with_assignee(session, subtask, task_id, workspace)
        for subtask in legacy_subtasks
    ]

    return task_children_payload + legacy_children_payload


@router.get("/{task_id}", response_model=TaskWithAssignee)
async def get_task(
    task_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get a specific task."""
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    _ensure_task_access(current_user, task, "task")
    
    # Check permission
    if task.assigned_to != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this task"
        )
    
    assignee = None
    if task.assigned_to:
        assignee_stmt = select(User).where(User.id == task.assigned_to)
        assignee = session.exec(assignee_stmt).first()

    workspace = None
    if task.workspace_id:
        workspace_stmt = select(Workspace).where(Workspace.id == task.workspace_id)
        workspace = session.exec(workspace_stmt).first()
    
    return TaskWithAssignee(
        id=task.id,
        public_id=task.public_id,
        title=task.title,
        description=task.description,
        voice_note_url=task.voice_note_url,
        voice_note_transcript=task.voice_note_transcript,
        priority=task.priority,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        parent_task_id=task.parent_task_id,
        assigned_to=task.assigned_to,
        assigned_by=task.assigned_by,
        status=task.status,
        done_by_employee=task.done_by_employee,
        github_link=task.github_link,
        deployed_link=task.deployed_link,
        **_workspace_kwargs(workspace, task),
        start_date=task.start_date,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee.name if assignee else None,
        assignee_email=assignee.email if assignee else None,
        assigned_by_name=None,  # Can be added if needed
        progress=calculate_task_progress(task, session),
        **_recurrence_kwargs(task),
    )


@router.get("/{task_id}/details")
async def get_task_details(
    task_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete project details including task info, subtasks tree, and comments.
    Used for the project detail page.
    """
    # Get the task
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    _ensure_task_access(current_user, task, "project")
    
    # Get assignee info
    assignee = None
    if task.assigned_to:
        assignee_stmt = select(User).where(User.id == task.assigned_to)
        assignee = session.exec(assignee_stmt).first()
    
    # Get assigned by info
    assigned_by_user = None
    if task.assigned_by:
        assigned_by_stmt = select(User).where(User.id == task.assigned_by)
        assigned_by_user = session.exec(assigned_by_stmt).first()

    workspace = None
    if task.workspace_id:
        workspace_stmt = select(Workspace).where(Workspace.id == task.workspace_id)
        workspace = session.exec(workspace_stmt).first()
    
    # Build task data
    task_data = {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "voice_note_url": task.voice_note_url,
        "voice_note_transcript": task.voice_note_transcript,
        "priority": task.priority,
        "due_date": task.due_date,
        "workspace_id": task.workspace_id,
        "workspace_name": workspace.name if workspace else None,
        "workspace_icon": workspace.icon if workspace else None,
        "workspace_color": workspace.color if workspace else None,
        "start_date": task.start_date,
        "completed_at": task.completed_at,
        "estimated_hours": task.estimated_hours,
        "actual_hours": task.actual_hours,
        "parent_task_id": task.parent_task_id,
        "assigned_to": task.assigned_to,
        "assigned_by": task.assigned_by,
        "status": task.status,
        "github_link": task.github_link,
        "deployed_link": task.deployed_link,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "assignee_name": assignee.name if assignee else None,
        "assignee_email": assignee.email if assignee else None,
        "assignee_profile_picture": assignee.profile_picture if assignee else None,
        "assigned_by_name": assigned_by_user.name if assigned_by_user else None,
        "progress": calculate_task_progress(task, session),
        **_recurrence_kwargs(task),
    }
    
    # Get all subtasks for this task
    subtasks_stmt = select(Subtask).where(Subtask.parent_task_id == task_id)
    subtasks = session.exec(subtasks_stmt).all()
    
    # Build hierarchical subtask tree
    subtasks_tree = build_subtask_tree(list(subtasks), session)
    
    # Get all comments for this task with user info
    comments_stmt = select(TaskComment, User).join(
        User, TaskComment.user_id == User.id
    ).where(
        TaskComment.task_id == task_id
    ).order_by(TaskComment.created_at.asc())
    
    comments_result = session.exec(comments_stmt).all()
    
    comments = []
    for comment, user in comments_result:
        comments.append({
            "id": comment.id,
            "task_id": comment.task_id,
            "user_id": comment.user_id,
            "comment": comment.comment,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
            "user_name": user.name,
            "user_email": user.email,
            "user_role": user.role,
            "user_profile_picture": user.profile_picture
        })
    
    return {
        "task": task_data,
        "subtasks": subtasks_tree,
        "comments": comments
    }


@router.put("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Update a task (admin only)."""
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    _ensure_task_access(admin, task, "task")
    
    # Track original assignee for notification logic
    original_assignee_id = task.assigned_to
    
    # Update fields
    update_data = task_data.model_dump(exclude_unset=True)
    if "parent_task_id" in update_data and update_data["parent_task_id"] is not None:
        parent_task = session.exec(select(Task).where(Task.id == update_data["parent_task_id"])).first()
        if not parent_task:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent task not found"
            )
        ensure_same_organization(admin, parent_task.organization_id, "parent task")
        if parent_task.id == task.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task cannot be its own parent"
            )
    if "workspace_id" in update_data and update_data["workspace_id"] is not None:
        workspace = session.exec(select(Workspace).where(Workspace.id == update_data["workspace_id"])).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace not found"
            )
        ensure_same_organization(admin, workspace.organization_id, "workspace")
    if "repeat_days" in update_data and update_data["repeat_days"] is not None:
        rd = update_data["repeat_days"]
        update_data["repeat_days"] = json.dumps(rd) if isinstance(rd, list) else rd
    for key, value in update_data.items():
        setattr(task, key, value)

    if "status" in update_data:
        if task.status == TaskStatus.approved:
            task.completed_at = task.completed_at or datetime.now(timezone.utc)
        elif "completed_at" not in update_data:
            task.completed_at = None
    
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)

    if getattr(task, "is_recurring", False):
        ensure_instances_for_task(session, task, horizon_days=120, past_days=7)

    # If assignee changed, send notification to the new assignee
    if task.assigned_to and task.assigned_to != original_assignee_id:
        create_notification(
            session=session,
            user_id=task.assigned_to,
            type=NotificationType.TASK_ASSIGNED,
            message=f"New task assigned: Task #{task.id} - {task.title} (Reassigned by {admin.name})",
            task_id=task.id
        )
    
    return task


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Delete a task (admin only)."""
    statement = select(Task).where(Task.id == task_id)
    task = session.exec(statement).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    _ensure_task_access(admin, task, "task")
    
    # Delete related records first to avoid foreign key constraint violations

    # 0. Recurring task instances
    inst_stmt = select(TaskInstance).where(TaskInstance.task_id == task_id)
    for inst in session.exec(inst_stmt).all():
        session.delete(inst)

    # 1. Delete all subtasks (including nested ones)
    subtasks_stmt = select(Subtask).where(Subtask.parent_task_id == task_id)
    subtasks = session.exec(subtasks_stmt).all()
    for subtask in subtasks:
        session.delete(subtask)
    
    # 2. Delete all task comments
    comments_stmt = select(TaskComment).where(TaskComment.task_id == task_id)
    comments = session.exec(comments_stmt).all()
    for comment in comments:
        session.delete(comment)
    
    # 3. Delete all notifications related to this task
    notifications_stmt = select(Notification).where(Notification.task_id == task_id)
    notifications = session.exec(notifications_stmt).all()
    for notification in notifications:
        session.delete(notification)
    
    # 4. Finally delete the task itself
    session.delete(task)
    session.commit()
    
    return {"message": "Task deleted successfully"}


@router.get("/stats/summary")
async def get_task_stats(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get task statistics with completion metrics (admin only)."""
    from datetime import date
    
    all_tasks = session.exec(select(Task).where(Task.organization_id == admin.organization_id)).all()
    total = len(all_tasks)
    
    # Status counts
    todo = len(session.exec(select(Task).where(Task.organization_id == admin.organization_id, Task.status == TaskStatus.todo)).all())
    in_progress = len(session.exec(select(Task).where(Task.organization_id == admin.organization_id, Task.status == TaskStatus.in_progress)).all())
    submitted = len(session.exec(select(Task).where(Task.organization_id == admin.organization_id, Task.status == TaskStatus.submitted)).all())
    reviewing = len(session.exec(select(Task).where(Task.organization_id == admin.organization_id, Task.status == TaskStatus.reviewing)).all())
    approved = len(session.exec(select(Task).where(Task.organization_id == admin.organization_id, Task.status == TaskStatus.approved)).all())
    rejected = len(session.exec(select(Task).where(Task.organization_id == admin.organization_id, Task.status == TaskStatus.rejected)).all())
    
    # Completion metrics
    completed = approved  # Completed = approved tasks
    
    # Overdue tasks (due_date < today AND not approved)
    today = date.today()
    overdue = 0
    for task in all_tasks:
        if task.status != TaskStatus.approved and task.due_date:
            # Convert due_date to date if it's a datetime
            task_due_date = task.due_date.date() if hasattr(task.due_date, 'date') else task.due_date
            if task_due_date < today:
                overdue += 1
    
    # Completion percentage
    completion_percent = round((completed / total * 100), 2) if total > 0 else 0

    tasks_assigned = sum(1 for task in all_tasks if task.assigned_to is not None)
    tasks_completed = completed
    delayed_tasks = sum(
        1
        for task in all_tasks
        if task.completed_at and task.due_date and task.completed_at.date() > task.due_date
    )
    completed_with_due = [
        task
        for task in all_tasks
        if task.completed_at and task.due_date
    ]
    on_time_count = sum(1 for task in completed_with_due if task.completed_at.date() <= task.due_date)
    on_time_completion = round((on_time_count / len(completed_with_due) * 100), 2) if completed_with_due else 0

    completion_hours = [
        (task.completed_at - task.start_date).total_seconds() / 3600
        for task in all_tasks
        if task.completed_at and task.start_date
    ]
    average_completion_time = round(sum(completion_hours) / len(completion_hours), 2) if completion_hours else 0
    
    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "overdue": overdue,
        "completion_percent": completion_percent,
        "tasks_assigned": tasks_assigned,
        "tasks_completed": tasks_completed,
        "on_time_completion": on_time_completion,
        "delayed_tasks": delayed_tasks,
        "average_completion_time": average_completion_time,
        # Legacy fields for backward compatibility
        "todo": todo,
        "submitted": submitted,
        "reviewing": reviewing,
        "approved": approved,
        "rejected": rejected
    }

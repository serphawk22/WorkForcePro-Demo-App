"""Workspace management and workspace-scoped project listing routes."""
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_admin_user, get_current_user, ensure_same_organization
from app.database import get_session
from app.models import (
    Subtask,
    Task,
    TaskStatus,
    TaskWithAssignee,
    User,
    UserRole,
    Workspace,
    WorkspaceCreate,
    WorkspaceRead,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


def _to_workspace_read(workspace: Workspace, project_count: int = 0) -> WorkspaceRead:
    return WorkspaceRead(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        icon=workspace.icon,
        color=workspace.color,
        organization_id=workspace.organization_id,
        created_by=workspace.created_by,
        created_at=workspace.created_at,
        project_count=project_count,
    )


def _task_to_with_assignee(session: Session, task: Task, workspace: Optional[Workspace]) -> TaskWithAssignee:
    assignee = None
    if task.assigned_to:
        assignee = session.exec(select(User).where(User.id == task.assigned_to)).first()

    assigner = None
    if task.assigned_by:
        assigner = session.exec(select(User).where(User.id == task.assigned_by)).first()

    subtask_count = len(session.exec(select(Subtask).where(Subtask.parent_task_id == task.id)).all())

    return TaskWithAssignee(
        id=task.id,
        public_id=task.public_id,
        parent_task_id=task.parent_task_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        workspace_id=task.workspace_id,
        workspace_name=workspace.name if workspace else None,
        workspace_icon=workspace.icon if workspace else None,
        workspace_color=workspace.color if workspace else None,
        assigned_to=task.assigned_to,
        assigned_by=task.assigned_by,
        status=task.status,
        done_by_employee=task.done_by_employee,
        github_link=task.github_link,
        deployed_link=task.deployed_link,
        start_date=task.start_date,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee.name if assignee else None,
        assignee_email=assignee.email if assignee else None,
        assigned_by_name=assigner.name if assigner else None,
        subtask_count=subtask_count,
        is_recurring=bool(getattr(task, "is_recurring", False)),
        recurrence_type=getattr(task, "recurrence_type", None),
        recurrence_interval=getattr(task, "recurrence_interval", None) or 1,
        repeat_days=getattr(task, "repeat_days", None),
        recurrence_start_date=getattr(task, "recurrence_start_date", None),
        recurrence_end_date=getattr(task, "recurrence_end_date", None),
        monthly_day=getattr(task, "monthly_day", None),
    )


@router.get("/", response_model=List[WorkspaceRead])
async def get_workspaces(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List workspaces visible to current user."""
    workspaces = session.exec(
        select(Workspace)
        .where(Workspace.organization_id == current_user.organization_id)
        .order_by(Workspace.name.asc())
    ).all()

    response: List[WorkspaceRead] = []
    for ws in workspaces:
        count_stmt = select(Task).where(
            Task.workspace_id == ws.id,
            Task.organization_id == current_user.organization_id,
        )
        project_count = len(session.exec(count_stmt).all())
        response.append(_to_workspace_read(ws, project_count=project_count))

    return response


@router.post("/", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Create a workspace (admin only)."""
    existing = session.exec(
        select(Workspace).where(
            Workspace.name == workspace_data.name.strip(),
            Workspace.organization_id == admin.organization_id,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Workspace name already exists")

    workspace = Workspace(
        name=workspace_data.name.strip(),
        description=workspace_data.description,
        icon=workspace_data.icon,
        color=workspace_data.color,
        organization_id=admin.organization_id,
        created_by=admin.id,
        created_at=datetime.now(timezone.utc),
    )
    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    return _to_workspace_read(workspace, project_count=0)


@router.put("/{workspace_id}", response_model=WorkspaceRead)
async def update_workspace(
    workspace_id: int,
    workspace_data: WorkspaceUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Update a workspace (admin only)."""
    workspace = session.exec(select(Workspace).where(Workspace.id == workspace_id)).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    ensure_same_organization(admin, workspace.organization_id, "workspace")

    update_data = workspace_data.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"]:
        new_name = update_data["name"].strip()
        existing = session.exec(
            select(Workspace).where(
                Workspace.name == new_name,
                Workspace.id != workspace_id,
                Workspace.organization_id == admin.organization_id,
            )
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Workspace name already exists")
        update_data["name"] = new_name

    for key, value in update_data.items():
        setattr(workspace, key, value)

    session.add(workspace)
    session.commit()
    session.refresh(workspace)

    project_count = len(
        session.exec(
            select(Task).where(
                Task.workspace_id == workspace.id,
                Task.organization_id == admin.organization_id,
            )
        ).all()
    )
    return _to_workspace_read(workspace, project_count=project_count)


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Delete workspace (admin only). Workspace must be empty."""
    workspace = session.exec(select(Workspace).where(Workspace.id == workspace_id)).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    ensure_same_organization(admin, workspace.organization_id, "workspace")

    project_count = len(
        session.exec(
            select(Task).where(
                Task.workspace_id == workspace_id,
                Task.organization_id == admin.organization_id,
            )
        ).all()
    )
    if project_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Move or delete projects in this workspace before deleting it",
        )

    session.delete(workspace)
    session.commit()
    return {"message": "Workspace deleted successfully"}


@router.get("/{workspace_id}/projects")
async def get_workspace_projects(
    workspace_id: int,
    status_filter: Optional[TaskStatus] = None,
    owner_id: Optional[int] = None,
    recent_days: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get workspace details and its projects with optional filters."""
    workspace = session.exec(select(Workspace).where(Workspace.id == workspace_id)).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    ensure_same_organization(current_user, workspace.organization_id, "workspace")

    statement = select(Task).where(
        Task.workspace_id == workspace_id,
        Task.organization_id == current_user.organization_id,
    )

    if status_filter:
        statement = statement.where(Task.status == status_filter)

    if owner_id:
        statement = statement.where(Task.assigned_to == owner_id)

    if recent_days and recent_days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=recent_days)
        statement = statement.where(Task.updated_at >= cutoff)

    tasks = session.exec(statement.order_by(Task.updated_at.desc())).all()

    return {
        "workspace": _to_workspace_read(workspace, project_count=len(tasks)),
        "projects": [_task_to_with_assignee(session, task, workspace) for task in tasks],
    }

"""
Subtask management routes for task delegation.
"""
import random
import string
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
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
    User, Task, Subtask, SubtaskCreate, SubtaskUpdate, SubtaskRead, SubtaskWithAssignee,
    SubtaskStatus, UserRole, NotificationType, TaskStatus
)
from app.auth import get_current_user, get_current_admin_user, ensure_same_organization, is_admin_user
from app.routers.notifications import create_notification

router = APIRouter(prefix="/tasks", tags=["Subtasks"])


@router.post("/{task_id}/subtasks", response_model=SubtaskRead, status_code=status.HTTP_201_CREATED)
async def create_subtask(
    task_id: int,
    subtask_data: SubtaskCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a subtask under a parent task.
    
    Rules:
    - Admin can create subtask on any task
    - Employee can create subtask on any task (for better collaboration)
    - Cannot create subtask on approved tasks
    """
    # Verify parent task exists
    task_stmt = select(Task).where(Task.id == task_id)
    task = session.exec(task_stmt).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent task not found"
        )
    ensure_same_organization(current_user, task.organization_id, "task")
    
    # Permission: anyone can create subtasks as long as they are authenticated
    # (Removed restriction: must be assigned to task or be admin)
    
    # Prevent creating subtask on approved tasks
    if task.status == TaskStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create subtasks on approved tasks"
        )

    if not subtask_data.due_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Due date is required"
        )

    requested_assignee_id = subtask_data.assigned_to
    requested_reporter_id = subtask_data.assigned_by

    reporter_stmt = select(User).where(User.id == requested_reporter_id)
    reporter = session.exec(reporter_stmt).first()
    if not reporter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reporter not found"
        )
    ensure_same_organization(current_user, reporter.organization_id, "reporter")
    if not is_admin_user(current_user) and requested_reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can choose a different reporter"
        )

    assignment_alert_message = None
    if task.assigned_to and requested_assignee_id != task.assigned_to:
        requested_assignee_id = task.assigned_to
        assignment_alert_message = (
            f"Assignment corrected automatically for subtask '{subtask_data.title}'. "
            f"Because it belongs to task #{task.id}, it was assigned to that task's assignee."
        )
    
    # Assignee is mandatory for subtask creation.
    assignee_stmt = select(User).where(User.id == requested_assignee_id)
    assignee = session.exec(assignee_stmt).first()
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user not found"
        )
    ensure_same_organization(current_user, assignee.organization_id, "assignee")

    # If creating nested subtask, verify parent_subtask belongs to same task.
    if subtask_data.parent_subtask_id is not None:
        parent_subtask = session.exec(
            select(Subtask).where(Subtask.id == subtask_data.parent_subtask_id)
        ).first()
        if not parent_subtask:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent subtask not found"
            )
        ensure_same_organization(current_user, parent_subtask.organization_id, "parent subtask")
        if parent_subtask.parent_task_id != task_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent subtask must belong to the same task"
            )
    
    # Create subtask
    subtask = Subtask(
        organization_id=task.organization_id,
        parent_task_id=task_id,
        parent_subtask_id=subtask_data.parent_subtask_id,  # Support nested subtasks
        title=subtask_data.title,
        description=subtask_data.description,
        assigned_to=requested_assignee_id,
        assigned_by=requested_reporter_id,
        priority=subtask_data.priority,
        due_date=subtask_data.due_date,
        public_id=generate_public_id(session, Subtask)
    )
    
    session.add(subtask)
    session.commit()
    session.refresh(subtask)
    
    # Send notification to assigned employee
    if assignee:
        create_notification(
            session=session,
            user_id=assignee.id,
            type=NotificationType.SUBTASK_ASSIGNED,
            message=f"{current_user.name} assigned you a subtask: '{subtask.title}' under task #{task.id}",
            task_id=task.id
        )

    if assignment_alert_message:
        create_notification(
            session=session,
            user_id=current_user.id,
            type=NotificationType.TASK_COMMENT,
            message=assignment_alert_message,
            task_id=task.id,
        )
    
    return subtask


@router.get("/{task_id}/subtasks", response_model=List[SubtaskWithAssignee])
async def get_task_subtasks(
    task_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all subtasks for a specific task.
    
    Visible to:
    - Admin
    - Parent task assignee
    - Subtask assignee
    """
    # Verify task exists
    task_stmt = select(Task).where(Task.id == task_id)
    task = session.exec(task_stmt).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    ensure_same_organization(current_user, task.organization_id, "task")
    
    # Get subtasks
    subtasks_stmt = select(Subtask).where(
        Subtask.parent_task_id == task_id,
        Subtask.organization_id == current_user.organization_id,
    ).order_by(Subtask.created_at.asc())
    subtasks = session.exec(subtasks_stmt).all()
    
    result = []
    for subtask in subtasks:
        # All authenticated users can see all subtasks — universal visibility across dashboards.

        assignee = None
        if subtask.assigned_to:
            assignee_stmt = select(User).where(User.id == subtask.assigned_to)
            assignee = session.exec(assignee_stmt).first()
        
        assigner = None
        if subtask.assigned_by:
            assigner_stmt = select(User).where(User.id == subtask.assigned_by)
            assigner = session.exec(assigner_stmt).first()
        
        result.append(SubtaskWithAssignee(
            id=subtask.id,
            organization_id=subtask.organization_id,
            public_id=subtask.public_id,
            parent_task_id=subtask.parent_task_id,
            parent_subtask_id=subtask.parent_subtask_id,
            title=subtask.title,
            description=subtask.description,
            priority=subtask.priority,
            due_date=subtask.due_date,
            assigned_to=subtask.assigned_to,
            assigned_by=subtask.assigned_by,
            status=subtask.status,
            created_at=subtask.created_at,
            updated_at=subtask.updated_at,
            assignee_name=assignee.name if assignee else None,
            assignee_email=assignee.email if assignee else None,
            assigned_by_name=assigner.name if assigner else None,
            children=[]
        ))
    
    return result


@router.get("/{task_id}/subtasks/hierarchy", response_model=List[SubtaskWithAssignee])
async def get_task_subtasks_hierarchy(
    task_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get subtasks for a task in hierarchical structure.
    
    Returns subtasks organized in a tree structure with nested children.
    """
    # Verify task exists
    task_stmt = select(Task).where(Task.id == task_id)
    task = session.exec(task_stmt).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    ensure_same_organization(current_user, task.organization_id, "task")
    
    # Get all subtasks for the task
    subtasks_stmt = select(Subtask).where(
        Subtask.parent_task_id == task_id,
        Subtask.organization_id == current_user.organization_id,
    ).order_by(Subtask.created_at.asc())
    subtasks = session.exec(subtasks_stmt).all()
    
    # Build subtask dictionary with user info
    subtask_dict = {}
    for subtask in subtasks:
        # Check permission
        if not is_admin_user(current_user):
            if task.assigned_to != current_user.id and subtask.assigned_to != current_user.id:
                continue
        
        assignee = None
        if subtask.assigned_to:
            assignee_stmt = select(User).where(User.id == subtask.assigned_to)
            assignee = session.exec(assignee_stmt).first()
        
        assigner = None
        if subtask.assigned_by:
            assigner_stmt = select(User).where(User.id == subtask.assigned_by)
            assigner = session.exec(assigner_stmt).first()
        
        subtask_dict[subtask.id] = SubtaskWithAssignee(
            id=subtask.id,
            organization_id=subtask.organization_id,
            public_id=subtask.public_id,
            parent_task_id=subtask.parent_task_id,
            parent_subtask_id=subtask.parent_subtask_id,
            title=subtask.title,
            description=subtask.description,
            priority=subtask.priority,
            due_date=subtask.due_date,
            assigned_to=subtask.assigned_to,
            assigned_by=subtask.assigned_by,
            status=subtask.status,
            created_at=subtask.created_at,
            updated_at=subtask.updated_at,
            assignee_name=assignee.name if assignee else None,
            assignee_email=assignee.email if assignee else None,
            assigned_by_name=assigner.name if assigner else None,
            children=[]
        )
    
    # Build hierarchical structure
    root_subtasks = []
    for subtask_id, subtask_data in subtask_dict.items():
        if subtask_data.parent_subtask_id:
            # This is a nested subtask - add to parent's children
            parent_id = subtask_data.parent_subtask_id
            if parent_id in subtask_dict:
                subtask_dict[parent_id].children.append(subtask_data)
        else:
            # This is a root-level subtask
            root_subtasks.append(subtask_data)
    
    return root_subtasks


@router.patch("/subtasks/{subtask_id}/status", response_model=SubtaskRead)
async def update_subtask_status(
    subtask_id: int,
    new_status: SubtaskStatus,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update subtask status.
    
    Rules:
    - Assignee can update status
    - Admin can update status
    """
    subtask_stmt = select(Subtask).where(Subtask.id == subtask_id)
    subtask = session.exec(subtask_stmt).first()
    
    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )
    ensure_same_organization(current_user, subtask.organization_id, "subtask")
    
    # Role-based status validation
    employee_statuses = {SubtaskStatus.todo, SubtaskStatus.in_progress, SubtaskStatus.completed}

    if is_admin_user(current_user):
        # Admins can move subtasks to any status.
        pass
    else:
        # Employee must be the assignee
        if subtask.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update subtasks assigned to you"
            )
        # Employee can only set todo, in_progress, completed
        if new_status not in employee_statuses:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employee can only set status to: todo, in_progress, completed"
            )
    
    subtask.status = new_status
    subtask.updated_at = datetime.now(timezone.utc)
    session.add(subtask)
    session.commit()
    session.refresh(subtask)

    # Notify the assignee when admin reviews their subtask
    if is_admin_user(current_user) and subtask.assigned_to:
        notification_map = {
            SubtaskStatus.reviewing: (NotificationType.SUBTASK_REVIEWING, f"Your subtask '{subtask.title}' is under review"),
            SubtaskStatus.approved: (NotificationType.SUBTASK_APPROVED, f"Your subtask '{subtask.title}' has been approved! "),
            SubtaskStatus.rejected: (NotificationType.SUBTASK_REJECTED, f"Your subtask '{subtask.title}' needs changes. Please review."),
        }
        if new_status in notification_map:
            notif_type, notif_msg = notification_map[new_status]
            create_notification(session, subtask.assigned_to, notif_type, notif_msg, subtask.parent_task_id)

    return subtask


@router.put("/subtasks/{subtask_id}", response_model=SubtaskRead)
async def update_subtask(
    subtask_id: int,
    subtask_data: SubtaskUpdate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update a subtask (admin or assignee can update)."""
    subtask_stmt = select(Subtask).where(Subtask.id == subtask_id)
    subtask = session.exec(subtask_stmt).first()
    
    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )
    ensure_same_organization(current_user, subtask.organization_id, "subtask")

    parent_task = session.exec(select(Task).where(Task.id == subtask.parent_task_id)).first()
    if not parent_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent task not found"
        )
    ensure_same_organization(current_user, parent_task.organization_id, "parent task")
    
    # Check permission
    if not is_admin_user(current_user):
        # Only parent task assignee can update
        if parent_task.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update subtasks on your tasks"
            )
    
    # Track original assignee for notification logic
    original_assignee_id = subtask.assigned_to

    update_data = subtask_data.model_dump(exclude_unset=True)

    # Subtasks must remain assigned to an employee.
    if "assigned_to" in update_data and update_data["assigned_to"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee is required for subtasks"
        )

    if "assigned_to" in update_data:
        assignee_stmt = select(User).where(User.id == update_data["assigned_to"])
        assignee = session.exec(assignee_stmt).first()
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user not found"
            )
        ensure_same_organization(current_user, assignee.organization_id, "assignee")

    if "assigned_by" in update_data and update_data["assigned_by"] is not None:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can change the reporter"
            )
        reporter_stmt = select(User).where(User.id == update_data["assigned_by"])
        reporter = session.exec(reporter_stmt).first()
        if not reporter:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reporter not found"
            )
        ensure_same_organization(current_user, reporter.organization_id, "reporter")

    assignment_alert_message = None
    requested_assignee_id = update_data.get("assigned_to", subtask.assigned_to)
    if parent_task.assigned_to and requested_assignee_id != parent_task.assigned_to:
        update_data["assigned_to"] = parent_task.assigned_to
        assignment_alert_message = (
            f"Assignment corrected automatically for subtask '{subtask.title}'. "
            f"Because it belongs to task #{parent_task.id}, it was assigned to that task's assignee."
        )

    # Update fields
    for key, value in update_data.items():
        setattr(subtask, key, value)
    
    subtask.updated_at = datetime.now(timezone.utc)
    session.add(subtask)
    session.commit()
    session.refresh(subtask)

    # If assignee changed, send notification to the new assignee
    if subtask.assigned_to and subtask.assigned_to != original_assignee_id:
        create_notification(
            session=session,
            user_id=subtask.assigned_to,
            type=NotificationType.SUBTASK_ASSIGNED,
            message=f"New subtask assigned: '{subtask.title}' (Reassigned by {current_user.name})",
            task_id=subtask.parent_task_id
        )

    if assignment_alert_message:
        create_notification(
            session=session,
            user_id=current_user.id,
            type=NotificationType.TASK_COMMENT,
            message=assignment_alert_message,
            task_id=parent_task.id,
        )
    
    # Reload and refresh to ensure all fields are correctly populated for response
    session.refresh(subtask)
    return subtask


@router.delete("/subtasks/{subtask_id}")
async def delete_subtask(
    subtask_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a subtask.
    
    Rules:
    - Admin can delete any subtask
    - Parent task assignee can delete subtask
    - Cannot delete completed subtasks
    """
    subtask_stmt = select(Subtask).where(Subtask.id == subtask_id)
    subtask = session.exec(subtask_stmt).first()
    
    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )
    ensure_same_organization(current_user, subtask.organization_id, "subtask")
    
    # Prevent deleting completed subtasks
    if subtask.status == SubtaskStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete completed subtask"
        )
    
    # Check permission
    if not is_admin_user(current_user):
        # Get parent task
        task_stmt = select(Task).where(Task.id == subtask.parent_task_id)
        task = session.exec(task_stmt).first()
        
        if not task or task.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete subtasks on your tasks"
            )
    
    # Delete nested child subtasks first (if any) to avoid foreign key constraint violations
    child_subtasks_stmt = select(Subtask).where(
        Subtask.parent_subtask_id == subtask_id,
        Subtask.organization_id == current_user.organization_id,
    )
    child_subtasks = session.exec(child_subtasks_stmt).all()
    for child in child_subtasks:
        session.delete(child)
    
    # Now delete the subtask itself
    session.delete(subtask)
    session.commit()
    
    return {"message": "Subtask deleted successfully"}

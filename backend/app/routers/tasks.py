"""
Task management routes with flat structure and deliverable tracking.
"""
import random
import string
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select


def generate_public_id(session: Session, model_class, prefix: str = "", length: int = 6) -> str:
    """Generate a unique alphanumeric public ID like A7X9K2."""
    chars = string.ascii_uppercase + string.digits
    while True:
        suffix = ''.join(random.choices(chars, k=length))
        candidate = f"{prefix}{suffix}" if prefix else suffix
        existing = session.exec(select(model_class).where(model_class.public_id == candidate)).first()
        if not existing:
            return candidate

from app.database import get_session
from app.models import (
    User, Task, TaskCreate, TaskUpdate, TaskRead, TaskWithAssignee,
    TaskStatus, UserRole, NotificationType, Subtask, TaskComment, Notification, SubtaskStatus,
    SubtaskWithAssignee, TaskCommentWithUser
)
from app.auth import get_current_user, get_current_admin_user
from app.routers.notifications import create_notification

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# Helper function to calculate task progress
def calculate_task_progress(task: Task, session: Session) -> int:
    """
    Calculate task completion progress (0-100).
    If task has subtasks: (completed subtasks / total subtasks) * 100
    If no subtasks: 100 if approved, 0 otherwise
    """
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
    statement = select(Task).where(Task.assigned_to == current_user.id)
    
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
        
        assigner = None
        if task.assigned_by:
            assigner_stmt = select(User).where(User.id == task.assigned_by)
            assigner = session.exec(assigner_stmt).first()
        
        result.append(TaskWithAssignee(
            id=task.id,
            public_id=task.public_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            due_date=task.due_date,
            assigned_to=task.assigned_to,
            assigned_by=task.assigned_by,
            status=task.status,
            done_by_employee=task.done_by_employee,
            github_link=task.github_link,
            deployed_link=task.deployed_link,
            start_date=task.start_date,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_name=assignee.name if assignee else None,
            assignee_email=assignee.email if assignee else None,
            assigned_by_name=assigner.name if assigner else None,
            progress=calculate_task_progress(task, session)
        ))
    
    return result


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
            admin_stmt = select(User).where(User.role == UserRole.admin)
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
@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Create a new task with deliverable tracking (admin only)."""
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
    
    task = Task(
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        due_date=task_data.due_date,
        assigned_to=task_data.assigned_to,
        assigned_by=admin.id,
        github_link=task_data.github_link,
        deployed_link=task_data.deployed_link,
        public_id=generate_public_id(session, Task)
    )
    
    session.add(task)
    session.commit()
    session.refresh(task)
    
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


@router.get("/", response_model=List[TaskWithAssignee])
async def get_all_tasks(
    request: Request,
    status_filter: Optional[TaskStatus] = None,
    assigned_to: Optional[int] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get all tasks (admin only)."""
    statement = select(Task)
    
    if status_filter:
        statement = statement.where(Task.status == status_filter)
    if assigned_to:
        statement = statement.where(Task.assigned_to == assigned_to)
    
    statement = statement.order_by(Task.created_at.desc())
    tasks = session.exec(statement).all()
    
    result = []
    for task in tasks:
        assignee = None
        if task.assigned_to:
            assignee_stmt = select(User).where(User.id == task.assigned_to)
            assignee = session.exec(assignee_stmt).first()
        
        assigner = None
        if task.assigned_by:
            assigner_stmt = select(User).where(User.id == task.assigned_by)
            assigner = session.exec(assigner_stmt).first()
        
        result.append(TaskWithAssignee(
            id=task.id,
            public_id=task.public_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            due_date=task.due_date,
            assigned_to=task.assigned_to,
            assigned_by=task.assigned_by,
            status=task.status,
            done_by_employee=task.done_by_employee,
            github_link=task.github_link,
            deployed_link=task.deployed_link,
            start_date=task.start_date,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_name=assignee.name if assignee else None,
            assignee_email=assignee.email if assignee else None,
            assigned_by_name=assigner.name if assigner else None,
            progress=calculate_task_progress(task, session)
        ))
    
    return result


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
    
    return TaskWithAssignee(
        id=task.id,
        public_id=task.public_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        assigned_to=task.assigned_to,
        assigned_by=task.assigned_by,
        status=task.status,
        done_by_employee=task.done_by_employee,
        github_link=task.github_link,
        deployed_link=task.deployed_link,
        start_date=task.start_date,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee.name if assignee else None,
        assignee_email=assignee.email if assignee else None,
        assigned_by_name=None,  # Can be added if needed
        progress=calculate_task_progress(task, session)
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
    
    # Check permission
    if task.assigned_to != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this project"
        )
    
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
    
    # Build task data
    task_data = {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "due_date": task.due_date,
        "start_date": task.start_date,
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
        "progress": calculate_task_progress(task, session)
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
    
    # Update fields
    update_data = task_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)
    
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
    
    # Delete related records first to avoid foreign key constraint violations
    
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
    
    all_tasks = session.exec(select(Task)).all()
    total = len(all_tasks)
    
    # Status counts
    todo = len(session.exec(select(Task).where(Task.status == TaskStatus.todo)).all())
    in_progress = len(session.exec(select(Task).where(Task.status == TaskStatus.in_progress)).all())
    submitted = len(session.exec(select(Task).where(Task.status == TaskStatus.submitted)).all())
    reviewing = len(session.exec(select(Task).where(Task.status == TaskStatus.reviewing)).all())
    approved = len(session.exec(select(Task).where(Task.status == TaskStatus.approved)).all())
    rejected = len(session.exec(select(Task).where(Task.status == TaskStatus.rejected)).all())
    
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
    
    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "overdue": overdue,
        "completion_percent": completion_percent,
        # Legacy fields for backward compatibility
        "todo": todo,
        "submitted": submitted,
        "reviewing": reviewing,
        "approved": approved,
        "rejected": rejected
    }

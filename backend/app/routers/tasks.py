"""
Task management routes.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, Task, TaskCreate, TaskUpdate, TaskRead, TaskWithAssignee,
    TaskStatus, UserRole
)
from app.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


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
        
        # Get parent task code if exists
        parent_task_code = None
        if task.parent_id:
            parent_stmt = select(Task).where(Task.id == task.parent_id)
            parent = session.exec(parent_stmt).first()
            if parent:
                parent_task_code = parent.task_code
        
        result.append(TaskWithAssignee(
            id=task.id,
            task_code=task.task_code,
            parent_id=task.parent_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            due_date=task.due_date,
            assigned_to=task.assigned_to,
            created_by=task.created_by,
            status=task.status,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_name=assignee.name if assignee else None,
            assignee_email=assignee.email if assignee else None,
            parent_task_code=parent_task_code
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
    """Update task status (for assigned employee or admin)."""
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
    
    task.status = new_status
    task.updated_at = datetime.utcnow()
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
    """Create a new task with hierarchical ID (admin only)."""
    # Verify assignee exists if provided
    if task_data.assigned_to:
        assignee_stmt = select(User).where(User.id == task_data.assigned_to)
        assignee = session.exec(assignee_stmt).first()
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user not found"
            )
    
    # Verify parent task exists if provided
    parent_task = None
    if task_data.parent_id:
        parent_stmt = select(Task).where(Task.id == task_data.parent_id)
        parent_task = session.exec(parent_stmt).first()
        if not parent_task:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent task not found"
            )
    
    # Generate hierarchical task_code
    if parent_task:
        # Subtask: parent_code + "." + next_number
        # Find all siblings (tasks with same parent)
        siblings_stmt = select(Task).where(Task.parent_id == task_data.parent_id)
        siblings = session.exec(siblings_stmt).all()
        
        # Get max subtask number
        max_num = 0
        for sibling in siblings:
            if sibling.task_code:
                parts = sibling.task_code.split(".")
                if len(parts) > 0:
                    try:
                        last_num = int(parts[-1])
                        max_num = max(max_num, last_num)
                    except ValueError:
                        pass
        
        task_code = f"{parent_task.task_code}.{max_num + 1}"
    else:
        # Main task: just a number (1, 2, 3, etc.)
        # Find all main tasks (parent_id is None)
        main_tasks_stmt = select(Task).where(Task.parent_id == None)
        main_tasks = session.exec(main_tasks_stmt).all()
        
        # Get max main task number
        max_num = 0
        for main_task in main_tasks:
            if main_task.task_code:
                try:
                    num = int(main_task.task_code.split(".")[0])
                    max_num = max(max_num, num)
                except ValueError:
                    pass
        
        task_code = str(max_num + 1)
    
    task = Task(
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        due_date=task_data.due_date,
        assigned_to=task_data.assigned_to,
        created_by=admin.id,
        parent_id=task_data.parent_id,
        task_code=task_code
    )
    
    session.add(task)
    session.commit()
    session.refresh(task)
    
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
        
        # Get parent task code if exists
        parent_task_code = None
        if task.parent_id:
            parent_stmt = select(Task).where(Task.id == task.parent_id)
            parent = session.exec(parent_stmt).first()
            if parent:
                parent_task_code = parent.task_code
        
        result.append(TaskWithAssignee(
            id=task.id,
            task_code=task.task_code,
            parent_id=task.parent_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            due_date=task.due_date,
            assigned_to=task.assigned_to,
            created_by=task.created_by,
            status=task.status,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_name=assignee.name if assignee else None,
            assignee_email=assignee.email if assignee else None,
            parent_task_code=parent_task_code
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
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        status=task.status,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee.name if assignee else None,
        assignee_email=assignee.email if assignee else None
    )


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
    
    task.updated_at = datetime.utcnow()
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
    
    session.delete(task)
    session.commit()
    
    return {"message": "Task deleted successfully"}


@router.get("/stats/summary")
async def get_task_stats(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get task statistics (admin only)."""
    total = len(session.exec(select(Task)).all())
    todo = len(session.exec(select(Task).where(Task.status == TaskStatus.todo)).all())
    in_progress = len(session.exec(select(Task).where(Task.status == TaskStatus.in_progress)).all())
    done = len(session.exec(select(Task).where(Task.status == TaskStatus.done)).all())
    
    return {
        "total": total,
        "todo": todo,
        "in_progress": in_progress,
        "done": done
    }
